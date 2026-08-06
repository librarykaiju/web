import assert from "node:assert/strict";

import { fixtures } from "./obsidian-frontmatter.fixtures.mjs";
import { normalizeObsidianData } from "../_config/obsidianFrontmatter.js";

for (const fixture of fixtures) {
	const input = structuredClone(fixture.input);
	normalizeObsidianData(input);

	for (const [key, expected] of Object.entries(fixture.expect)) {
		assert.deepEqual(
			input[key],
			expected,
			`${fixture.name}: expected ${key} to equal ${JSON.stringify(expected)}, received ${JSON.stringify(input[key])}`,
		);
	}
}

console.log(`Validated ${fixtures.length} Obsidian front matter fixtures.`);