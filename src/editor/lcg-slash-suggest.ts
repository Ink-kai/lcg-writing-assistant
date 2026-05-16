import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Notice,
	TFile,
} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {t} from "../i18n";
import {getConfigurationIssue} from "../frontmatter/validation";

type SlashAction = "upload-all" | "validate";

interface SlashSuggestion {
	id: string;
	action: SlashAction;
	title: string;
	subtitle: string;
	group: string;
	keywords: string[];
}

export class LCGSlashSuggest extends EditorSuggest<SlashSuggestion> {
	private readonly getSettings: () => LCGWritingAssistantSettings;

	constructor(app: App, getSettings: () => LCGWritingAssistantSettings) {
		super(app);
		this.getSettings = getSettings;
		this.limit = 10;
		this.setInstructions([
			{command: "↑↓", purpose: t("slash.choose")},
			{command: "↵", purpose: t("slash.insert")},
			{command: "esc", purpose: t("slash.close")},
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
		const suggestions = buildSuggestions();

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
	}

	selectSuggestion(value: SlashSuggestion, _evt: MouseEvent | KeyboardEvent): void {
		this.close();

		if (value.action === "upload-all") {
			new Notice(t("notice.uploadAll"));
		} else if (value.action === "validate") {
			const issue = getConfigurationIssue();
			if (issue) {
				new Notice(issue);
			} else {
				new Notice(t("notice.validationPassed"));
			}
		}
	}
}

function buildSuggestions(): SlashSuggestion[] {
	return [
		{
			id: "upload-all",
			action: "upload-all",
			title: t("slash.uploadAll"),
			subtitle: t("slash.uploadAllDesc"),
			group: "LCG",
			keywords: ["cdn", "upload", "image", "上传"],
		},
		{
			id: "validate",
			action: "validate",
			title: t("slash.validate"),
			subtitle: t("slash.validateDesc"),
			group: "LCG",
			keywords: ["validate", "check", "校验", "检查"],
		},
	];
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
