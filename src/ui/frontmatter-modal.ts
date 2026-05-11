import {
	App,
	Editor,
	Modal,
	Notice,
	Setting,
	TextComponent,
} from "obsidian";
import {applyFrontmatterUpdates, FrontmatterFieldUpdate, readFrontmatterValues} from "../frontmatter/editor";
import {DEFAULT_TEMPLATE_FIELD_KEYS, FRONTMATTER_GROUP_LABELS, LCG_FRONTMATTER_FIELDS, getFieldDefinition} from "../frontmatter/schema";
import {FrontmatterFieldDefinition, FrontmatterFieldGroup, ReadFieldValue} from "../frontmatter/types";
import {LCGWritingAssistantSettings} from "../settings";
import {deleteFromR2} from "../uploader/r2";
import {uploadImageInput} from "../uploader/local-file";
import {deleteFromWebDav} from "../uploader/webdav";

interface FieldControl {
	field: FrontmatterFieldDefinition;
	value: string;
	arrayValues: string[];
	valueEl?: WritableControl;
	arrayInputEl?: HTMLInputElement;
	chipsEl?: HTMLElement;
}

interface WritableControl {
	setValue(value: string): WritableControl;
}

interface ModalTab {
	id: FrontmatterFieldGroup;
	label: string;
	fields: FrontmatterFieldDefinition[];
}

export class FrontmatterAssistantModal extends Modal {
	private readonly editor: Editor;
	private readonly settings: LCGWritingAssistantSettings;
	private readonly notePath?: string;
	private readonly controls = new Map<string, FieldControl>();
	private activeTab: FrontmatterFieldGroup = "required";
	private tabsEl?: HTMLElement;
	private bodyEl?: HTMLElement;
	private statusEl?: HTMLElement;
	private readonly pendingUploads = new Map<string, string>();
	private committed = false;
	private closed = false;

	constructor(app: App, editor: Editor, settings: LCGWritingAssistantSettings, notePath?: string) {
		super(app);
		this.editor = editor;
		this.settings = settings;
		this.notePath = notePath;
	}

	onOpen(): void {
		this.closed = false;
		this.committed = false;
		this.setTitle("Front matter 编辑");
		this.contentEl.empty();
		this.contentEl.addClass("lcg-frontmatter-modal");
		this.initializeControls();

		this.renderQuickActions();
		this.renderTabs();
		this.contentEl.createDiv({
			cls: "lcg-frontmatter-modal__hint",
			text: "填写的字段会写入 front matter；留空的字段不会改动。",
		});
		this.bodyEl = this.contentEl.createDiv({cls: "lcg-frontmatter-modal__body"});
		this.renderActiveTab();
		this.renderFooter();
	}

	onClose(): void {
		this.closed = true;
		if (!this.committed) {
			void this.cleanupPendingUploads();
		}
		this.contentEl.empty();
	}

	private initializeControls(): void {
		this.controls.clear();
		const existing = readFrontmatterValues(this.editor);
		for (const field of this.getVisibleFields()) {
			const control: FieldControl = {
				field,
				value: "",
				arrayValues: [],
			};
			const read = existing.get(field.key);
			if (read) {
				if (field.type === "string[]") {
					const chips = read.blockArray ?? parseArrayInput(read.normalized);
					control.arrayValues = chips;
				} else {
					control.value = read.normalized;
				}
			}
			this.controls.set(field.key, control);
		}
	}

	private renderQuickActions(): void {
		const section = this.contentEl.createDiv({cls: "lcg-frontmatter-modal__quick"});
		const actions = section.createDiv({cls: "lcg-frontmatter-modal__actions"});

		this.createActionButton(actions, "填入模板默认值", () => {
			const templateKeys = this.settings.frontmatterTemplateFieldKeys.length > 0
				? this.settings.frontmatterTemplateFieldKeys
				: DEFAULT_TEMPLATE_FIELD_KEYS;
			this.fillDefaultValues(templateKeys);
		});
		this.createActionButton(actions, "填入必填默认值", () => {
			this.fillDefaultValues(LCG_FRONTMATTER_FIELDS.filter((field) => field.required).map((field) => field.key));
		});
		this.createActionButton(actions, "清空填写", () => {
			for (const control of this.controls.values()) {
				this.clearControl(control);
			}
		});
	}

