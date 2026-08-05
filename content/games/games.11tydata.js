import { withCollectionDefaults } from "../../_config/collectionDefaults.js";

export default withCollectionDefaults({
	tags: ["games"],
	parent: ["logs"],
	layout: "layouts/log.njk",
	defaultTitle: "Game Entry",
});