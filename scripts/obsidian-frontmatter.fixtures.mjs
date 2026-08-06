export const fixtures = [
	{
		name: "book arrays and aliases",
		input: {
			layout: "layouts/log.njk",
			title: "A Winter's Promise",
			"read in": 2025,
			genres: ["Fantasy"],
			subjects: ["Young Adult Fiction", "Political Marriages"],
			cover: "00 Content/Media/Jackets/A Winter's Promise - Christelle Dabos.jpg",
			personalRating: ["⭐⭐⭐⭐⭐"],
			shelf: ["Finished"],
			page: {
				inputPath: "content/books/A Winter's Promise - Christelle Dabos.md",
			},
		},
		expect: {
			completed: "2025",
			genre: ["Fantasy"],
			subject: ["Young Adult Fiction", "Political Marriages"],
			coverImage: "/attachments/media/Jackets/A Winter's Promise - Christelle Dabos.jpg",
			rating: "⭐⭐⭐⭐⭐",
			shelf: "Finished",
		},
	},
	{
		name: "media database aliases",
		input: {
			layout: "layouts/log.njk",
			title: "Spider-Man: Brand New Day",
			type: "movie",
			subType: "",
			plot: "A forgotten Peter Parker lives alone as a full-time Spider-Man.",
			actors: ["Tom Holland", "Zendaya"],
			writer: ["Chris McKenna", "Erik Sommers"],
			premiere: "07/31/2026",
			onlineRating: ".nan",
			streamingServices: [],
			image: "https://m.media-amazon.com/example.jpg",
			url: "https://www.imdb.com/title/tt22084616/",
			page: {
				inputPath: "content/movies-tv/Spider-Man - Brand New Day (2026).md",
			},
		},
		expect: {
			mediaType: "movie",
			summary: "A forgotten Peter Parker lives alone as a full-time Spider-Man.",
			performers: ["Tom Holland", "Zendaya"],
			writers: ["Chris McKenna", "Erik Sommers"],
			releasedOn: "07/31/2026",
			onlineRating: "",
			coverImage: "https://m.media-amazon.com/example.jpg",
			externalUrl: "https://www.imdb.com/title/tt22084616/",
		},
	},
	{
		name: "sketch relative cover survives",
		input: {
			layout: "layouts/sketch.njk",
			title: "Polygon Batman",
			coverImage: "./images/20210709_002039427_iOS-scaled.jpeg",
			englishTitle: "Polygon Batman",
			page: {
				inputPath: "content/sketchbooks/polygon-batman/index.md",
			},
		},
		expect: {
			coverImage: "./images/20210709_002039427_iOS-scaled.jpeg",
			alternateTitle: "",
		},
	},
];