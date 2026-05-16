import {Editor, EditorPosition, Notice} from "obsidian";
import {
	ARRAY_FIELD_KEYS,
	COMPATIBILITY_FIELD_KEYS,
	DEFAULT_TEMPLATE_FIELD_KEYS,
	getFieldDefinition,
	REQUIRED_FIELD_KEYS,
} from "./schema";
import {FrontmatterFieldDefinition, ParsedFrontmatter, ReadFieldValue, ValidationIssue} from "./types";
import {t} from "../i18n";

export interface FrontmatterFieldUpdate {
	field: FrontmatterFieldDefinition;
	value?: string;
}

export function parseFrontmatter(editor: Editor): ParsedFrontmatter {
	if (editor.lineCount() === 0 || editor.getLine(0).trim() !== "---") {
		return {
			exists: false,
			startLine: -1,
			endLine: -1,
			lines: [],
			bodyStartLine: 0,
		};
	}

	for (let line = 1; line < editor.lineCount(); line += 1) {
		if (editor.getLine(line).trim() === "---") {
			return {
				exists: true,
				startLine: 0,
				endLine: line,
				lines: collectLines(editor, 1, line),
				bodyStartLine: line + 1,
			};
		}
	}

	return {
		exists: false,
		startLine: -1,
		endLine: -1,
		lines: [],
		bodyStartLine: 0,
	};
}

export function cursorIsInFrontmatter(editor: Editor, cursor: EditorPosition): boolean {
	const frontmatter = parseFrontmatter(editor);
	return frontmatter.exists && cursor.line > frontmatter.startLine && cursor.line < frontmatter.endLine;
}

export function insertFrontmatterTemplate(editor: Editor, fieldKeys: readonly string[] = DEFAULT_TEMPLATE_FIELD_KEYS): void {
	const frontmatter = parseFrontmatter(editor);
	if (frontmatter.exists) {
		new Notice(t("editor.frontmatterExists"));
		return;
	}

	const now = formatLocalIsoDate(new Date());
	const fields = fieldKeys
		.map((key) => getFieldDefinition(key))
		.filter((field): field is FrontmatterFieldDefinition => field !== undefined);
	if (fields.length === 0) {
		new Notice(t("editor.templateEmpty"));
		return;
	}

	const lines = fields.map((field) => formatFieldLine(field, now));
	const template = `---\n${lines.join("\n")}\n---\n\n`;
	editor.replaceRange(template, {line: 0, ch: 0});
	const cursorFieldIndex = Math.max(fields.findIndex((field) => field.key === "title"), 0);
	const cursorField = fields[cursorFieldIndex];
	if (!cursorField) {
		return;
	}
	editor.setCursor({
		line: cursorFieldIndex + 1,
		ch: cursorField.key.length + 2,
	});
}

export function insertOrUpdateField(editor: Editor, field: FrontmatterFieldDefinition, autoCreateFrontmatter: boolean): void {
	const now = formatLocalIsoDate(new Date());
	const frontmatter = parseFrontmatter(editor);

	if (!frontmatter.exists) {
		if (!autoCreateFrontmatter) {
			new Notice(t("editor.noFrontmatterAutoCreate"));
			return;
		}
		const fieldLine = formatFieldLine(field, now);
		const template = `---\n${fieldLine}\n---\n\n`;
		editor.replaceRange(template, {line: 0, ch: 0});
		editor.setCursor({line: 1, ch: field.key.length + 2});
		return;
	}

	const existingLine = findTopLevelFieldLine(frontmatter, field.key);
	if (existingLine !== null) {
		new Notice(t("editor.fieldExists", {key: field.key}));
		editor.setCursor({line: existingLine, ch: editor.getLine(existingLine).length});
		return;
	}

	const insertLine = getFieldInsertLine(editor, frontmatter);
	const line = formatFieldLine(field, now);
	editor.replaceRange(`${line}\n`, {line: insertLine, ch: 0});
	editor.setCursor({line: insertLine, ch: field.key.length + 2});
}

