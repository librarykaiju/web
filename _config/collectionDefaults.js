export function isUnderscoreContent(inputPath = "") {
	// Hide any entry when the filename or any parent folder starts with "_".
	return /[\\/]_[^\\/]+/.test(inputPath);
}

export function toReadableTitle(value = "") {
	return value
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, char => char.toUpperCase());
}

export function getFallbackTitle(page = {}, defaultTitle = "Untitled") {
	const inputPath = page.inputPath || "";
	const normalizedPath = inputPath.replace(/\\/g, "/");
	const segments = normalizedPath.split("/").filter(Boolean);
	const fileName = segments[segments.length - 1] || "";
	const parentDir = segments[segments.length - 2] || "";
	const fileStem = fileName.replace(/\.[^.]+$/, "");
	const fallbackSource = fileStem.toLowerCase() === "index" ? parentDir : fileStem;

	return toReadableTitle(fallbackSource || page.fileSlug || defaultTitle);
}

export function withCollectionDefaults({ tags = [], layout, parent, defaultTitle = "Untitled" } = {}) {
	const data = {
		tags,
		layout,
		eleventyComputed: {
			title: source => source.title || getFallbackTitle(source.page, defaultTitle),
			eleventyExcludeFromCollections: source => isUnderscoreContent(source?.page?.inputPath),
			permalink: source => (isUnderscoreContent(source?.page?.inputPath) ? false : source?.permalink),
		},
	};

	if (parent) {
		data.parent = parent;
	}

	return data;
}