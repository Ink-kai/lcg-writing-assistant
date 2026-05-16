import {App, ItemView, TFile, WorkspaceLeaf} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {FrontmatterAssistantModal} from "../ui/frontmatter-modal";

export const LCG_PANEL_VIEW_TYPE = "lcg-panel-view";

export class LCGPanelView extends ItemView {
	private settings: LCGWritingAssistantSettings;
	private currentNotePath: string | null = null;
	private debounceTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, app: App, settings: LCGWritingAssistantSettings) {
		super(leaf);
		this.app = app;
		this.settings = settings;
	}

	getViewType(): string {
		return LCG_PANEL_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "LCG 写作助手";
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
		placeholder.createEl("p", {text: "请打开一篇笔记"});
		placeholder.createEl("p", {cls: "lcg-panel__hint", text: "LCG 面板将显示当前笔记的 front matter"});
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
		header.createEl("h2", {text: "Front matter"});

		const file = this.app.vault.getFileByPath(this.currentNotePath);
		if (!file) {
			this.renderPlaceholder();
			return;
		}

		this.renderFields(file.path);
	}

	private async renderFields(filePath: string): Promise<void> {
		const fieldsContainer = this.contentEl.createDiv({cls: "lcg-panel__fields"});

		try {
			const file = this.app.vault.getFileByPath(filePath);
			if (!file) {
				fieldsContainer.createEl("p", {text: "无法读取文件"});
				return;
			}

			const content = await this.app.vault.read(file);
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

			if (!frontmatterMatch) {
				fieldsContainer.createEl("p", {text: "当前笔记没有 front matter"});
				return;
			}

			const frontmatter = frontmatterMatch[1];
			if (frontmatter) {
				this.parseAndRenderFields(frontmatter, fieldsContainer);
			}
		} catch (error) {
			fieldsContainer.createEl("p", {text: `读取失败: ${error instanceof Error ? error.message : "未知错误"}`});
		}
	}

	private parseAndRenderFields(frontmatter: string, container: HTMLElement): void {
		const lines = frontmatter.split("\n");
		let currentKey = "";
		let currentValue: string[] = [];

		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.*)$/);
			if (match) {
				if (currentKey) {
					this.renderField(currentKey, currentValue.join("\n"), container);
				}
				currentKey = match[1] ?? "";
				currentValue = [match[2] ?? ""];
			} else if (currentKey && line.startsWith(" ")) {
				currentValue.push(line.trim());
			}
		}

		if (currentKey) {
			this.renderField(currentKey, currentValue.join("\n"), container);
		}
	}

	private renderField(key: string, value: string, container: HTMLElement): void {
		const fieldRow = container.createDiv({cls: "lcg-panel__field"});
		fieldRow.createEl("span", {cls: "lcg-panel__field-key", text: key});
		fieldRow.createEl("span", {cls: "lcg-panel__field-value", text: value || "(空)"});

		fieldRow.addEventListener("click", () => {
			this.openFrontmatterEditor();
		});
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
	leaf.setViewState({type: LCG_PANEL_VIEW_TYPE});
}

export function openPanel(app: App): void {
	const {workspace} = app;
	const existingLeaf = workspace.getLeavesOfType(LCG_PANEL_VIEW_TYPE)[0];

	if (existingLeaf) {
		workspace.setActiveLeaf(existingLeaf);
		return;
	}

	const leaf = workspace.getLeaf(true);
	leaf.setViewState({type: LCG_PANEL_VIEW_TYPE});
}
