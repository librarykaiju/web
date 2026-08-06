function createImageFallback(image) {
	if (!image || image.dataset.fallbackApplied === "true") {
		return;
	}

	image.dataset.fallbackApplied = "true";

	const fallback = document.createElement("div");
	fallback.className = "image-fallback";

	if (image.classList.contains("cover-image")) {
		fallback.classList.add("image-fallback--cover");
	}

	const label = document.createElement("strong");
	label.textContent = "These files are still being cataloged.";
	fallback.appendChild(label);

	const source = image.getAttribute("src") || "";
	if (source) {
		const detail = document.createElement("span");
		detail.textContent = source;
		fallback.appendChild(detail);
	}

	image.replaceWith(fallback);
}

function attachImageFallbacks(root = document) {
	for (const image of root.querySelectorAll("img")) {
		image.addEventListener("error", () => createImageFallback(image), { once: true });

		if (image.complete && image.naturalWidth === 0) {
			createImageFallback(image);
		}
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => attachImageFallbacks(), { once: true });
} else {
	attachImageFallbacks();
}