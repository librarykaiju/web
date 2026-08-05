import { withCollectionDefaults } from "../../_config/collectionDefaults.js";

export default withCollectionDefaults({
	tags: ["music"],
	parent: ["logs"],
	layout: "layouts/log.njk",
	defaultTitle: "Music Entry",
});