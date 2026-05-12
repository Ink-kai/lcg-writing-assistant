import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import {insertFrontmatterTemplate, insertOrUpdateField, validateCurrentNote} from "../frontmatter/editor";
import {FRONTMATTER_GROUP_LABELS, LCG_FRONTMATTER_FIELDS} from "../frontmatter/schema";
import {FrontmatterFieldDefinition} from "../frontmatter/types";
import {LCGWritingAssistantSettings} from "../settings";
import {FrontmatterAssistantModal} from "../ui/frontmatter-modal";
import {showValidationNotice} from "../ui/notices";

type SlashAction = "template" | "editor" | "validate" | "field";

interface SlashSuggestion {
	id: string;
	action: SlashAction;
	title: string;
	subtitle: string;
	group: string;
	keywords: string[];
	field?: FrontmatterFieldDefinition;
}

export class LCGSlashSuggest extends EditorSuggest<SlashSuggestion> {
	private readonly getSettings: () => LCGWritingAssistantSettings;

	constructor(app: App, getSettings: () => LCGWritingAssistantSettings) {
		super(app);
		this.getSettings = getSettings;
		this.limit = 40;
		this.setInstructions([
			{command: "↑↓", purpose: "选择"},
			{command: "↵", purpose: "插入"},
			{command: "esc", purpose: "关闭"},
		]);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		if (!file || file.extension !== "md") {
			return null;
		}

		const triggerPhrase = normalizeTrigger(this.getSettings().triggerPhrase);
		const lineBeforeCursor = editor.getLine(cursor.line).slice(0, cursor.ch);
		const match = findTriggerMatch(lineBeforeCursor, triggerPhrase);
		if (!match) {
			return null;
		}

		return {
			start: {line: cursor.line, ch: match.startCh},
			end: cursor,
			query: match.query,
		};
	}

	getSuggestions(context: EditorSuggestContext): SlashSuggestion[] {
		const query = context.query.trim().toLowerCase();
		const settings = this.getSettings();
		const suggestions = buildSuggestions(settings);

		if (!query) {
			return suggestions;
		}

		return suggestions.filter((suggestion) => {
			const haystack = [
				suggestion.title,
				suggestion.subtitle,
				suggestion.group,
				...suggestion.keywords,
			].join(" ").toLowerCase();
			return haystack.includes(query);
		});
	}

	renderSuggestion(value: SlashSuggestion, el: HTMLElement): void {
		el.addClass("lcg-slash-suggestion");

		const header = el.createDiv({cls: "lcg-slash-suggestion__header"});
		header.createSpan({cls: "lcg-slash-suggestion__title", text: value.title});
		header.createSpan({cls: "lcg-slash-suggestion__group", text: value.group});

		el.createDiv({cls: "lcg-slash-suggestion__description", text: value.subtitle});

		if (value.field) {
			const meta = el.createDiv({cls: "lcg-slash-suggestion__meta"});
			meta.createSpan({text: value.field.key});
			meta.createSpan({text: value.field.type});
			if (value.field.required) {
				meta.createSpan({cls: "lcg-slash-suggestion__required", text: "必填"});
			}
			if (value.field.deprecated) {
				meta.createSpan({cls: "lcg-slash-suggestion__deprecated", text: "兼容"});
			}
		}
	}

	selectSuggestion(value: SlashSuggestion, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) {
			return;
		}

		context.editor.replaceRange("", context.start, context.end);

		if (value.action === "template") {
			insertFrontmatterTemplate(context.editor, this.getSettings().frontmatterTemplateFieldKeys);
			this.close();
			return;
		}

		if (value.action === "validate") {
			showValidationNotice(validateCurrentNote(context.editor));
			this.close();
			return;
		}

		if (value.action === "editor") {
			new FrontmatterAssistantModal(this.app, context.editor, this.getSettings(), context.file.path).open();
			this.close();
			return;
		}

		if (value.field) {
			insertOrUpdateField(context.editor, value.field, this.getSettings().autoCreateFrontmatter);
		}
		this.close();
	}
}

function buildSuggestions(settings: LCGWritingAssistantSettings): SlashSuggestion[] {
	const suggestions: SlashSuggestion[] = [
		{
			id: "template",
			action: "template",
			title: "插入 LCG 文章 front matter",
			subtitle: `按设置中的 ${settings.frontmatterTemplateFieldKeys.length || "0"} 个字段生成模板。`,
			group: "Front matter 模板",
			keywords: ["frontmatter", "template", "yaml", "模板"],
		},
		{
			id: "editor",
			action: "editor",
			title: "打开 front matter 编辑",
			subtitle: "按分类填写字段，保存时只写入已填写的值。",
			group: "Front matter 编辑",
			keywords: ["frontmatter", "editor", "modal", "编辑", "字段"],
		},
		{
			id: "validate",
			action: "validate",
			title: "校验当前文章",
			subtitle: "检查必填字段、日期格式、草稿状态、数组字段和旧兼容字段。",
			group: "发布校验",
			keywords: ["validate", "check", "publish", "校验", "发布"],
		},
	];

	for (const field of LCG_FRONTMATTER_FIELDS) {
		if (field.advanced && !settings.showAdvancedFields) {
			continue;
		}

		suggestions.push({
			id: `field-${field.key}`,
			action: "field",
			title: `${field.key} · ${field.label}`,
			subtitle: field.description,
			group: FRONTMATTER_GROUP_LABELS[field.group],
			keywords: [
				field.key,
				field.label,
				field.group,
				field.description,
				field.example ?? "",
			],
			field,
		});
	}

	return suggestions;
}

function normalizeTrigger(triggerPhrase: string): string {
	const trimmed = triggerPhrase.trim();
	return trimmed.length > 0 ? trimmed : "/lcg";
}

function findTriggerMatch(lineBeforeCursor: string, triggerPhrase: string): {startCh: number; query: string} | null {
	const triggerIndex = lineBeforeCursor.lastIndexOf(triggerPhrase);
	if (triggerIndex < 0) {
		return null;
	}

	if (triggerIndex > 0 && !/\s/.test(lineBeforeCursor.charAt(triggerIndex - 1))) {
		return null;
	}

	const afterTrigger = lineBeforeCursor.slice(triggerIndex + triggerPhrase.length);
	if (afterTrigger.length > 0 && !afterTrigger.startsWith(" ")) {
		return null;
	}

	return {
		startCh: triggerIndex,
		query: afterTrigger.trimStart(),
	};
}
