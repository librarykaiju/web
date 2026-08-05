import { IdAttributePlugin, InputPathToUrlTransformPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginNavigation from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

import pluginFilters from "./_config/filters.js";
import pluginObsidianLinks from "./_config/obsidianLinks.js";

const CALENDAR_TAGS = new Set(["posts", "books", "games", "media", "movies", "tv", "music", "sketchbooks", "notes"]);
const CALENDAR_LAYOUTS = new Set(["layouts/post.njk", "layouts/log.njk", "layouts/sketch.njk"]);

function normalizeTags(tags) {
	const rawTags = Array.isArray(tags)
		? tags
		: typeof tags === "string"
			? tags.split(",")
			: [];

	return [...new Set(rawTags
		.map(tag => String(tag).trim())
		.map(tag => tag.replace(/^#+/, ""))
		.filter(Boolean))];
}

function getDateKey(dateObj) {
	return [
		dateObj.getUTCFullYear(),
		String(dateObj.getUTCMonth() + 1).padStart(2, "0"),
		String(dateObj.getUTCDate()).padStart(2, "0")
	].join("-");
}

function hasCalendarTag(tags) {
	if (!tags) {
		return false;
	}

	if (Array.isArray(tags)) {
		return tags.some(tag => CALENDAR_TAGS.has(tag));
	}

	return CALENDAR_TAGS.has(tags);
}

function getCalendarEntries(collectionApi) {
	return collectionApi.getAll().filter(item => {
		if (!(item.date instanceof Date) || Number.isNaN(item.date.valueOf())) {
			return false;
		}

		if (!item.url || item.url === "/" || item.data.eleventyExcludeFromCollections) {
			return false;
		}

		return CALENDAR_LAYOUTS.has(item.data.layout) || hasCalendarTag(item.data.tags);
	}).sort((a, b) => b.date - a.date);
}

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function(eleventyConfig) {
	// Drafts, see also _data/eleventyDataSchema.js
	eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
		if (data.draft) {
			data.title = `${data.title} (draft)`;
		}

		if(data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
			return false;
		}
	});

	eleventyConfig.addPreprocessor("normalize-tags", "*", data => {
		if (!data || !data.tags) {
			return;
		}

		data.tags = normalizeTags(data.tags);
	});

	eleventyConfig.addCollection("calendarEntries", collectionApi => {
		return getCalendarEntries(collectionApi);
	});

	eleventyConfig.addCollection("calendarDays", collectionApi => {
		const groupedByDate = new Map();

		for (const entry of getCalendarEntries(collectionApi)) {
			const dateKey = getDateKey(entry.date);
			if (!groupedByDate.has(dateKey)) {
				groupedByDate.set(dateKey, []);
			}

			groupedByDate.get(dateKey).push(entry);
		}

		return Array.from(groupedByDate.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([dateKey, entries]) => ({
				dateKey,
				url: `/dates/${dateKey}/`,
				entries,
			}));
	});

	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig
		.addPassthroughCopy({
			"./public/": "/"
		})
		.addPassthroughCopy({
			"./content/img/": "/img/"
		})
		.addPassthroughCopy({
			"./content/books/": "/books/"
		})
		.addPassthroughCopy("./content/feed/pretty-atom-feed.xsl");
		

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

	// Watch CSS files
	eleventyConfig.addWatchTarget("css/**/*.css");
	// Watch images for the image pipeline.
	eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpg,jpeg,gif}");

	// Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
	// Bundle <style> content and adds a {% css %} paired shortcode
	eleventyConfig.addBundle("css", {
		toFileDirectory: "dist",
		// Add all <style> content to `css` bundle (use <style eleventy:ignore> to opt-out)
		// Supported selectors: https://www.npmjs.com/package/posthtml-match-helper
		bundleHtmlContentFromSelector: "style",
	});

	// Bundle <script> content and adds a {% js %} paired shortcode
	eleventyConfig.addBundle("js", {
		toFileDirectory: "dist",
		// Add all <script> content to the `js` bundle (use <script eleventy:ignore> to opt-out)
		// Supported selectors: https://www.npmjs.com/package/posthtml-match-helper
		bundleHtmlContentFromSelector: "script",
	});

	// Official plugins
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 }
	});
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

	eleventyConfig.addPlugin(feedPlugin, {
		type: "atom", // or "rss", "json"
		outputPath: "/feed/feed.xml",
		stylesheet: "pretty-atom-feed.xsl",
	
		collection: {
			name: "posts",
			limit: 10,
		},
		metadata: {
			language: "en",
			title: "Blog Title",
			subtitle: "This is a longer description about your blog.",
			base: "https://example.com/",
			author: {
				name: "Your Name"
			}
		}
	});

	// Image optimization: https://www.11ty.dev/docs/plugins/image/#eleventy-transform
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		// Output formats for each image.
		formats: ["avif", "webp", "auto"],

		// widths: ["auto"],

		failOnError: false,
		htmlOptions: {
			imgAttributes: {
				// e.g. <img loading decoding> assigned on the HTML tag will override these values.
				loading: "lazy",
				decoding: "async",
			}
		},

		sharpOptions: {
			animated: true,
		},
	});

	// Filters
	eleventyConfig.addPlugin(pluginFilters);
	eleventyConfig.addPlugin(pluginObsidianLinks, {
		contentDir: "content",
	});

	eleventyConfig.addPlugin(IdAttributePlugin, {
		// by default we use Eleventy’s built-in `slugify` filter:
		// slugify: eleventyConfig.getFilter("slugify"),
		// selector: "h1,h2,h3,h4,h5,h6", // default
	});

	eleventyConfig.addShortcode("currentBuildDate", () => {
		return (new Date()).toISOString();
	});

	// Features to make your build faster (when you need them)

	// If your passthrough copy gets heavy and cumbersome, add this line
	// to emulate the file copy on the dev server. Learn more:
	// https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

	// eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
};

export const config = {
	// Control which files Eleventy will process
	// e.g.: *.md, *.njk, *.html, *.liquid
	templateFormats: [
		"md",
		"njk",
		"html",
		"liquid",
		"11ty.js",
	],

	// Pre-process *.md files with: (default: `liquid`)
	markdownTemplateEngine: "njk",

	// Pre-process *.html files with: (default: `liquid`)
	htmlTemplateEngine: "njk",

	// These are all optional:
	dir: {
		input: "content",          // default: "."
		includes: "../_includes",  // default: "_includes" (`input` relative)
		data: "../_data",          // default: "_data" (`input` relative)
		output: "_site"
	},

	// -----------------------------------------------------------------
	// Optional items:
	// -----------------------------------------------------------------

	// If your site deploys to a subdirectory, change `pathPrefix`.
	// Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

	// When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
	// it will transform any absolute URLs in your HTML to include this
	// folder name and does **not** affect where things go in the output folder.

	// pathPrefix: "/",
};
