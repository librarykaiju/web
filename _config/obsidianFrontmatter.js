import fs from "node:fs";
import path from "node:path";

// Obsidian compatibility map:
// Add aliases here when vault front matter evolves so templates can keep reading
// one stable key per concept instead of absorbing per-source variations.
export const OBSIDIAN_FIELD_ALIASES = new Map([
	["genres", "genre"],
	["subjects", "subject"],
	["plot", "summary"],
	["read in", "completed"],
	["lastread", "lastRead"],
	["lastwatched", "lastWatched"],
	["personalrating", "rating"],
	["cover", "coverImage"],
	["image", "coverImage"],
	["actors", "performers"],
	["writer", "writers"],
	["writers", "writers"],
	["publishers", "publisher"],
	["developers", "developer"],
	["subtype", "medium"],
	["type", "mediaType"],
	["premiere", "releasedOn"],
	["releasedate", "releasedOn"],
	["streamingservices", "streamingServices"],
	["onlinerating", "onlineRating"],
	["datasource", "dataSource"],
	["englishtitle", "alternateTitle"],
	["subtitle:", "subtitle"],
	["format:", "format"],
	["shelf:", "shelf"],
	["subjects:", "subject"],
	["appeal factors", "vibes"],
	["appeal factors:", "vibes"],
]);

export function toValueList(value) {
	if (Array.isArray(value)) {
		return value
			.map(item => String(item ?? "").trim())
			.filter(Boolean);
	}

	if (typeof value === "string") {
		return value
			.split(",")
			.map(item => item.trim())
			.filter(Boolean);
	}

	if (value === undefined || value === null || value === false) {
		return [];
	}

	const normalized = String(value).trim();
	return normalized ? [normalized] : [];
}

export function firstValue(value) {
	return toValueList(value)[0] || "";
}

export function isEmptyValue(value) {
	if (value === undefined || value === null || value === false) {
		return true;
	}

	if (typeof value === "string") {
		return value.trim() === "" || value.trim().toLowerCase() === "n/a";
	}

	if (Array.isArray(value)) {
		return value.length === 0 || value.every(item => isEmptyValue(item));
	}

	return false;
}

export function normalizeObsidianKey(key = "") {
	return String(key).trim().replace(/:$/, "").toLowerCase();
}

function toPosixPath(value = "") {
	return String(value).replace(/\\/g, "/");
}

function normalizeImgSubpath(value = "") {
	const segments = toPosixPath(value).split("/").filter(Boolean);
	if (segments.length === 0) {
		return "";
	}

	segments[0] = segments[0].toLowerCase();
	return segments.join("/");
}

function toPublicContentUrl(absPath) {
	const contentRoot = path.resolve(process.cwd(), "content");
	const normalizedAbsPath = path.resolve(absPath);
	if (!normalizedAbsPath.startsWith(contentRoot)) {
		return "";
	}

	const relPath = toPosixPath(path.relative(contentRoot, normalizedAbsPath));
	return `/${relPath}`;
}

function resolveBareImageSource(source, page = {}) {
	const candidates = [];
	const inputPath = page.inputPath ? path.resolve(process.cwd(), page.inputPath) : "";

	if (inputPath) {
		const pageDir = path.dirname(inputPath);
		candidates.push(path.join(pageDir, source));
		candidates.push(path.join(pageDir, "images", source));
	}

	const sharedContentDirs = [
		path.resolve(process.cwd(), "content", "img", "posts", source),
		path.resolve(process.cwd(), "content", "img", "sketches", source),
		path.resolve(process.cwd(), "content", "img", "jackets", source),
		path.resolve(process.cwd(), "content", "img", "banners", source),
	];

	for (const candidate of sharedContentDirs) {
		candidates.push(candidate);
	}

	for (const candidate of candidates) {
		if (!fs.existsSync(candidate)) {
			continue;
		}

		const publicUrl = toPublicContentUrl(candidate);
		if (publicUrl) {
			return publicUrl;
		}
	}

	return "";
}

