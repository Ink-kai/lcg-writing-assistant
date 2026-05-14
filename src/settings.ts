import {App, Notice, Plugin, PluginSettingTab, Setting} from "obsidian";
import {
	DEFAULT_TEMPLATE_FIELD_KEYS,
	FRONTMATTER_GROUP_LABELS,
	FRONTMATTER_SOURCE_LABELS,
	LCG_FRONTMATTER_FIELDS,
} from "./frontmatter/schema";
import {FrontmatterFieldDefinition} from "./frontmatter/types";
import {testUpload} from "./uploader";
import {applyParsedR2Credentials, parseR2Credentials} from "./uploader/r2-credentials";
import {UploadProvider, UploadTestResult} from "./uploader/types";

export interface LCGWritingAssistantSettings {
	triggerPhrase: string;
	autoCreateFrontmatter: boolean;
	showAdvancedFields: boolean;
	frontmatterTemplateFieldKeys: string[];
	cdnEnabled: boolean;
	cdnProvider: UploadProvider;
	cdnBaseUrl: string;
	cdnPathPrefix: string;
	r2AccountId: string;
	r2Bucket: string;
	r2AccessKeyId: string;
	r2SecretAccessKey: string;
	webdavEndpoint: string;
	webdavUsername: string;
	webdavPassword: string;
	cdnTestStatus: UploadTestStatus | null;
}

interface UploadTestStatus {
	ok: boolean;
	message: string;
	checkedAt: string;
}

export const DEFAULT_SETTINGS: LCGWritingAssistantSettings = {
	triggerPhrase: "/lcg",
	autoCreateFrontmatter: true,
	showAdvancedFields: false,
	frontmatterTemplateFieldKeys: [...DEFAULT_TEMPLATE_FIELD_KEYS],
	cdnEnabled: false,
	cdnProvider: "none",
	cdnBaseUrl: "",
	cdnPathPrefix: "images",
	r2AccountId: "",
	r2Bucket: "",
	r2AccessKeyId: "",
	r2SecretAccessKey: "",
	webdavEndpoint: "",
	webdavUsername: "",
	webdavPassword: "",
	cdnTestStatus: null,
};

export type SettingsHost = Plugin & {
	settings: LCGWritingAssistantSettings;
	saveSettings(): Promise<void>;
};

type SettingsTabId = "general" | "cdn" | "frontmatter";

const SETTINGS_TABS: Array<{id: SettingsTabId; label: string}> = [
	{id: "general", label: "基础"},
	{id: "cdn", label: "图片上传"},
	{id: "frontmatter", label: "字段说明"},
];

export function normalizeSettings(settings: LCGWritingAssistantSettings): LCGWritingAssistantSettings {
	settings.frontmatterTemplateFieldKeys = normalizeTemplateFieldKeys(settings.frontmatterTemplateFieldKeys);
	if (!settings.cdnEnabled) {
		clearCdnSettings(settings);
	}
	return settings;
}

export class LCGSettingTab extends PluginSettingTab {
	private readonly plugin: SettingsHost;
	private activeTab: SettingsTabId = "general";

