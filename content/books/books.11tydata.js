import { withCollectionDefaults } from "../../_config/collectionDefaults.js";

export default withCollectionDefaults({
	tags: ["books"],
	parent: ["logs"],
	layout: "layouts/log.njk",
	defaultTitle: "Book Entry",
});