	private renderTabs(): void {
		if (!this.tabsEl) {
			this.tabsEl = this.contentEl.createDiv({cls: "lcg-modal-tabs"});
		}
		this.tabsEl.empty();

		const tabs = this.getTabs();
		if (!tabs.some((tab) => tab.id === this.activeTab)) {
			this.activeTab = tabs[0]?.id ?? "required";
		}

		for (const tab of tabs) {
			const button = this.tabsEl.createEl("button", {
				cls: "lcg-modal-tab",
				text: tab.label,
				attr: {
					type: "button",
					"aria-pressed": String(tab.id === this.activeTab),
				},
			});
			button.toggleClass("is-active", tab.id === this.activeTab);
			button.addEventListener("click", () => {
				this.activeTab = tab.id;
				this.renderTabs();
				this.renderActiveTab();
			});
		}
	}

	private renderActiveTab(): void {
		if (!this.bodyEl) {
			return;
		}

		this.bodyEl.empty();
		const tab = this.getTabs().find((item) => item.id === this.activeTab);
		if (!tab) {
			return;
		}

		const section = this.bodyEl.createDiv({cls: "lcg-frontmatter-modal__section"});
		section.createEl("h3", {text: tab.label});

		for (const field of tab.fields) {
			this.renderFieldControl(section, field);
		}
	}

	private renderFieldControl(containerEl: HTMLElement, field: FrontmatterFieldDefinition): void {
		const control = this.getControl(field);
		control.valueEl = undefined;
		control.arrayInputEl = undefined;
		control.chipsEl = undefined;

		const existing = readFrontmatterValues(this.editor).get(field.key);
		const hasExisting = Boolean(existing && existing.normalized);
		const formatHint = this.getFormatHint(field, existing);

		const name = hasExisting
			? `${field.label} (${field.key})  ${formatHint}`
			: `${field.label} (${field.key})`;

		const setting = new Setting(containerEl)
			.setName(name)
			.setDesc(field.description);

		if (field.type === "boolean") {
			this.renderBooleanControl(setting.controlEl, control);
			return;
		}

		if (field.type === "string[]") {
			this.renderArrayControl(setting.controlEl, control);
			return;
		}

		if (field.group === "images") {
			this.renderImageFieldControl(setting.controlEl, control);
			return;
		}

		if (field.type === "object") {
			setting.addTextArea((text) => {
				text.inputEl.rows = 3;
				text
					.setPlaceholder("")
					.setValue(control.value)
					.onChange((value) => {
						control.value = value;
					});
				control.valueEl = text;
			});
			return;
		}

		if (field.key === "date" || field.key === "lastmod") {
			let textComp: TextComponent | null = null;
			setting.addText((text) => {
				textComp = text;
				text.inputEl.type = "datetime-local";
				text.inputEl.value = this.parseIsoToDatetimeLocal(control.value);
				text.inputEl.addEventListener("change", () => {
					control.value = text.getValue();
				});
			});
			setting.addButton((btn) => {
				btn.setIcon("calendar")
					.setTooltip("填入当前时间")
					.onClick(() => {
						if (!textComp) {
							return;
						}
						const now = formatLocalIsoDate(new Date());
						textComp.setValue(now);
						control.value = now;
					});
			});
			return;
		}

			setting.addText((text) => {
				text
					.setPlaceholder("")
					.setValue(control.value)
					.onChange((value) => {
						control.value = value;
				});
			control.valueEl = text;
		});
	}

