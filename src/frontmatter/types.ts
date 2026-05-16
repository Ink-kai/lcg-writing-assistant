export type FrontmatterFieldType =
	| "string"
	| "boolean"
	| "string[]"
	| "number"
	| "object";

export type FrontmatterFieldGroup =
	| "required"
	| "recommended"
	| "images"
	| "fixit"
	| "visibility"
	| "seo"
	| "advanced"
	| "external"
	| "compatibility"
	| "other";

export type FrontmatterFieldSource =
	| "obsidian"
	| "hugo"
	| "theme"
	| "custom";

export interface FrontmatterFieldDefinition {
	key: string;
	label: string;
	type: FrontmatterFieldType;
	group: FrontmatterFieldGroup;
	source: FrontmatterFieldSource;
	required: boolean;
	/** Optional. Currently only used by date/lastmod to auto-fill the current timestamp. */
	defaultValue?: string;
	description: string;
	example?: string;
	advanced?: boolean;
	deprecated?: boolean;
}

export interface ValidationIssue {
	field?: string;
	message: string;
	severity: "error" | "warning";
}

export interface ParsedFrontmatter {
	exists: boolean;
	startLine: number;
	endLine: number;
	lines: string[];
	bodyStartLine: number;
}

export interface ReadFieldValue {
	/** Raw inline value after the colon */
	rawInline: string;
	/** Block array items if field uses `-` syntax, else null */
	blockArray: string[] | null;
	/** Resolved normalized string */
	normalized: string;
}