export function applyFrontmatterUpdates(editor: Editor, updates: FrontmatterFieldUpdate[], autoCreateFrontmatter: boolean): void {
	const meaningfulUpdates = updates.filter((update) => update.value !== undefined && update.value.trim().length > 0);
	if (meaningfulUpdates.length === 0) {
		new Notice(t("editor.noFieldsToWrite"));
		return;
	}

	const now = formatLocalIsoDate(new Date());
	let frontmatter = parseFrontmatter(editor);

	if (!frontmatter.exists) {
		if (!autoCreateFrontmatter) {
			new Notice(t("editor.noFrontmatterAutoCreate"));
			return;
		}

		const lines = meaningfulUpdates.map((update) => formatUpdateLine(update, now));
		const template = `---\n${lines.join("\n")}\n---\n\n`;
		editor.replaceRange(template, {line: 0, ch: 0});
		editor.setCursor({line: 1, ch: meaningfulUpdates[0]?.field.key.length ?? 0});
		return;
	}

	for (const update of meaningfulUpdates) {
		frontmatter = upsertFrontmatterField(editor, frontmatter, update, now);
	}
}

export function readFrontmatterValues(editor: Editor): Map<string, ReadFieldValue> {
	const values = new Map<string, ReadFieldValue>();
	const frontmatter = parseFrontmatter(editor);
	if (!frontmatter.exists) {
		return values;
	}

	for (let index = 0; index < frontmatter.lines.length; index += 1) {
		const line = frontmatter.lines[index];
		const match = line?.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
		if (!match) {
			continue;
		}
		const key = match[1] ?? "";
		const inlineRaw = (match[2] ?? "").trim();

		if (inlineRaw.length > 0) {
			values.set(key, {
				rawInline: inlineRaw,
				blockArray: null,
				normalized: normalizeReadValue(inlineRaw),
			});
			continue;
		}

		const blockItems: string[] = [];
		for (let next = index + 1; next < frontmatter.lines.length; next += 1) {
			const blockLine = frontmatter.lines[next] ?? "";
			const itemMatch = blockLine.match(/^\s+-\s+(.*)$/);
			if (!itemMatch) {
				if (/^[A-Za-z0-9_]+\s*:/.test(blockLine)) {
					break;
				}
				if (blockLine.trim().length === 0) {
					continue;
				}
				break;
			}
			blockItems.push(stripYamlQuotes(itemMatch[1]?.trim() ?? ""));
		}

		const normalized = blockItems.length > 0 ? blockItems.join(", ") : "";
		values.set(key, {
			rawInline: "",
			blockArray: blockItems.length > 0 ? blockItems : null,
			normalized,
		});
	}

	return values;
}

export function validateCurrentNote(editor: Editor): ValidationIssue[] {
	const frontmatter = parseFrontmatter(editor);
	const issues: ValidationIssue[] = [];

	if (!frontmatter.exists) {
		return [
			{
				message: t("validation.missingFrontmatter"),
				severity: "error",
			},
		];
	}

	for (const key of REQUIRED_FIELD_KEYS) {
		const value = readFieldRawValue(frontmatter, key);
		if (value === null || value.length === 0 || value === "\"\"" || value === "''") {
			issues.push({
				field: key,
				message: t("validation.missingFields", {key}),
				severity: "error",
			});
		}
	}

	const dateValue = readFieldRawValue(frontmatter, "date");
	if (dateValue && Number.isNaN(Date.parse(stripYamlQuotes(dateValue)))) {
		issues.push({
			field: "date",
			message: t("validation.invalidDate"),
			severity: "error",
		});
	}

	const draftValue = readFieldRawValue(frontmatter, "draft");
	if (draftValue === "true") {
		issues.push({
			field: "draft",
			message: t("validation.draft"),
			severity: "warning",
		});
	}

	for (const key of ARRAY_FIELD_KEYS) {
		if (!fieldExists(frontmatter, key)) {
			continue;
		}
		if (!fieldLooksLikeArray(frontmatter, key)) {
			issues.push({
				field: key,
				message: t("validation.arrayRecommended", {key}),
				severity: "warning",
			});
		}
	}

	for (const key of COMPATIBILITY_FIELD_KEYS) {
		if (fieldExists(frontmatter, key)) {
			issues.push({
				field: key,
				message: t("validation.deprecatedField", {key}),
				severity: "warning",
			});
		}
	}

	return issues;
}

function collectLines(editor: Editor, startInclusive: number, endExclusive: number): string[] {
	const lines: string[] = [];
	for (let line = startInclusive; line < endExclusive; line += 1) {
		lines.push(editor.getLine(line));
	}
	return lines;
}

function getFieldInsertLine(editor: Editor, frontmatter: ParsedFrontmatter): number {
	const cursor = editor.getCursor();
	if (cursorIsInFrontmatter(editor, cursor)) {
		return cursor.line + 1;
	}
	return frontmatter.endLine;
}