	private renderImageFieldControl(containerEl: HTMLElement, control: FieldControl): void {
		const wrapper = containerEl.createDiv({cls: "lcg-image-input"});
		const fileButton = wrapper.createEl("button", {
			text: "选择",
			attr: {
				type: "button",
				"aria-label": `选择本地图片并上传到 ${control.field.label}`,
			},
		});
		const fileInput = wrapper.createEl("input", {type: "file", cls: "lcg-image-input__file"});
		fileInput.accept = "image/*";
		const urlInput = wrapper.createEl("input", {
			type: "text",
			placeholder: "粘贴 URL，或在此粘贴图片自动上传",
		});
		urlInput.value = control.value;

		fileButton.addEventListener("click", () => fileInput.click());
		fileInput.addEventListener("change", () => {
			const file = fileInput.files?.item(0);
			if (file) {
				void this.uploadAndSetImage(file, control);
			}
			fileInput.value = "";
		});
		urlInput.addEventListener("input", () => {
			control.value = urlInput.value;
		});
		urlInput.addEventListener("paste", (evt) => {
			const image = getClipboardImageFromData(evt.clipboardData);
			if (!image) {
				return;
			}
			evt.preventDefault();
			void this.uploadAndSetImage(image, control);
		});

		control.valueEl = {
			setValue(value: string): WritableControl {
				urlInput.value = value;
				return this;
			},
		};
	}

	private renderArrayControl(containerEl: HTMLElement, control: FieldControl): void {
		const wrapper = containerEl.createDiv({cls: "lcg-array-input"});
		control.chipsEl = wrapper.createDiv({cls: "lcg-array-input__chips"});
		control.arrayInputEl = wrapper.createEl("input", {
			type: "text",
			placeholder: "输入后按回车或逗号添加",
		});

		control.arrayInputEl.addEventListener("keydown", (evt) => {
			if (evt.key !== "Enter" && evt.key !== "," && evt.key !== "，") {
				return;
			}
			evt.preventDefault();
			this.addArrayValues(control, parseArrayInput(control.arrayInputEl?.value ?? ""));
			if (control.arrayInputEl) {
				control.arrayInputEl.value = "";
			}
		});
		control.arrayInputEl.addEventListener("paste", () => {
			window.setTimeout(() => {
				const value = control.arrayInputEl?.value ?? "";
				if (!value.includes(",") && !value.includes("，") && !value.includes("\n") && !value.includes("- ")) {
					return;
				}
				this.addArrayValues(control, parseArrayInput(value));
				if (control.arrayInputEl) {
					control.arrayInputEl.value = "";
				}
			});
		});
		control.arrayInputEl.addEventListener("blur", () => {
			this.addArrayValues(control, parseArrayInput(control.arrayInputEl?.value ?? ""));
			if (control.arrayInputEl) {
				control.arrayInputEl.value = "";
			}
		});

		this.renderArrayChips(control);
	}

	private renderBooleanControl(containerEl: HTMLElement, control: FieldControl): void {
		const wrapper = containerEl.createDiv({cls: "lcg-boolean-control"});
		const options = [
			{label: "不更新", value: ""},
			{label: "开启", value: "true"},
			{label: "关闭", value: "false"},
		];
		const buttons: HTMLButtonElement[] = [];
		const sync = () => {
			for (const button of buttons) {
				button.toggleClass("is-active", button.dataset.value === control.value);
			}
		};

		for (const option of options) {
			const button = wrapper.createEl("button", {
				text: option.label,
				attr: {
					type: "button",
					"data-value": option.value,
				},
			});
			button.addEventListener("click", () => {
				control.value = option.value;
				sync();
			});
			buttons.push(button);
		}

		control.valueEl = {
			setValue(value: string): WritableControl {
				control.value = value;
				sync();
				return this;
			},
		};
		sync();
	}

	private renderFooter(): void {
		const footer = this.contentEl.createDiv({cls: "lcg-frontmatter-modal__footer"});
		this.createActionButton(footer, "取消", () => this.close());
		const applyButton = footer.createEl("button", {text: "写入 front matter", cls: "mod-cta"});
		applyButton.addEventListener("click", () => this.applyUpdates());
	}

	private createActionButton(containerEl: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
		const button = containerEl.createEl("button", {text});
		button.addEventListener("click", onClick);
		return button;
	}

