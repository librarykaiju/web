import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
const DEFAULT_MAX_EMBED_DEPTH = 4;
const DEFAULT_REPORT_PATH = "_site/obsidian-links-report.md";

function isUnderscoreContent(inputPath = "") {
	return /[\\/]_[^\\/]+/.test(inputPath);
}

function shouldSuppressWarnings(context = {}, options = {}) {
	if (context?.draft && options.suppressDraftWarnings !== false) {
		return true;
	}

	const inputPath = context?.page?.inputPath || "";
	if (options.suppressUnderscoreWarnings !== false && isUnderscoreContent(inputPath)) {
		return true;
	}

	return false;
}

function asArray(value) {
	if (Array.isArray(value)) {
		return value.filter(Boolean);
	}

	if (value === undefined || value === null || value === false) {
		return [];
	}

	return [value];
}

function normalizePath(value = "") {
	return value.replace(/\\/g, "/");
}

function normalizeKey(value = "") {
	return normalizePath(String(value)).toLowerCase().trim();
}

function toHeadingAnchor(value = "") {
	return String(value)
		.toLowerCase()
		.trim()
		.replace(/[`~!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]/g, "")
		.replace(/\s+/g, "-");
}

function walkFiles(dirPath) {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	const files = [];
	for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory() || entry.isSymbolicLink()) {
			let stats;
			try {
				stats = fs.statSync(fullPath);
			} catch {
				continue;
			}

			if (stats.isDirectory()) {
				files.push(...walkFiles(fullPath));
				continue;
			}

			if (stats.isFile()) {
				files.push(fullPath);
				continue;
			}
		}

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

function buildAttachmentIndex(attachmentDirs = []) {
	const assetByRelPath = new Map();
	const assetByBaseName = new Map();
	const preferredByBaseName = new Map();

	for (const [priority, dirPath] of attachmentDirs.entries()) {
		if (!dirPath || !fs.existsSync(dirPath)) {
			continue;
		}

		for (const fullPath of walkFiles(dirPath)) {
			const relPath = normalizePath(path.relative(dirPath, fullPath));
			const baseName = path.basename(relPath);
			const baseKey = normalizeKey(baseName);
			const entry = {
				relPath,
				fullPath,
				publicPath: normalizePath(path.join("attachments", path.basename(dirPath).toLowerCase(), relPath)),
				priority,
			};

			assetByRelPath.set(normalizeKey(relPath), entry);

			const currentPreferred = preferredByBaseName.get(baseKey);
			if (!currentPreferred || priority < currentPreferred.priority) {
				preferredByBaseName.set(baseKey, entry);
				assetByBaseName.set(baseKey, [entry]);
				continue;
			}

			if (priority === currentPreferred.priority) {
				if (!assetByBaseName.has(baseKey)) {
					assetByBaseName.set(baseKey, []);
				}
				assetByBaseName.get(baseKey).push(entry);
			}
		}
	}

	return {
		assetByRelPath,
		assetByBaseName,
	};
}

function buildContentIndex(contentDir) {
	const markdownByRelStem = new Map();
	const markdownByBaseName = new Map();
	const assetByRelPath = new Map();
	const assetByBaseName = new Map();

	for (const fullPath of walkFiles(contentDir)) {
		const relPath = normalizePath(path.relative(contentDir, fullPath));
		const ext = path.extname(relPath).toLowerCase();
		const baseName = path.basename(relPath, ext);

		if (ext === ".md") {
			const stem = relPath.slice(0, -ext.length);
			const stemUrlPath = stem.endsWith("/index") ? stem.slice(0, -"/index".length) : stem;
			const entry = {
				url: `/${stemUrlPath}/`,
				relPath,
				fullPath,
			};

			markdownByRelStem.set(normalizeKey(stem), entry);
			const baseKey = normalizeKey(baseName);
			if (!markdownByBaseName.has(baseKey)) {
				markdownByBaseName.set(baseKey, []);
			}
			markdownByBaseName.get(baseKey).push(entry);
			continue;
		}

		const assetEntry = {
			relPath,
			fullPath,
		};

		assetByRelPath.set(normalizeKey(relPath), assetEntry);
		const baseAssetKey = normalizeKey(path.basename(relPath));
		if (!assetByBaseName.has(baseAssetKey)) {
			assetByBaseName.set(baseAssetKey, []);
		}
		assetByBaseName.get(baseAssetKey).push(assetEntry);
	}

	return {
		markdownByRelStem,
		markdownByBaseName,
		assetByRelPath,
		assetByBaseName,
	};
}

function mergeAssetIndexes(...indexes) {
	const assetByRelPath = new Map();
	const assetByBaseName = new Map();

	for (const index of indexes) {
		for (const [key, value] of index.assetByRelPath.entries()) {
			if (!assetByRelPath.has(key)) {
				assetByRelPath.set(key, value);
			}
		}

		for (const [key, values] of index.assetByBaseName.entries()) {
			if (!assetByBaseName.has(key)) {
				assetByBaseName.set(key, []);
			}

			for (const value of values) {
				assetByBaseName.get(key).push(value);
			}
		}
	}

	return {
		assetByRelPath,
		assetByBaseName,
	};
}

function splitLinkParts(rawTarget = "") {
	const [targetWithHeading, alias] = rawTarget.split("|");
	const [targetWithBlock, heading] = (targetWithHeading || "").split("#");
	const [target] = targetWithBlock.split("^");

	return {
		target: target.trim(),
		heading: (heading || "").trim(),
		alias: (alias || "").trim(),
	};
}

function stripFrontMatter(markdown = "") {
	return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function createWarningReporter(enabled) {
	const seen = new Set();
	const records = [];

	return {
		warn(code, message, context = {}) {
			if (!enabled) {
				return;
			}

			const key = `${code}|${context.inputPath || ""}|${context.target || ""}`;
			if (seen.has(key)) {
				return;
			}
			seen.add(key);

			records.push({
				code,
				message,
				inputPath: context.inputPath || "",
				target: context.target || "",
				candidates: Array.isArray(context.candidates) ? context.candidates : [],
			});

			const location = context.inputPath ? ` in ${context.inputPath}` : "";
			const detail = context.target ? ` (${context.target})` : "";
			console.warn(`[obsidian-links] ${message}${location}${detail}`);

			if (Array.isArray(context.candidates) && context.candidates.length > 0) {
				console.warn(`[obsidian-links] Candidates: ${context.candidates.join(", ")}`);
			}
		},

		getRecords() {
			return [...records];
		},

		reset() {
			records.length = 0;
			seen.clear();
		},
	};
}

function createReportMarkdown(records) {
	const now = new Date().toISOString();
	const lines = [
		"# Obsidian Links Report",
		"",
		`Generated: ${now}`,
		"",
		`Total issues: ${records.length}`,
		"",
	];

	if (records.length === 0) {
		lines.push("No unresolved or ambiguous Obsidian links were detected.", "");
		return `${lines.join("\n")}`;
	}

	const grouped = records.reduce((acc, record) => {
		if (!acc.has(record.code)) {
			acc.set(record.code, []);
		}
		acc.get(record.code).push(record);
		return acc;
	}, new Map());

	for (const [code, entries] of grouped) {
		lines.push(`## ${code}`, "");
		for (const entry of entries) {
			lines.push(`- ${entry.message}`);
			if (entry.inputPath) {
				lines.push(`  - Source: ${entry.inputPath}`);
			}
			if (entry.target) {
				lines.push(`  - Target: ${entry.target}`);
			}
			if (entry.candidates.length > 0) {
				lines.push(`  - Candidates: ${entry.candidates.join(", ")}`);
			}
		}
		lines.push("");
	}

	return `${lines.join("\n")}`;
}

function resolveMarkdownTarget(target, currentInputPath, contentDir, index, options, warn) {
	if (!target) {
		return null;
	}

	const currentRelPath = normalizePath(path.relative(contentDir, currentInputPath || ""));
	const currentRelDir = normalizePath(path.dirname(currentRelPath));

	const relTarget = target.endsWith(".md") ? target.slice(0, -3) : target;
	const isRelativeTarget = relTarget.includes("/") || relTarget.startsWith(".");

	if (isRelativeTarget && currentRelDir) {
		const relCandidate = normalizePath(path.normalize(path.join(currentRelDir, relTarget)));
		const relCandidateKey = normalizeKey(relCandidate);
		if (index.markdownByRelStem.has(relCandidateKey)) {
			return index.markdownByRelStem.get(relCandidateKey);
		}
	}

	const directRelKey = normalizeKey(relTarget);
	if (index.markdownByRelStem.has(directRelKey)) {
		return index.markdownByRelStem.get(directRelKey);
	}

	const baseKey = normalizeKey(path.basename(relTarget));
	const candidates = index.markdownByBaseName.get(baseKey) || [];

	if (candidates.length === 1) {
		return candidates[0];
	}

	if (candidates.length > 1) {
		warn(
			"ambiguous-markdown-link",
			"Ambiguous wiki link; multiple markdown files share this basename",
			{
				inputPath: currentInputPath,
				target,
				candidates: candidates.map(candidate => candidate.relPath),
			}
		);

		if (!options.preferFirstOnAmbiguous) {
			return null;
		}
		return candidates[0];
	}

	warn("unresolved-markdown-link", "Could not resolve wiki link", {
		inputPath: currentInputPath,
		target,
	});

	return null;
}

function resolveAssetTarget(target, currentInputPath, contentDir, index, options, warn) {
	if (!target) {
		return null;
	}

	const currentRelPath = normalizePath(path.relative(contentDir, currentInputPath || ""));
	const currentRelDir = normalizePath(path.dirname(currentRelPath));
	const normalizedTarget = normalizePath(target);

	if ((normalizedTarget.includes("/") || normalizedTarget.startsWith(".")) && currentRelDir) {
		const relCandidate = normalizePath(path.normalize(path.join(currentRelDir, normalizedTarget)));
		const relCandidateKey = normalizeKey(relCandidate);
		if (index.assetByRelPath.has(relCandidateKey)) {
			return index.assetByRelPath.get(relCandidateKey);
		}
	}

	const directKey = normalizeKey(normalizedTarget.replace(/^\//, ""));
	if (index.assetByRelPath.has(directKey)) {
		return index.assetByRelPath.get(directKey);
	}

	const baseKey = normalizeKey(path.basename(normalizedTarget));
	const candidates = index.assetByBaseName.get(baseKey) || [];

	if (candidates.length === 1) {
		return candidates[0];
	}

	if (candidates.length > 1) {
		warn(
			"ambiguous-asset-link",
			"Ambiguous asset embed; multiple files share this basename",
			{
				inputPath: currentInputPath,
				target,
				candidates: candidates.map(candidate => candidate.relPath),
			}
		);

		if (!options.preferFirstOnAmbiguous) {
			return null;
		}
		return candidates[0];
	}

	warn("unresolved-asset-link", "Could not resolve embedded asset", {
		inputPath: currentInputPath,
		target,
	});

	return null;
}

function isImageTarget(target = "") {
	const ext = path.extname(target).toLowerCase();
	return IMAGE_EXTENSIONS.has(ext);
}

function convertObsidianLinks(content, context, env, state) {
	if (!content || !content.includes("[[")) {
		return content;
	}

	const index = env.getIndex();
	const inputPath = context?.page?.inputPath || "";
	const options = env.options;
	const warn = shouldSuppressWarnings(context, options) ? () => {} : env.warn;

	if ((state.depth || 0) > options.maxEmbedDepth) {
		warn("embed-depth-limit", "Maximum Obsidian embed depth reached", {
			inputPath,
			target: state.originTarget || "",
		});
		return content;
	}

	const withEmbeds = content.replace(/!\[\[([^\]]+)\]\]/g, (fullMatch, rawInner) => {
		const { target, alias } = splitLinkParts(rawInner);
		if (!target) {
			return fullMatch;
		}

		if (isImageTarget(target)) {
			const assetEntry = resolveAssetTarget(target, inputPath, env.contentDir, index, options, warn);
			if (!assetEntry) {
				return fullMatch;
			}

			const altText = alias || path.basename(target, path.extname(target));
			return `<img src="${encodeURI(`/${assetEntry.publicPath || assetEntry.relPath}`)}" alt="${altText}" eleventy:ignore>`;
		}

		const markdownEntry = resolveMarkdownTarget(target, inputPath, env.contentDir, index, options, warn);
		if (!markdownEntry) {
			return fullMatch;
		}

		if (options.embedNotesAsContent) {
			const embeddedSource = fs.readFileSync(markdownEntry.fullPath, "utf8");
			const stripped = stripFrontMatter(embeddedSource).trim();
			const converted = convertObsidianLinks(stripped, {
				page: {
					inputPath: markdownEntry.fullPath,
				},
			}, env, {
				depth: (state.depth || 0) + 1,
				originTarget: target,
			});

			return `\n\n${converted}\n\n`;
		}

		const label = alias || path.basename(target, ".md");
		return `[${label}](${markdownEntry.url})`;
	});

	return withEmbeds.replace(/(?<!!)\[\[([^\]]+)\]\]/g, (fullMatch, rawInner) => {
		const { target, heading, alias } = splitLinkParts(rawInner);
		if (!target) {
			return fullMatch;
		}

		const markdownEntry = resolveMarkdownTarget(target, inputPath, env.contentDir, index, options, warn);
		if (!markdownEntry) {
			return fullMatch;
		}

		const headingAnchor = heading ? `#${toHeadingAnchor(heading)}` : "";
		const label = alias || path.basename(target, ".md");
		return `[${label}](${markdownEntry.url}${headingAnchor})`;
	});
}

export default function pluginObsidianLinks(eleventyConfig, options = {}) {
	const contentDir = path.resolve(process.cwd(), options.contentDir || "content");
	const reportPath = path.resolve(process.cwd(), options.reportPath || DEFAULT_REPORT_PATH);
	const attachmentDirs = asArray(options.attachmentDirs).map(dirPath => path.resolve(process.cwd(), dirPath));
	const pluginOptions = {
		warnOnUnresolved: options.warnOnUnresolved !== false,
		preferFirstOnAmbiguous: options.preferFirstOnAmbiguous === true,
		embedNotesAsContent: options.embedNotesAsContent !== false,
		maxEmbedDepth: Number.isInteger(options.maxEmbedDepth) ? options.maxEmbedDepth : DEFAULT_MAX_EMBED_DEPTH,
		suppressDraftWarnings: options.suppressDraftWarnings !== false,
		suppressUnderscoreWarnings: options.suppressUnderscoreWarnings !== false,
	};

	let cachedIndex = null;
	const warningReporter = createWarningReporter(pluginOptions.warnOnUnresolved);

	const env = {
		contentDir,
		options: pluginOptions,
		warn: warningReporter.warn,
		getIndex: () => {
			if (!cachedIndex) {
				const contentIndex = buildContentIndex(contentDir);
				const attachmentIndex = buildAttachmentIndex(attachmentDirs);
				cachedIndex = {
					...contentIndex,
					...mergeAssetIndexes({
						assetByRelPath: contentIndex.assetByRelPath,
						assetByBaseName: contentIndex.assetByBaseName,
					}, attachmentIndex),
				};
			}
			return cachedIndex;
		},
	};

	eleventyConfig.addPreprocessor("obsidian-links", "md", (data, content) => {
		return convertObsidianLinks(content, data, env, { depth: 0 });
	});

	eleventyConfig.on("beforeBuild", () => {
		warningReporter.reset();
		cachedIndex = null;
	});

	eleventyConfig.on("beforeWatch", () => {
		warningReporter.reset();
		cachedIndex = null;
	});

	eleventyConfig.on("eleventy.after", () => {
		const records = warningReporter.getRecords();
		const report = createReportMarkdown(records);
		fs.mkdirSync(path.dirname(reportPath), { recursive: true });
		fs.writeFileSync(reportPath, report, "utf8");
	});
}
