import {Notice} from "obsidian";
import {ValidationIssue} from "../frontmatter/types";

export function showValidationNotice(issues: ValidationIssue[]): void {
	if (issues.length === 0) {
		new Notice("校验通过。");
		return;
	}

	const errors = issues.filter((issue) => issue.severity === "error").length;
	const warnings = issues.length - errors;
	const firstIssue = issues[0];
	const detail = firstIssue ? `: ${firstIssue.message}` : "";
	new Notice(`校验发现 ${errors} 个错误、${warnings} 个提醒${detail}`, 8000);
}
