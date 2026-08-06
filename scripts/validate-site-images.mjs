import fs from "node:fs";
import path from "node:path";

const SITE_DIR = path.resolve("_site");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".ico"]);
const URL_ATTRIBUTES = ["src", "poster"];

function walkFiles(dirPath) {
	const files = [];

	for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkFiles(fullPath));
			continue;
		}

		if (entry.isFile()) {
			files.push(fullPath);
		}
	}

	return files;
}

function decodeHtmlEntities(value = "") {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"');
}

function normalizeRef(rawRef = "") {
	return decodeHtmlEntities(String(rawRef).trim().replace(/^['"]|['"]$/g, ""));
}

function isExternalRef(ref = "") {
	return /^(?:[a-z]+:)?\/\//i.test(ref) || ref.startsWith("data:") || ref.startsWith("mailto:") || ref.startsWith("tel:");
}

function hasImageExtension(ref = "") {
	const cleanRef = ref.split("#")[0].split("?")[0];
	return IMAGE_EXTENSIONS.has(path.extname(cleanRef).toLowerCase());
}

function resolveLocalRef(ref, sourceFile) {
	const cleanRef = ref.split("#")[0].split("?")[0];
	const normalizedRef = cleanRef.replace(/\\/g, "/");

	if (normalizedRef.startsWith("/")) {
		return path.join(SITE_DIR, decodeURIComponent(normalizedRef.slice(1)));
	}

	return path.resolve(path.dirname(sourceFile), decodeURIComponent(normalizedRef));
}

function collectAttributeRefs(content, attrName) {
	const refs = [];
	const regex = new RegExp(`${attrName}\\s*=\\s*(["'])(.*?)\\1`, "gi");
	for (const match of content.matchAll(regex)) {
		refs.push(match[2]);
	}
	return refs;
}

function collectSrcsetRefs(content) {
	const refs = [];
	const regex = /srcset\s*=\s*(["'])(.*?)\1/gi;
	for (const match of content.matchAll(regex)) {
		const candidates = match[2].split(",");
		for (const candidate of candidates) {
			const [candidateUrl] = candidate.trim().split(/\s+/);
			if (candidateUrl) {
				refs.push(candidateUrl);
			}
		}
	}
	return refs;
}

function collectCssUrlRefs(content) {
	const refs = [];
	const regex = /url\((.*?)\)/gi;
	for (const match of content.matchAll(regex)) {
		refs.push(match[1]);
	}
	return refs;
}

function collectImageRefs(filePath, content) {
	const refs = [];
	for (const attrName of URL_ATTRIBUTES) {
		for (const ref of collectAttributeRefs(content, attrName)) {
			refs.push({ ref, kind: attrName, filePath });
		}
	}

	for (const ref of collectSrcsetRefs(content)) {
		refs.push({ ref, kind: "srcset", filePath });
	}

	for (const ref of collectCssUrlRefs(content)) {
		refs.push({ ref, kind: "css-url", filePath });
	}

	return refs;
}

function validateImageRef(entry) {
	const ref = normalizeRef(entry.ref);
	if (!ref || isExternalRef(ref) || !hasImageExtension(ref)) {
		return null;
	}

	if (ref.includes("\\")) {
		return {
			...entry,
			ref,
			error: "contains backslashes",
		};
	}

	const resolvedPath = resolveLocalRef(ref, entry.filePath);
	if (!fs.existsSync(resolvedPath)) {
		return {
			...entry,
			ref,
			resolvedPath,
			error: "missing target file",
		};
	}

	return null;
}

if (!fs.existsSync(SITE_DIR)) {
	console.error(`Missing build output directory: ${SITE_DIR}`);
	process.exit(1);
}

const siteFiles = walkFiles(SITE_DIR).filter(filePath => /\.(html|css)$/i.test(filePath));
const imageRefs = [];

for (const filePath of siteFiles) {
	const content = fs.readFileSync(filePath, "utf8");
	imageRefs.push(...collectImageRefs(filePath, content));
}

const localImageRefs = imageRefs
	.map(validateImageRef)
	.filter(Boolean);

if (localImageRefs.length > 0) {
	console.error(`Found ${localImageRefs.length} invalid local image reference(s):`);
	for (const issue of localImageRefs) {
		const relativeSource = path.relative(process.cwd(), issue.filePath).replace(/\\/g, "/");
		const relativeTarget = issue.resolvedPath
			? path.relative(process.cwd(), issue.resolvedPath).replace(/\\/g, "/")
			: "n/a";
		console.error(`- ${relativeSource} [${issue.kind}] -> ${issue.ref} (${issue.error}; resolved: ${relativeTarget})`);
	}
	process.exit(1);
}

console.log(`Validated ${imageRefs.length} image reference(s) across ${siteFiles.length} built HTML/CSS file(s).`);