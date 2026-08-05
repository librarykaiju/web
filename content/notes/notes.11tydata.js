function isUnderscoreContent(inputPath = "") {
	// Hide any entry when the filename or any parent folder starts with "_".
	return /[\\/]_[^\\/]+/.test(inputPath);
}

function toReadableTitle(value = "") {
	return value
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, char => char.toUpperCase());
}

function getFallbackTitle(page = {}) {
	const inputPath = page.inputPath || "";
	const normalizedPath = inputPath.replace(/\\/g, "/");
	const segments = normalizedPath.split("/").filter(Boolean);
	const fileName = segments[segments.length - 1] || "";
	const parentDir = segments[segments.length - 2] || "";
	const fileStem = fileName.replace(/\.[^.]+$/, "");
	const fallbackSource = fileStem.toLowerCase() === "index" ? parentDir : fileStem;

	return toReadableTitle(fallbackSource || page.fileSlug || "Note");
}

export default {
	tags: [
		"notes"
	],
	layout: "layouts/note.njk",
	eleventyComputed: {
		title: data => data.title || getFallbackTitle(data.page),
		eleventyExcludeFromCollections: data => isUnderscoreContent(data?.page?.inputPath),
		permalink: data => (isUnderscoreContent(data?.page?.inputPath) ? false : data?.permalink),
	},
};