function upsertFrontmatterField(
	editor: Editor,
	frontmatter: ParsedFrontmatter,
	update: FrontmatterFieldUpdate,
	now: string,
): ParsedFrontmatter {
	const line = formatUpdateLine(update, now);
	const existingLine = findTopLevelFieldLine(frontmatter, update.field.key);
	if (existingLine !== null) {
		editor.replaceRange(line, {line: existingLine, ch: 0}, {line: existingLine, ch: editor.getLine(existingLine).length});
		return parseFrontmatter(editor);
	}

	const insertLine = frontmatter.endLine;
	editor.replaceRange(`${line}\n`, {line: insertLine, ch: 0});
	return parseFrontmatter(editor);
}

function findTopLevelFieldLine(frontmatter: ParsedFrontmatter, key: string): number | null {
	for (let index = 0; index < frontmatter.lines.length; index += 1) {
		const line = frontmatter.lines[index];
		if (line && new RegExp(`^${escapeRegExp(key)}\\s*:`).test(line)) {
			return frontmatter.startLine + 1 + index;
		}
	}
	return null;
}

function fieldExists(frontmatter: ParsedFrontmatter, key: string): boolean {
	return findTopLevelFieldLine(frontmatter, key) !== null;
}

function readFieldRawValue(frontmatter: ParsedFrontmatter, key: string): string | null {
	for (const line of frontmatter.lines) {
		const match = line.match(new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.*)$`));
		if (match) {
			return (match[1] ?? "").trim();
		}
	}
	return null;
}

function fieldLooksLikeArray(frontmatter: ParsedFrontmatter, key: string): boolean {
	const value = readFieldRawValue(frontmatter, key);
	if (value === null) {
		return false;
	}
	if (value.startsWith("[") && value.endsWith("]")) {
		return true;
	}
	if (value.length > 0) {
		return false;
	}

	const fieldLine = findTopLevelFieldLine(frontmatter, key);
	if (fieldLine === null) {
		return false;
	}
	const relativeIndex = fieldLine - frontmatter.startLine;
	const nextLine = frontmatter.lines[relativeIndex + 1];
	return Boolean(nextLine?.match(/^\s+-\s+/));
}

function formatFieldLine(field: FrontmatterFieldDefinition, now: string): string {
	const defaultValue = field.key === "date" || field.key === "lastmod"
		? now
		: (field.defaultValue ?? "");

	if (defaultValue.startsWith("\n")) {
		return `${field.key}:${defaultValue}`;
	}
	return `${field.key}: ${defaultValue}`;
}

function formatUpdateLine(update: FrontmatterFieldUpdate, now: string): string {
	if (update.value !== undefined) {
		return `${update.field.key}: ${formatYamlValue(update.value, update.field.type)}`;
	}
	return formatFieldLine(update.field, now);
}

function formatYamlValue(value: string, type: FrontmatterFieldDefinition["type"]): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return "\"\"";
	}

	if (type === "boolean") {
		return trimmed === "true" ? "true" : "false";
	}

	if (type === "number") {
		return trimmed;
	}

	if (type === "string[]") {
		if (trimmed.startsWith("[") || trimmed.startsWith("-")) {
			return trimmed;
		}
		const values = trimmed
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean);
		return `[${values.map((part) => quoteYamlString(part)).join(", ")}]`;
	}

	if (type === "object") {
		return trimmed;
	}

	if (trimmed.startsWith("\"") || trimmed.startsWith("'")) {
		return trimmed;
	}
	if (looksLikeRawYamlScalar(trimmed)) {
		return trimmed;
	}
	return quoteYamlString(trimmed);
}

function looksLikeRawYamlScalar(value: string): boolean {
	return value.startsWith("[")
		|| value.startsWith("{")
		|| value === "true"
		|| value === "false"
		|| value === "null"
		|| /^-?\d+(\.\d+)?$/.test(value);
}

function quoteYamlString(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function normalizeReadValue(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		const inner = trimmed.slice(1, -1).trim();
		if (inner.length === 0) {
			return "";
		}
		return inner
			.split(",")
			.map((part) => stripYamlQuotes(part.trim()))
			.filter(Boolean)
			.join(", ");
	}
	return stripYamlQuotes(trimmed);
}

function stripYamlQuotes(value: string): string {
	if (
		(value.startsWith("\"") && value.endsWith("\""))
		|| (value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function formatLocalIsoDate(date: Date): string {
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absoluteOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absoluteOffset / 60));
	const offsetRemainder = pad(absoluteOffset % 60);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offsetHours}:${offsetRemainder}`;
}

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