export function normalizeCoverImageSource(value, page = {}) {
	const source = firstValue(value);
	if (!source) {
		return "";
	}

	if (/^(https?:)?\/\//i.test(source) || source.startsWith("/")) {
		return source;
	}

	if (source.startsWith("./") || source.startsWith("../")) {
		return source;
	}

	const normalized = source.replace(/\\/g, "/").trim();
	const lower = normalized.toLowerCase();

	if (lower.startsWith("content/img/")) {
		return `/img/${normalizeImgSubpath(normalized.slice("content/img/".length))}`;
	}

	if (lower.startsWith("00 content/img/")) {
		return `/img/${normalizeImgSubpath(normalized.slice("00 Content/img/".length))}`;
	}

	if (lower.startsWith("content/")) {
		return `/${normalized.slice("content/".length)}`;
	}

	const mediaJacketMatch = normalized.match(/(?:^|\/)(?:00\s+)?content\/media\/jackets\/(.+)$/i);
	if (mediaJacketMatch) {
		return `/img/jackets/${mediaJacketMatch[1]}`;
	}

	const mediaMatch = normalized.match(/(?:^|\/)(?:00\s+)?content\/media\/(.+)$/i);
	if (mediaMatch) {
		return `/attachments/media/${mediaMatch[1]}`;
	}

	const inputPath = page.inputPath || "";
	if (inputPath) {
		if (!normalized.includes("/")) {
			const resolvedBareImage = resolveBareImageSource(normalized, page);
			if (resolvedBareImage) {
				return resolvedBareImage;
			}
		}
	}

	return "";
}

export function normalizeRatingValue(value) {
	if (Array.isArray(value)) {
		const stars = value.filter(item => typeof item === "string" && item.includes("⭐"));
		if (stars.length > 0) {
			return stars[stars.length - 1];
		}
		return firstValue(value);
	}

	if (typeof value === "number") {
		return value > 0 ? `${"⭐".repeat(Math.max(1, Math.min(5, Math.round(value))))}` : "";
	}

	return firstValue(value);
}

export function normalizeDateLikeValue(value) {
	const normalized = firstValue(value);
	return normalized || "";
}

export function normalizeObsidianData(data = {}) {
	if (!data || typeof data !== "object") {
		return data;
	}

	for (const [rawKey, rawValue] of Object.entries(data)) {
		const alias = OBSIDIAN_FIELD_ALIASES.get(normalizeObsidianKey(rawKey));
		if (alias && isEmptyValue(data[alias])) {
			data[alias] = rawValue;
		}
	}

	if (data.tag && !data.tags) {
		data.tags = data.tag;
	}

	if (data.coverImage !== undefined) {
		data.coverImage = normalizeCoverImageSource(data.coverImage, data.page);
	}

	if (data.banner) {
		const bannerValue = firstValue(data.banner);
		const assetMatch = bannerValue.match(/\(([^)]+)\)$/);
		if (assetMatch) {
			data.banner = normalizeCoverImageSource(assetMatch[1], data.page);
		}
	}

	if (data.rating !== undefined) {
		data.rating = normalizeRatingValue(data.rating);
	}

	if (data.onlineRating !== undefined) {
		const numericRating = Number(data.onlineRating);
		data.onlineRating = Number.isFinite(numericRating) && numericRating > 0 ? String(numericRating) : "";
	}

	if (data.genre !== undefined) {
		data.genre = toValueList(data.genre);
	}

	if (data.subject !== undefined) {
		data.subject = toValueList(data.subject);
	}

	if (data.vibes !== undefined) {
		data.vibes = toValueList(data.vibes);
	}

	if (data.publisher !== undefined) {
		data.publisher = toValueList(data.publisher);
	}

	if (data.developer !== undefined) {
		data.developer = toValueList(data.developer);
	}

	if (data.writers !== undefined) {
		data.writers = toValueList(data.writers);
	}

	if (data.streamingServices !== undefined) {
		data.streamingServices = toValueList(data.streamingServices);
	}

	if (data.shelf !== undefined) {
		data.shelf = firstValue(data.shelf);
	}

	if (data.completed !== undefined) {
		data.completed = firstValue(data.completed);
	}

	if (data.lastRead !== undefined) {
		data.lastRead = normalizeDateLikeValue(data.lastRead);
	}

	if (data.lastWatched !== undefined) {
		data.lastWatched = normalizeDateLikeValue(data.lastWatched);
	}

	if (data.releasedOn !== undefined) {
		data.releasedOn = normalizeDateLikeValue(data.releasedOn);
	}

	if (data.alternateTitle !== undefined && firstValue(data.alternateTitle) === firstValue(data.title)) {
		data.alternateTitle = "";
	}

	if (data.externalUrl === undefined && typeof data.url === "string" && /^https?:\/\//i.test(data.url)) {
		data.externalUrl = data.url;
	}

	if (data.layout === "layouts/log.njk" && !data.coverImage && data.image) {
		data.coverImage = normalizeCoverImageSource(data.image, data.page);
	}

	return data;
}