	constructor(app: App, plugin: SettingsHost) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.renderTabs(containerEl);
		if (this.activeTab === "general") {
			this.renderGeneralSettings(containerEl);
			return;
		}
		if (this.activeTab === "cdn") {
			this.renderCdnSettings(containerEl);
			return;
		}
		this.renderFrontmatterReference(containerEl);
	}

	private renderTabs(containerEl: HTMLElement): void {
		const tabsEl = containerEl.createDiv({cls: "lcg-settings-tabs"});
		for (const tab of SETTINGS_TABS) {
			const button = tabsEl.createEl("button", {
				cls: "lcg-settings-tab",
				text: tab.label,
				attr: {
					type: "button",
					"aria-pressed": String(tab.id === this.activeTab),
				},
			});
			button.toggleClass("is-active", tab.id === this.activeTab);
			button.addEventListener("click", () => {
				this.activeTab = tab.id;
				this.display();
			});
		}
	}

	private renderGeneralSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("触发词")
			.setDesc("默认使用 /lcg，避免和 Obsidian 原生 / 菜单冲突。")
			.addText((text) => text
				.setPlaceholder("/lcg")
				.setValue(this.plugin.settings.triggerPhrase)
				.onChange(async (value) => {
					this.plugin.settings.triggerPhrase = value.trim() || DEFAULT_SETTINGS.triggerPhrase;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("自动创建 front matter")
			.setDesc("当前笔记没有 front matter 时，插入字段会先创建 YAML 区块。")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.autoCreateFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("显示高级字段")
			.setDesc("在 /lcg 菜单和字段说明里显示 author、password、repost、_build 等低频字段。")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showAdvancedFields)
				.onChange(async (value) => {
					this.plugin.settings.showAdvancedFields = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		this.renderSupportSection(containerEl);
	}

	private renderCdnSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("图片上传")
			.setHeading();

		new Setting(containerEl)
			.setName("粘贴图片时上传到 CDN")
			.setDesc("开启后，剪贴板图片会先上传，再插入 Markdown 图片链接。关闭时完全交给 Obsidian 默认附件逻辑处理。")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.cdnEnabled)
				.onChange(async (value) => {
					this.plugin.settings.cdnEnabled = value;
					this.clearCdnTestStatus();
					if (!value) {
						clearCdnSettings(this.plugin.settings);
					}
					await this.plugin.saveSettings();
					this.display();
				}));

		if (!this.plugin.settings.cdnEnabled) {
			return;
		}

		new Setting(containerEl)
			.setName("上传方式")
			.setDesc("对象存储使用兼容 S3 的接口；WebDAV 使用 MKCOL 和 PUT。")
			.addDropdown((dropdown) => dropdown
				.addOption("none", "不上传")
				.addOption("cloudflare-r2", "Cloudflare R2")
				.addOption("webdav", "WebDAV")
				.setValue(this.plugin.settings.cdnProvider)
				.onChange(async (value) => {
					this.plugin.settings.cdnProvider = value as LCGWritingAssistantSettings["cdnProvider"];
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName("公开访问地址")
			.setDesc("上传完成后写入 Markdown 的 URL 前缀，例如 https://cdn.example.com。")
			.addText((text) => text
				.setPlaceholder("https://cdn.example.com")
				.setValue(this.plugin.settings.cdnBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.cdnBaseUrl = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("上传路径前缀")
			.setDesc("对象 key 的前缀，例如 images 或 posts/assets。最终会生成 年/月/文章名-时间.扩展名。")
			.addText((text) => text
				.setPlaceholder("Images")
				.setValue(this.plugin.settings.cdnPathPrefix)
				.onChange(async (value) => {
					this.plugin.settings.cdnPathPrefix = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		if (this.plugin.settings.cdnProvider === "cloudflare-r2") {
			this.renderR2Settings(containerEl);
		}

		if (this.plugin.settings.cdnProvider === "webdav") {
			this.renderWebDavSettings(containerEl);
		}

		new Setting(containerEl)
			.setName("测试 CDN 上传")
			.setDesc("上传一个很小的文本文件并尝试删除，用来验证凭据、路径和公开 URL 拼接。")
			.addButton((button) => button
				.setButtonText("测试上传")
				.setCta()
				.onClick(async () => {
					button.setDisabled(true).setButtonText("测试中...");
					try {
						const result = await testUpload(this.plugin.settings);
						this.plugin.settings.cdnTestStatus = buildUploadTestStatus(result);
						await this.plugin.saveSettings();
						new Notice(formatUploadTestNotice(result), 12000);
					} catch (error) {
						const message = error instanceof Error ? error.message : "CDN 测试失败。";
						this.plugin.settings.cdnTestStatus = {
							ok: false,
							message,
							checkedAt: new Date().toISOString(),
						};
						await this.plugin.saveSettings();
						new Notice(message, 10000);
					} finally {
						button.setDisabled(false).setButtonText("测试上传");
						this.display();
					}
				}));

		this.renderCdnTestStatus(containerEl);
		this.renderSupportSection(containerEl);
	}

	private renderR2Settings(containerEl: HTMLElement): void {
		let pastedCredentials = "";

		new Setting(containerEl)
			.setName("粘贴 Cloudflare R2 信息")
			.setDesc("粘贴账号编号、cfat token、R2 endpoint/bucket 或 R2 S3 凭据。插件只解析并填充，不保存粘贴原文。")
			.addTextArea((text) => {
				text.inputEl.rows = 6;
				text
					.setPlaceholder("Account ID\ncfat_...\nhttps://<account_id>.r2.cloudflarestorage.com/<bucket>")
					.onChange((value) => {
						pastedCredentials = value;
					});
			})
			.addButton((button) => button
				.setButtonText("解析并填充")
				.setCta()
				.onClick(async () => {
					const result = await parseR2Credentials(pastedCredentials);
					if (result.applied.length === 0) {
						new Notice("没有识别到 R2 凭据。");
						return;
					}

					applyParsedR2Credentials(this.plugin.settings, result.credentials);
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
					const missing = result.missing.length > 0 ? `；仍需补充：${result.missing.join("、")}` : "";
					const tokenNote = result.tokenDetected ? "；已从 cfat token 派生 S3 凭据，原始 token 未保存" : "";
					new Notice(`已填充：${result.applied.join("、")}${missing}${tokenNote}`, 10000);
					this.display();
				}));

		new Setting(containerEl)
			.setName("R2 endpoint 账号")
			.setDesc("从 R2 endpoint 自动解析；通常不需要手填。")
			.addText((text) => text
				.setPlaceholder("账号编号")
				.setValue(this.plugin.settings.r2AccountId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccountId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 bucket")
			.setDesc("从 endpoint 路径自动解析；也可以手动指定已有 bucket。")
			.addText((text) => text
				.setPlaceholder("存储桶名称")
				.setValue(this.plugin.settings.r2Bucket)
				.onChange(async (value) => {
					this.plugin.settings.r2Bucket = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 access key ID")
			.setDesc("使用 cfat token 时会通过服务端校验接口自动获取。")
			.addText((text) => text
				.setPlaceholder("访问密钥编号")
				.setValue(this.plugin.settings.r2AccessKeyId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccessKeyId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 secret access key")
			.setDesc("使用 cfat token 时会自动派生；原始 cfat token 不保存。")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("访问密钥")
					.setValue(this.plugin.settings.r2SecretAccessKey)
					.onChange(async (value) => {
						this.plugin.settings.r2SecretAccessKey = value.trim();
						this.clearCdnTestStatus();
						await this.plugin.saveSettings();
					});
			});
	}

	private renderWebDavSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("网页文件服务地址")
			.setDesc("远端目录地址，例如 https://dav.example.com/blog-assets。")
			.addText((text) => text
				.setPlaceholder("https://dav.example.com/blog-assets")
				.setValue(this.plugin.settings.webdavEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.webdavEndpoint = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("网页文件服务用户名")
			.setDesc("基本认证用户名；如果服务端不需要认证可留空。")
			.addText((text) => text
				.setPlaceholder("用户名")
				.setValue(this.plugin.settings.webdavUsername)
				.onChange(async (value) => {
					this.plugin.settings.webdavUsername = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("网页文件服务密码")
			.setDesc("基本认证密码或应用密码。")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("密码")
					.setValue(this.plugin.settings.webdavPassword)
					.onChange(async (value) => {
						this.plugin.settings.webdavPassword = value;
						this.clearCdnTestStatus();
						await this.plugin.saveSettings();
					});
			});
	}

	private renderFrontmatterReference(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Front matter 字段说明")
			.setHeading();

		const description = containerEl.createDiv({cls: "lcg-settings-note"});
		description.setText("用于 Obsidian 写作时查字段含义。字段来源是内置 Hugo/FixIt schema。勾选「加入模板」可将字段加入插入模板。");

		const toolbar = containerEl.createDiv({cls: "lcg-template-toolbar"});
		const selectedCount = toolbar.createSpan({
			cls: "lcg-template-toolbar__count",
			text: `模板已选 ${this.plugin.settings.frontmatterTemplateFieldKeys.length} 个字段`,
		});
		this.createButton(toolbar, "恢复推荐模板", async () => {
			this.plugin.settings.frontmatterTemplateFieldKeys = [...DEFAULT_TEMPLATE_FIELD_KEYS];
			await this.plugin.saveSettings();
			this.display();
		});
		this.createButton(toolbar, "仅保留必填字段", async () => {
			this.plugin.settings.frontmatterTemplateFieldKeys = LCG_FRONTMATTER_FIELDS
				.filter((field) => field.required)
				.map((field) => field.key);
			await this.plugin.saveSettings();
			this.display();
		});

		const groupsEl = containerEl.createDiv({cls: "lcg-frontmatter-groups"});
		for (const [groupLabel, fields] of this.getVisibleFieldsByGroup()) {
			this.renderFieldGroup(groupsEl, groupLabel, fields, selectedCount);
		}

		this.renderSupportSection(containerEl);
	}

	private renderFieldGroup(containerEl: HTMLElement, groupLabel: string, fields: FrontmatterFieldDefinition[], selectedCount: HTMLElement): void {
		const groupEl = containerEl.createEl("details", {cls: "lcg-frontmatter-reference__group"});
		groupEl.open = fields.some((field) => field.required) || groupLabel === FRONTMATTER_GROUP_LABELS.recommended;

		const header = groupEl.createEl("summary", {cls: "lcg-frontmatter-reference__group-header"});
		header.createDiv({cls: "lcg-frontmatter-reference__group-title", text: groupLabel});
		const meta = header.createDiv({cls: "lcg-frontmatter-reference__group-meta"});
		const groupCount = meta.createDiv({
			cls: "lcg-frontmatter-reference__group-count",
			text: this.formatGroupSelectionCount(fields),
		});
		const actions = meta.createDiv({cls: "lcg-frontmatter-reference__group-actions"});
		this.createInlineButton(actions, "全选", async (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			await this.setTemplateFields(fields.map((field) => field.key), true, selectedCount);
			this.display();
		});
		this.createInlineButton(actions, "取消", async (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			await this.setTemplateFields(fields.map((field) => field.key), false, selectedCount);
			this.display();
		});

		for (const field of fields) {
			this.renderFieldCard(groupEl, field, selectedCount, groupCount, fields);
		}
	}

	private getVisibleFieldsByGroup(): Array<[string, FrontmatterFieldDefinition[]]> {
		const groups = new Map<string, FrontmatterFieldDefinition[]>();
		for (const field of LCG_FRONTMATTER_FIELDS) {
			if (field.advanced && !this.plugin.settings.showAdvancedFields) {
				continue;
			}
			const groupLabel = FRONTMATTER_GROUP_LABELS[field.group];
			const fields = groups.get(groupLabel) ?? [];
			fields.push(field);
			groups.set(groupLabel, fields);
		}
		return Array.from(groups.entries());
	}

	private renderFieldCard(
		containerEl: HTMLElement,
		field: FrontmatterFieldDefinition,
		selectedCount: HTMLElement,
		groupCount: HTMLElement,
		groupFields: FrontmatterFieldDefinition[],
	): void {
		const isSelected = this.isTemplateFieldSelected(field.key);
		const card = containerEl.createDiv({cls: "lcg-field-card"});
		card.toggleClass("is-template-selected", isSelected);
		this.updateFieldCardA11y(card, field, isSelected);
		const header = card.createDiv({cls: "lcg-field-card__header"});
		const title = header.createDiv({cls: "lcg-field-card__title"});
		title.createSpan({cls: "lcg-field-card__label", text: field.label});
		title.createSpan({cls: "lcg-field-card__key", text: field.key});

		const badges = header.createDiv({cls: "lcg-field-card__badges"});
		this.createBadge(badges, field.type);
		this.createBadge(badges, field.required ? "必填" : "可选");
		this.createBadge(badges, FRONTMATTER_SOURCE_LABELS[field.source]);
		if (field.deprecated) {
			this.createBadge(badges, "兼容旧字段", "is-warning");
		}
		const templateStatus = this.createTemplateStatus(badges, isSelected);

		card.createDiv({cls: "lcg-field-card__description", text: field.description});
		if (field.example) {
			card.createDiv({cls: "lcg-field-card__example", text: `示例：${field.example}`});
		}

		const toggleTemplateField = async () => {
			const nextSelected = !this.isTemplateFieldSelected(field.key);
			await this.setTemplateFieldEnabled(field.key, nextSelected, selectedCount);
			const currentSelected = this.isTemplateFieldSelected(field.key);
			card.toggleClass("is-template-selected", currentSelected);
			this.updateFieldCardA11y(card, field, currentSelected);
			this.updateTemplateStatus(templateStatus, currentSelected);
			this.updateGroupSelectionCount(groupCount, groupFields);
		};
		card.addEventListener("click", (evt) => {
			const target = evt.target;
			if (target instanceof HTMLElement && target.closest("button, a, input, textarea, select")) {
				return;
			}
			void toggleTemplateField();
		});
		card.addEventListener("keydown", (evt) => {
			if (evt.key !== "Enter" && evt.key !== " ") {
				return;
			}
			evt.preventDefault();
			void toggleTemplateField();
		});
	}

	private createTemplateStatus(containerEl: HTMLElement, isSelected: boolean): HTMLElement {
		const templateStatus = containerEl.createEl("span", {cls: "lcg-field-card__template-status"});
		templateStatus.createSpan({cls: "lcg-field-card__template-check", text: "✓"});
		templateStatus.createSpan({cls: "lcg-field-card__template-text"});
		this.updateTemplateStatus(templateStatus, isSelected);
		return templateStatus;
	}

	private updateTemplateStatus(templateStatus: HTMLElement, isSelected: boolean): void {
		templateStatus.toggleClass("is-selected", isSelected);
		templateStatus.setAttr("aria-hidden", "true");
		templateStatus.find(".lcg-field-card__template-text")?.setText(isSelected ? "已加入模板" : "未加入模板");
	}

	private async setTemplateFieldEnabled(key: string, enabled: boolean, selectedCount: HTMLElement): Promise<void> {
		await this.setTemplateFields([key], enabled, selectedCount);
	}

	private async setTemplateFields(keysToChange: string[], enabled: boolean, selectedCount: HTMLElement): Promise<void> {
		const keys = new Set(this.plugin.settings.frontmatterTemplateFieldKeys);
		for (const key of keysToChange) {
			if (enabled) {
				keys.add(key);
			} else {
				keys.delete(key);
			}
		}
		this.plugin.settings.frontmatterTemplateFieldKeys = normalizeTemplateFieldKeys(Array.from(keys));
		selectedCount.setText(`模板已选 ${this.plugin.settings.frontmatterTemplateFieldKeys.length} 个字段`);
		await this.plugin.saveSettings();
	}

	private isTemplateFieldSelected(key: string): boolean {
		return this.plugin.settings.frontmatterTemplateFieldKeys.includes(key);
	}

	private formatGroupSelectionCount(fields: FrontmatterFieldDefinition[]): string {
		const total = fields.length;
		const selectedKeys = new Set(this.plugin.settings.frontmatterTemplateFieldKeys);
		const selected = fields.filter((field) => selectedKeys.has(field.key)).length;
		return `总共 ${total} · 已选中 ${selected} · 未勾选 ${total - selected}`;
	}

	private updateGroupSelectionCount(countEl: HTMLElement, fields: FrontmatterFieldDefinition[]): void {
		countEl.setText(this.formatGroupSelectionCount(fields));
	}

	private updateFieldCardA11y(card: HTMLElement, field: FrontmatterFieldDefinition, isSelected: boolean): void {
		card.setAttr("role", "checkbox");
		card.setAttr("tabindex", "0");
		card.setAttr("aria-checked", String(isSelected));
		card.setAttr("aria-label", `${field.label}，${isSelected ? "已加入模板" : "未加入模板"}，按回车或空格切换`);
	}

	private createInlineButton(containerEl: HTMLElement, text: string, onClick: (evt: MouseEvent) => void | Promise<void>): HTMLButtonElement {
		const button = containerEl.createEl("button", {
			cls: "lcg-inline-button",
			text,
			attr: {type: "button"},
		});
		button.addEventListener("click", (evt) => {
			void onClick(evt);
		});
		return button;
	}

	private createBadge(containerEl: HTMLElement, text: string, extraClass?: string): void {
		const classes = ["lcg-field-card__badge"];
		if (extraClass) {
			classes.push(extraClass);
		}
		containerEl.createSpan({cls: classes.join(" "), text});
	}

	private createButton(containerEl: HTMLElement, text: string, onClick: () => void | Promise<void>): HTMLButtonElement {
		const button = containerEl.createEl("button", {text});
		button.addEventListener("click", () => {
			void onClick();
		});
		return button;
	}

	private renderCdnTestStatus(containerEl: HTMLElement): void {
		const status = this.plugin.settings.cdnTestStatus;
		if (!status) {
			containerEl.createDiv({
				cls: "lcg-cdn-test-status",
				text: "尚未测试当前 CDN 配置。",
			});
			return;
		}

		const statusEl = containerEl.createDiv({
			cls: `lcg-cdn-test-status ${status.ok ? "is-success" : "is-error"}`,
		});
		statusEl.createDiv({text: status.ok ? "CDN 测试通过" : "CDN 测试失败"});
		statusEl.createDiv({
			cls: "lcg-cdn-test-status__detail",
			text: `${formatLocalDateTime(status.checkedAt)} · ${status.message}`,
		});
	}

	private clearCdnTestStatus(): void {
		this.plugin.settings.cdnTestStatus = null;
	}

	/* eslint-disable obsidianmd/ui/sentence-case */
	private renderSupportSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({cls: "lcg-support-section"});

		const label = section.createDiv({cls: "lcg-support-section__label"});
		label.setText("支持项目");

		const text = section.createDiv({cls: "lcg-support-section__text"});
		text.setText("LCG Writing Assistant 是免费开源插件。如果它节省了你的写作和发布时间，可以赞助项目或了解 Pro 路线图。");

		const buttons = section.createDiv({cls: "lcg-support-section__buttons"});

		// Intentional: anchor element displayed but no click handler needed
		buttons.createEl("a", {
			cls: "lcg-support-section__btn",
			text: "爱发电",
			attr: {href: "https://afdian.net/@Ink-kai", target: "_blank", rel: "noopener"},
		});

		const proButton = buttons.createEl("button", {
			cls: "lcg-support-section__btn",
			text: "了解 Pro",
			attr: {type: "button"},
		});
		proButton.addEventListener("click", () => {
			new Notice("Pro 路线图即将上线，敬请期待。", 5000);
		});
	}
}

function formatUploadTestNotice(result: UploadTestResult): string {
	const publicAccess = result.publicAccess.checked
		? result.publicAccess.ok
			? "公开 URL 可访问"
			: `公开 URL 不可访问（HTTP ${result.publicAccess.status ?? "unknown"}）`
		: "未检查公开 URL";
	const cleanup = result.deleted ? "测试文件已删除" : "测试文件上传成功，但自动删除失败";

	return [
		"CDN 配置检测完成：",
		"✓ 测试对象上传成功",
		result.publicAccess.ok ? `✓ ${publicAccess}` : `✗ ${publicAccess}`,
		result.deleted ? `✓ ${cleanup}` : `✗ ${cleanup}`,
		`URL: ${result.url}`,
	].join("\n");
}

function buildUploadTestStatus(result: UploadTestResult): UploadTestStatus {
	const publicAccess = result.publicAccess.checked
		? result.publicAccess.ok
			? "公开 URL 可访问"
			: `公开 URL 不可访问（HTTP ${result.publicAccess.status ?? "unknown"}）`
		: "未检查公开 URL";
	const cleanup = result.deleted ? "测试文件已删除" : "测试文件未删除";
	const ok = result.publicAccess.ok && result.deleted;
	return {
		ok,
		message: `${publicAccess}；${cleanup}`,
		checkedAt: new Date().toISOString(),
	};
}

function formatLocalDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	const pad = (part: number) => String(part).padStart(2, "0");
	return [
		date.getFullYear(),
		"-",
		pad(date.getMonth() + 1),
		"-",
		pad(date.getDate()),
		" ",
		pad(date.getHours()),
		":",
		pad(date.getMinutes()),
	].join("");
}

function clearCdnSettings(settings: LCGWritingAssistantSettings): void {
	settings.cdnProvider = "none";
	settings.cdnBaseUrl = "";
	settings.cdnPathPrefix = DEFAULT_SETTINGS.cdnPathPrefix;
	settings.r2AccountId = "";
	settings.r2Bucket = "";
	settings.r2AccessKeyId = "";
	settings.r2SecretAccessKey = "";
	settings.webdavEndpoint = "";
	settings.webdavUsername = "";
	settings.webdavPassword = "";
	settings.cdnTestStatus = null;
}

function normalizeTemplateFieldKeys(fieldKeys: string[] | undefined): string[] {
	if (!Array.isArray(fieldKeys)) {
		return [...DEFAULT_TEMPLATE_FIELD_KEYS];
	}

	const validKeys = new Set(LCG_FRONTMATTER_FIELDS.map((field) => field.key));
	const selectedKeys = new Set(fieldKeys.filter((key) => validKeys.has(key)));
	const normalized = LCG_FRONTMATTER_FIELDS
		.map((field) => field.key)
		.filter((key) => selectedKeys.has(key));

	return normalized;
}
