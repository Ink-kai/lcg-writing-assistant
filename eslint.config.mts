import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		plugins: {
			obsidianmd,
		},
		rules: {
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					// Keep product names, protocol names, and user-typed trigger phrases stable.
					// The rule still runs as an error for ordinary UI copy.
					acronyms: ["CDN", "ID", "LCG", "MKCOL", "PUT", "R2", "S3", "URL", "YAML"],
					brands: ["Cloudflare", "FixIt", "Hugo", "Markdown", "Obsidian", "WebDAV"],
					ignoreRegex: ["\\/lcg"],
					ignoreWords: ["LCG", "lcg"],
				},
			],
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
