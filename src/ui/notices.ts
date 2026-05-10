import {Notice} from "obsidian";
import {ValidationIssue} from "../frontmatter/types";

export function showValidationNotice(issues: ValidationIssue[]): void {
	if (issues.length === 0) {
		new Notice("Validation passed.");
		return;
	}

	const errors = issues.filter((issue) => issue.severity === "error").length;
	const warnings = issues.length - errors;
	const firstIssue = issues[0];
	const detail = firstIssue ? `: ${firstIssue.message}` : "";
	new Notice(`Validation found ${errors} errors and ${warnings} warnings${detail}`, 8000);
}
