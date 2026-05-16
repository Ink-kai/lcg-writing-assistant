import {App, ItemView, Notice, TFile, WorkspaceLeaf} from "obsidian";
import {LCG_FRONTMATTER_FIELDS, getFieldDefinition} from "../frontmatter/schema";
import {LCGWritingAssistantSettings} from "../settings";
import {FrontmatterAssistantModal} from "../ui/frontmatter-modal";
import {validateFields, GroupValidation} from "./validator";
import {applyFrontmatterUpdates} from "../frontmatter/editor";
import {FrontmatterFieldDefinition} from "../frontmatter/types";
import {t} from "../i18n";

export const LCG_PANEL_VIEW_TYPE = "lcg-panel-view";

// Group labels that should be expanded by default
const EXPANDED_GROUPS = ["必填字段", "推荐字段", "required", "recommended"];

export class LCGPanelView extends ItemView {
	private settings: LCGWritingAssistantSettings;
	private currentNotePath: string | null = null;
	private debounceTimer: number | null = null;
	private expandedGroups: Set<string> = new Set(EXPANDED_GROUPS);
	private currentFields: Record<string, string> = {};

	constructor(leaf: WorkspaceLeaf, app: App, settings: LCGWritingAssistantSettings) {
		super(leaf);
		this.app = app;
		this.settings = settings;
	}

	getViewType(): string {
		return LCG_PANEL_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("panel.title");
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("lcg-panel");

		this.renderPlaceholder();

		this.setupEventListeners();
		this.refreshFromActiveFile();
	}

	async onClose(): Promise<void> {
		this.removeEventListeners();
		this.contentEl.empty();
	}

	private renderPlaceholder(): void {
		const placeholder = this.contentEl.createDiv({cls: "lcg-panel__placeholder"});
		placeholder.createEl("p", {text: t("panel.placeholder")});
		placeholder.createEl("p", {cls: "lcg-panel__hint", text: t("panel.placeholderHint")});
	}

