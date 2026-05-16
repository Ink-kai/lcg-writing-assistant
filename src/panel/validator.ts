import {LCG_FRONTMATTER_FIELDS} from "../frontmatter/schema";
import {FrontmatterFieldDefinition} from "../frontmatter/types";
import {t} from "../i18n";

export type FieldValidationStatus = "valid" | "warning" | "error";

export interface FieldValidation {
	key: string;
	status: FieldValidationStatus;
	message?: string;
}

export interface GroupValidation {
	group: string;
	label: string;
	fields: FieldValidation[];
}

export function validateFields(frontmatter: Record<string, string>): GroupValidation[] {
	const groups = new Map<string, FieldValidation[]>();

	for (const field of LCG_FRONTMATTER_FIELDS) {
		const groupLabel = getGroupLabel(field.group);
		const validation = validateField(field, frontmatter[field.key]);

		if (!groups.has(groupLabel)) {
			groups.set(groupLabel, []);
		}
		groups.get(groupLabel)!.push(validation);
	}

	return Array.from(groups.entries()).map(([label, fields]) => ({
		group: getGroupKey(label),
		label,
		fields,
	}));
}

const GROUP_LABEL_KEYS: Record<string, "validation.group.required" | "validation.group.recommended" | "validation.group.images" | "validation.group.fixit" | "validation.group.visibility" | "validation.group.seo" | "validation.group.advanced" | "validation.group.external" | "validation.group.compatibility"> = {
	required: "validation.group.required",
	recommended: "validation.group.recommended",
	images: "validation.group.images",
	fixit: "validation.group.fixit",
	visibility: "validation.group.visibility",
	seo: "validation.group.seo",
	advanced: "validation.group.advanced",
	external: "validation.group.external",
	compatibility: "validation.group.compatibility",
};

function getGroupLabel(group: string): string {
	const key = GROUP_LABEL_KEYS[group];
	if (key) {
		return t(key);
	}
	return group;
}

function getGroupKey(group: string): string {
	return group;
}

function validateField(field: FrontmatterFieldDefinition, value: string | undefined): FieldValidation {
	const key = field.key;

	// 必填字段检查
	if (field.required) {
		if (!value || value.trim() === "" || value === '""' || value === "''") {
			return {
				key,
				status: "error",
				message: t("validation.required"),
			};
		}
	}

	// 日期格式检查
	if (key === "date" && value) {
		const parsed = new Date(value.replace(/"/g, ""));
		if (Number.isNaN(parsed.getTime())) {
			return {
				key,
				status: "warning",
				message: t("validation.invalidDate"),
			};
		}
	}

	// 草稿状态检查
	if (key === "draft" && value === "true") {
		return {
			key,
			status: "warning",
			message: t("validation.draft"),
		};
	}

	return {
		key,
		status: "valid",
	};
}

export function getFieldGroupFromKey(key: string): string {
	const field = LCG_FRONTMATTER_FIELDS.find(f => f.key === key);
	const group = field?.group ?? "other";
	return t(`validation.group.${group}` as const);
}