	private getFormatHint(field: FrontmatterFieldDefinition, read: ReadFieldValue | undefined): string {
		if (!read) {
			return "";
		}
		if (field.type === "string[]") {
			const source = read.blockArray ? "块格式（- 语法）" : "内联格式（[] 语法）";
			if (read.normalized) {
				return `${read.normalized} (${source})`;
			}
			return source;
		}
		if (field.group === "images") {
			if (read.normalized) {
				return read.normalized;
			}
			return "";
		}
		if (field.type === "object") {
			const lines = read.rawInline.split("\n").length;
			const multi = lines > 1 ? ` (${lines} 行)` : "";
			if (read.rawInline) {
				return `${lines} 行${multi}`;
			}
			return "";
		}
		if (read.normalized) {
			return read.normalized;
		}
		return "";
	}

	private parseIsoToDatetimeLocal(iso: string): string {
		if (!iso) {
			return "";
		}
		try {
			const date = new Date(iso);
			const pad = (n: number) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
		} catch {
			return "";
		}
	}

	private getTabs(): ModalTab[] {
		const groups = new Map<FrontmatterFieldGroup, FrontmatterFieldDefinition[]>();
		for (const field of this.getVisibleFields()) {
			const fields = groups.get(field.group) ?? [];
			fields.push(field);
			groups.set(field.group, fields);
		}

		return Array.from(groups.entries()).map(([id, fields]) => ({
			id,
			label: FRONTMATTER_GROUP_LABELS[id],
			fields,
		}));
	}

	private getVisibleFields(): FrontmatterFieldDefinition[] {
		return LCG_FRONTMATTER_FIELDS.filter((field) => this.settings.showAdvancedFields || !field.advanced);
	}

	private getControl(field: FrontmatterFieldDefinition): FieldControl {
		const existing = this.controls.get(field.key);
		if (existing) {
			return existing;
		}
		const control: FieldControl = {
			field,
			value: "",
			arrayValues: [],
		};
		this.controls.set(field.key, control);
		return control;
	}

	private fillDefaultValues(keys: readonly string[]): void {
		let count = 0;
		for (const key of keys) {
			const field = getFieldDefinition(key);
			if (!field) {
				continue;
			}
			const value = getDefaultFillValue(field);
			if (!value) {
				continue;
			}
			const control = this.getControl(field);
			this.setControlValue(control, value);
			count += 1;
		}

		if (count === 0) {
			new Notice("没有可自动填入的默认值。");
		}
	}

	private setControlValue(control: FieldControl, value: string): void {
		if (control.field.type === "string[]") {
			this.addArrayValues(control, parseArrayInput(value));
			return;
		}

		control.value = value;
		control.valueEl?.setValue(value);
	}

	private clearControl(control: FieldControl): void {
		control.value = "";
		control.arrayValues = [];
		control.valueEl?.setValue("");
		if (control.arrayInputEl) {
			control.arrayInputEl.value = "";
		}
		this.renderArrayChips(control);
	}

	private addArrayValues(control: FieldControl, values: string[]): void {
		if (values.length === 0) {
			return;
		}

		const existing = new Set(control.arrayValues);
		for (const value of values) {
			if (!existing.has(value)) {
				control.arrayValues.push(value);
				existing.add(value);
			}
		}
		this.renderArrayChips(control);
	}

	private renderArrayChips(control: FieldControl): void {
		if (!control.chipsEl) {
			return;
		}

		control.chipsEl.empty();
		for (const value of control.arrayValues) {
			const chip = control.chipsEl.createSpan({cls: "lcg-array-input__chip"});
			chip.createSpan({text: value});
			const removeButton = chip.createEl("button", {
				text: "×",
				attr: {
					type: "button",
					"aria-label": `移除 ${value}`,
				},
			});
			removeButton.addEventListener("click", () => {
				control.arrayValues = control.arrayValues.filter((item) => item !== value);
				this.renderArrayChips(control);
			});
		}
	}