	private setupEventListeners(): void {
		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				this.handleFileOpen(file);
			})
		);
	}

	private removeEventListeners(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	private handleFileOpen(_file: TFile | null): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.refreshFromActiveFile();
			this.debounceTimer = null;
		}, 500);
	}

	private refreshFromActiveFile(): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.currentNotePath = null;
			this.renderPlaceholder();
			return;
		}

		const notePath = activeFile.path;
		if (notePath !== this.currentNotePath) {
			this.currentNotePath = notePath;
			this.renderContent();
		}
	}

	private renderContent(): void {
		this.contentEl.empty();

		if (!this.currentNotePath) {
			this.renderPlaceholder();
			return;
		}

		const header = this.contentEl.createDiv({cls: "lcg-panel__header"});
		header.createEl("h2", {text: t("panel.frontMatter")});

		const file = this.app.vault.getFileByPath(this.currentNotePath);
		if (!file) {
			this.renderPlaceholder();
			return;
		}

		void this.renderFields(file.path);
	}

	private async renderFields(filePath: string): Promise<void> {
		const fieldsContainer = this.contentEl.createDiv({cls: "lcg-panel__fields"});

		try {
			const file = this.app.vault.getFileByPath(filePath);
			if (!file) {
				fieldsContainer.createEl("p", {text: t("error.noEditor")});
				return;
			}

			const content = await this.app.vault.read(file);
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

			if (!frontmatterMatch) {
				this.renderEmptyState(fieldsContainer);
				return;
			}

			const frontmatter = frontmatterMatch[1];
			if (frontmatter) {
				// 先渲染流水线状态
				this.renderPipelineStatus(frontmatter, fieldsContainer);
				// 再渲染字段分组
				this.renderGroupedFields(frontmatter, fieldsContainer);
			}
		} catch (error) {
			fieldsContainer.createEl("p", {text: t("error.readFailed", {message: error instanceof Error ? error.message : t("error.unknown")})});
		}
	}

	private renderPipelineStatus(frontmatter: string, container: HTMLElement): void {
		const fields = this.parseFrontmatterFields(frontmatter);
		const validations = validateFields(fields);

		// 计算总体状态
		const totalErrors = validations.reduce((sum, g) => sum + g.fields.filter(f => f.status === "error").length, 0);
		const totalWarnings = validations.reduce((sum, g) => sum + g.fields.filter(f => f.status === "warning").length, 0);
		const totalFields = validations.reduce((sum, g) => sum + g.fields.length, 0);

		const pipelineEl = container.createDiv({cls: "lcg-panel__pipeline"});

		// 流水线标题
		const pipelineTitle = pipelineEl.createDiv({cls: "lcg-panel__pipeline-title"});
		pipelineTitle.createSpan({text: t("panel.pipeline.title")});

		// 流水线步骤
		const stepsEl = pipelineEl.createDiv({cls: "lcg-panel__pipeline-steps"});

		// 步骤1: 验证
		const validationStep = stepsEl.createDiv({cls: "lcg-panel__pipeline-step"});
		if (totalErrors === 0 && totalWarnings === 0) {
			validationStep.addClass("is-complete");
		} else if (totalWarnings > 0) {
			validationStep.addClass("is-warning");
		} else {
			validationStep.addClass("is-error");
		}
		validationStep.createSpan({cls: "lcg-panel__pipeline-step-icon", text: totalErrors === 0 && totalWarnings === 0 ? "✓" : "⚠"});
		validationStep.createSpan({cls: "lcg-panel__pipeline-step-label", text: t("panel.pipeline.validation")});

		// 步骤2: 转换 (显示字段数量)
		const convertStep = stepsEl.createDiv({cls: "lcg-panel__pipeline-step"});
		convertStep.createSpan({cls: "lcg-panel__pipeline-step-icon", text: "→"});
		convertStep.createSpan({cls: "lcg-panel__pipeline-step-label", text: t("panel.pipeline.convert", {count: totalFields})});

		// 步骤3: 状态摘要
		const statusStep = stepsEl.createDiv({cls: "lcg-panel__pipeline-step"});
		if (totalErrors > 0) {
			statusStep.addClass("is-error");
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-icon", text: "✗"});
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-label", text: t("panel.pipeline.errors", {count: totalErrors})});
		} else if (totalWarnings > 0) {
			statusStep.addClass("is-warning");
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-icon", text: "⚠"});
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-label", text: t("panel.pipeline.warnings", {count: totalWarnings})});
		} else {
			statusStep.addClass("is-complete");
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-icon", text: "✓"});
			statusStep.createSpan({cls: "lcg-panel__pipeline-step-label", text: t("panel.pipeline.allPassed")});
		}
	}

	private renderEmptyState(container: HTMLElement): void {
		const emptyState = container.createDiv({cls: "lcg-panel__empty"});
		emptyState.createEl("p", {text: t("panel.noFrontmatter")});
		const insertBtn = emptyState.createEl("button", {
			text: t("panel.insertTemplate"),
			cls: "lcg-panel__empty-insert"
		});
		insertBtn.addEventListener("click", () => {
			this.openFrontmatterEditor();
		});
	}

	private renderGroupedFields(frontmatter: string, container: HTMLElement): void {
		this.currentFields = this.parseFrontmatterFields(frontmatter);
		const validations = validateFields(this.currentFields);

		for (const group of validations) {
			this.renderFieldGroup(group, container);
		}
	}

	private renderFieldGroup(group: GroupValidation, container: HTMLElement): void {
		const groupEl = container.createDiv({cls: "lcg-panel__group"});

		const header = groupEl.createDiv({cls: "lcg-panel__group-header"});
		header.createSpan({cls: "lcg-panel__group-title", text: group.label});

		// 计算组内状态
		const errorCount = group.fields.filter(f => f.status === "error").length;
		const warningCount = group.fields.filter(f => f.status === "warning").length;
		if (errorCount > 0 || warningCount > 0) {
			const badge = header.createSpan({cls: "lcg-panel__group-badge"});
			if (errorCount > 0) {
				badge.createSpan({cls: "lcg-panel__group-badge--error", text: `${errorCount}`});
			}
			if (warningCount > 0) {
				badge.createSpan({cls: "lcg-panel__group-badge--warning", text: `${warningCount}`});
			}
		}

		// 折叠状态
		const isExpanded = this.expandedGroups.has(group.label);
		groupEl.toggleClass("is-collapsed", !isExpanded);

		header.addEventListener("click", () => {
			if (this.expandedGroups.has(group.label)) {
				this.expandedGroups.delete(group.label);
			} else {
				this.expandedGroups.add(group.label);
			}
			groupEl.toggleClass("is-collapsed", !this.expandedGroups.has(group.label));
		});

		const fieldsEl = groupEl.createDiv({cls: "lcg-panel__group-fields"});

		for (const field of group.fields) {
			const value = this.currentFields[field.key] || "";
			this.renderField(field.key, value, field.status, field.message, fieldsEl);
		}
	}

	private renderField(
		key: string,
		value: string,
		status: "valid" | "warning" | "error",
		message: string | undefined,
		container: HTMLElement
	): void {
		const fieldDef = LCG_FRONTMATTER_FIELDS.find(f => f.key === key);
		const label = fieldDef?.label || key;

		const fieldRow = container.createDiv({cls: "lcg-panel__field"});
		if (status === "error") {
			fieldRow.addClass("lcg-panel__field--error");
		} else if (status === "warning") {
			fieldRow.addClass("lcg-panel__field--warning");
		}

		const keyEl = fieldRow.createDiv({cls: "lcg-panel__field-key"});
		keyEl.createSpan({text: label});
		keyEl.createSpan({cls: "lcg-panel__field-key-sub", text: key});

		// 值区域 - 可点击编辑
		const valueContainer = fieldRow.createDiv({cls: "lcg-panel__field-value-container"});

		const valueEl = valueContainer.createDiv({cls: "lcg-panel__field-value"});
		const displayValue = value.trim() || t("panel.field.empty");
		valueEl.setText(displayValue);

		// 操作按钮区域
		const actionsEl = fieldRow.createDiv({cls: "lcg-panel__field-actions"});

		// 复制按钮
		const copyBtn = actionsEl.createDiv({cls: "lcg-panel__field-action", attr: {title: t("panel.field.copy")}});
		copyBtn.setText("📋");
		copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const textToCopy = value.trim();
			if (textToCopy) {
				void navigator.clipboard.writeText(textToCopy);
				new Notice(t("panel.action.copied", {value: textToCopy.slice(0, 30) + (textToCopy.length > 30 ? "..." : "")}));
			} else {
				new Notice(t("panel.action.emptyValue"));
			}
		});

		// 跳转正文按钮
		const jumpBtn = actionsEl.createDiv({cls: "lcg-panel__field-action", attr: {title: t("panel.field.jump")}});
		jumpBtn.setText("↓");
		jumpBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.jumpToContent();
		});

		// 删除字段按钮
		const deleteBtn = actionsEl.createDiv({cls: "lcg-panel__field-action", attr: {title: t("panel.field.delete")}});
		deleteBtn.setText("🗑");
		deleteBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.deleteField(key, fieldDef);
		});

		// 编辑按钮
		const editBtn = actionsEl.createDiv({cls: "lcg-panel__field-edit", attr: {title: t("panel.field.edit")}});
		editBtn.setText(t("panel.field.edit"));

		// 验证状态图标
		const statusIcon = fieldRow.createDiv({cls: "lcg-panel__field-status"});
		if (status === "valid") {
			statusIcon.createSpan({cls: "lcg-panel__field-status--valid", text: "✓"});
		} else if (status === "warning") {
			statusIcon.createSpan({cls: "lcg-panel__field-status--warning", text: "⚠"});
			if (message) {
				statusIcon.setAttr("title", message);
			}
		} else if (status === "error") {
			statusIcon.createSpan({cls: "lcg-panel__field-status--error", text: "✗"});
			if (message) {
				statusIcon.setAttr("title", message);
			}
		}

		// 点击编辑按钮打开内联编辑
		editBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.startInlineEdit(key, fieldDef, value, fieldRow);
		});

		// 点击整行也打开编辑器
		fieldRow.addEventListener("click", (e) => {
			if (!(e.target as HTMLElement).closest(".lcg-panel__field-edit")) {
				this.openFrontmatterEditor();
			}
		});
	}

	private startInlineEdit(
		key: string,
		fieldDef: FrontmatterFieldDefinition | undefined,
		currentValue: string,
		fieldRow: HTMLElement
	): void {
		// 获取字段定义
		const field = fieldDef || getFieldDefinition(key);
		if (!field) {
			return;
		}

		// 创建编辑控件
		const editContainer = fieldRow.createDiv({cls: "lcg-panel__field-edit-container"});
		const input = editContainer.createEl("input", {
			type: "text",
			cls: "lcg-panel__field-input"
		});
		input.value = currentValue.replace(/^["']|["']$/g, ""); // 移除引号

		// 保存按钮
		const saveBtn = editContainer.createDiv({cls: "lcg-panel__field-save"});
		saveBtn.setText(t("modal.write"));

		// 取消按钮
		const cancelBtn = editContainer.createDiv({cls: "lcg-panel__field-cancel"});
		cancelBtn.setText(t("modal.cancel"));

		// 聚焦输入框
		input.focus();
		input.select();

		// 保存处理
		const saveHandler = () => {
			const newValue = input.value.trim();
			this.saveFieldValue(field, newValue);
			editContainer.remove();
			this.refreshFromActiveFile();
		};

		// 取消处理
		const cancelHandler = () => {
			editContainer.remove();
		};

		// 绑定事件
		saveBtn.addEventListener("click", saveHandler);
		cancelBtn.addEventListener("click", cancelHandler);

		// Enter 保存，Escape 取消
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				saveHandler();
			} else if (e.key === "Escape") {
				cancelHandler();
			}
		});
	}

	private saveFieldValue(field: FrontmatterFieldDefinition, value: string): void {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) {
			new Notice(t("error.noEditor"));
			return;
		}

		const editor = activeEditor.editor;
		if (!editor) {
			new Notice(t("error.noEditor"));
			return;
		}

		const updates = [{field, value}];
		applyFrontmatterUpdates(editor, updates, this.settings.autoCreateFrontmatter);
	}

	private jumpToContent(): void {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) {
			return;
		}

		const editor = activeEditor.editor;
		if (!editor) {
			return;
		}

		// 查找 front matter 结束位置，跳转到正文
		const content = editor.getValue();
		const fmMatch = content.match(/^---\n[\s\S]*?\n---/);
		if (fmMatch) {
			const endPos = fmMatch[0].length;
			// 跳转到 front matter 之后的第一行
			const line = content.substring(endPos).match(/\n/) ? content.substring(0, endPos).split("\n").length : 0;
			editor.setCursor({line: line, ch: 0});
		}
	}

	private deleteField(key: string, fieldDef: FrontmatterFieldDefinition | undefined): void {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) {
			new Notice(t("error.noEditor"));
			return;
		}

		const editor = activeEditor.editor;
		if (!editor) {
			new Notice(t("error.noEditor"));
			return;
		}

		const field = fieldDef || getFieldDefinition(key);
		if (!field) {
			new Notice(t("validation.required"));
			return;
		}

		// 通过设置空值来删除字段
		const updates = [{field, value: ""}];
		applyFrontmatterUpdates(editor, updates, this.settings.autoCreateFrontmatter);
		this.refreshFromActiveFile();
	}

	private parseFrontmatterFields(frontmatter: string): Record<string, string> {
		const fields: Record<string, string> = {};
		const lines = frontmatter.split("\n");
		let currentKey = "";
		let currentValue: string[] = [];

		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.*)$/);
			if (match) {
				if (currentKey) {
					fields[currentKey] = currentValue.join(" ").trim();
				}
				currentKey = match[1] ?? "";
				currentValue = [match[2] ?? ""];
			} else if (currentKey && line.startsWith(" ")) {
				currentValue.push(line.trim());
			}
		}

		if (currentKey) {
			fields[currentKey] = currentValue.join(" ").trim();
		}

		return fields;
	}

	private openFrontmatterEditor(): void {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) {
			return;
		}

		const editor = activeEditor.editor;
		if (!editor) {
			return;
		}

		const modal = new FrontmatterAssistantModal(
			this.app,
			editor,
			this.settings,
			this.currentNotePath ?? undefined
		);
		modal.open();
	}
}

export function togglePanel(app: App): void {
	const {workspace} = app;
	const existingLeaf = workspace.getLeavesOfType(LCG_PANEL_VIEW_TYPE)[0];

	if (existingLeaf) {
		existingLeaf.detach();
		return;
	}

	const leaf = workspace.getLeaf(true);
	void leaf.setViewState({type: LCG_PANEL_VIEW_TYPE});
}

export async function openPanel(app: App): Promise<void> {
	const {workspace} = app;
	const existingLeaf = workspace.getLeavesOfType(LCG_PANEL_VIEW_TYPE)[0];

	if (existingLeaf) {
		workspace.setActiveLeaf(existingLeaf);
		void workspace.revealLeaf(existingLeaf);
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (leaf) {
		await leaf.setViewState({type: LCG_PANEL_VIEW_TYPE, active: true});
		void workspace.revealLeaf(leaf);
	}
}
