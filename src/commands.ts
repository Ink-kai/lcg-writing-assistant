import {Plugin} from "obsidian";
import {insertFrontmatterTemplate, insertOrUpdateField, validateCurrentNote} from "./frontmatter/editor";
import {DEFAULT_TEMPLATE_FIELD_KEYS, LCG_FRONTMATTER_FIELDS, getFieldDefinition} from "./frontmatter/schema";
import {LCGWritingAssistantSettings} from "./settings";
import {showValidationNotice} from "./ui/notices";

export function registerLCGCommands(plugin: Plugin, settings: LCGWritingAssistantSettings): void {
	registerTemplateCommands(plugin, settings);
	registerValidationCommand(plugin);
	registerFieldCommands(plugin, settings);
}

function registerTemplateCommands(plugin: Plugin, settings: LCGWritingAssistantSettings): void {
	plugin.addCommand({
		id: "insert-lcg-frontmatter",
		name: "插入 LCG front matter",
		editorCallback: (editor) => {
			insertFrontmatterTemplate(editor, settings.frontmatterTemplateFieldKeys);
		},
	});
}

function registerValidationCommand(plugin: Plugin): void {
	plugin.addCommand({
		id: "validate-current-note",
		name: "校验当前 LCG 文章",
		editorCallback: (editor) => {
			const issues = validateCurrentNote(editor);
			showValidationNotice(issues);
		},
	});
}

function registerFieldCommands(plugin: Plugin, settings: LCGWritingAssistantSettings): void {
	for (const key of DEFAULT_TEMPLATE_FIELD_KEYS) {
		const field = getFieldDefinition(key);
		if (!field) {
			continue;
		}

		plugin.addCommand({
			id: `insert-field-${field.key}`,
			name: `插入 LCG 字段：${field.label}`,
			editorCallback: (editor) => {
				insertOrUpdateField(editor, field, settings.autoCreateFrontmatter);
			},
		});
	}

	for (const field of LCG_FRONTMATTER_FIELDS) {
		if (DEFAULT_TEMPLATE_FIELD_KEYS.includes(field.key as (typeof DEFAULT_TEMPLATE_FIELD_KEYS)[number])) {
			continue;
		}

		plugin.addCommand({
			id: `insert-field-${field.key}`,
			name: `插入 LCG 字段：${field.label}`,
			editorCallback: (editor) => {
				insertOrUpdateField(editor, field, settings.autoCreateFrontmatter);
			},
		});
	}
}