	private async uploadAndSetImage(file: File, control: FieldControl): Promise<void> {
		this.setStatus(`正在上传 ${control.field.label}...`);
		try {
			const result = await uploadImageInput(file, this.notePath, this.settings);
			if (!result) {
				this.setStatus("图片未上传。");
				return;
			}
			if (this.closed && !this.committed) {
				await this.deleteUploadedObject(result.key);
				return;
			}
			this.pendingUploads.set(result.key, result.markdownUrl);
			this.setControlValue(control, result.markdownUrl);
			this.setStatus(`已上传并填入 ${control.field.label}。未写入前关闭窗口会自动删除本次上传。`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "图片上传失败。";
			this.setStatus(message);
			new Notice(message, 8000);
		}
	}

	private setStatus(message: string): void {
		if (!this.statusEl) {
			this.statusEl = this.contentEl.createDiv({cls: "lcg-frontmatter-modal__status"});
		}
		this.statusEl.setText(message);
	}

	private applyUpdates(): void {
		this.flushPendingArrayInputs();

		const updates: FrontmatterFieldUpdate[] = [];
		for (const control of this.controls.values()) {
			const value = this.getControlWriteValue(control);
			if (!value) {
				continue;
			}
			updates.push({
				field: control.field,
				value,
			});
		}

		if (updates.length === 0) {
			new Notice("没有填写需要写入的 front matter 字段。");
			return;
		}

		applyFrontmatterUpdates(this.editor, updates, this.settings.autoCreateFrontmatter);
		this.committed = true;
		new Notice(`已写入 ${updates.length} 个 front matter 字段。`);
		this.close();
	}

	private async cleanupPendingUploads(): Promise<void> {
		if (this.pendingUploads.size === 0) {
			return;
		}

		const keys = Array.from(this.pendingUploads.keys());
		this.pendingUploads.clear();
		let deleted = 0;
		for (const key of keys) {
			if (await this.deleteUploadedObject(key)) {
				deleted += 1;
			}
		}
		if (deleted > 0) {
			new Notice(`已清理 ${deleted} 个未写入的 CDN 图片。`);
		}
	}

	private async deleteUploadedObject(key: string): Promise<boolean> {
		if (this.settings.cdnProvider === "cloudflare-r2") {
			return deleteFromR2(key, this.settings);
		}
		if (this.settings.cdnProvider === "webdav") {
			return deleteFromWebDav(key, this.settings);
		}
		return false;
	}

	private flushPendingArrayInputs(): void {
		for (const control of this.controls.values()) {
			if (control.field.type !== "string[]") {
				continue;
			}
			this.addArrayValues(control, parseArrayInput(control.arrayInputEl?.value ?? ""));
			if (control.arrayInputEl) {
				control.arrayInputEl.value = "";
			}
		}
	}

	private getControlWriteValue(control: FieldControl): string {
		if (control.field.type === "string[]") {
			return control.arrayValues.join(", ");
		}
		return control.value.trim();
	}
}

function getDefaultFillValue(field: FrontmatterFieldDefinition): string | null {
	if (field.key === "date" || field.key === "lastmod") {
		return formatLocalIsoDate(new Date());
	}
	if (field.type === "string[]" || field.group === "images") {
		return null;
	}
	if (!field.defaultValue) {
		return null;
	}
	if (field.defaultValue.startsWith("\n")) {
		return field.defaultValue.trimStart();
	}
	return field.defaultValue;
}

function parseArrayInput(value: string): string[] {
	const normalized = value
		.trim()
		.replace(/^\[/, "")
		.replace(/\]$/, "")
		.replace(/\s+-\s+/g, "\n- ");

	if (!normalized) {
		return [];
	}

	return normalized
		.split(/[\n,，]+/)
		.map((part) => part.replace(/^\s*-\s*/, "").trim())
		.map(stripWrappingQuotes)
		.filter(Boolean);
}

function getClipboardImageFromData(data: DataTransfer | null): File | null {
	if (!data) {
		return null;
	}

	for (let index = 0; index < data.items.length; index += 1) {
		const item = data.items[index];
		if (item?.kind === "file" && item.type.startsWith("image/")) {
			return item.getAsFile();
		}
	}

	return null;
}

function stripWrappingQuotes(value: string): string {
	if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
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
