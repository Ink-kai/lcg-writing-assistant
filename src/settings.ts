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
import {t} from "./i18n";

export interface LCGWritingAssistantSettings {
	triggerPhrase: string;
	autoCreateFrontmatter: boolean;
	autoOpenPanel: boolean;
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
	autoOpenPanel: false,
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
	{id: "general", label: t("settings.general")},
	{id: "cdn", label: t("settings.cdn")},
	{id: "frontmatter", label: t("settings.frontmatter")},
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
			.setName("Trigger phrase")
			.setDesc("Default is /lcg to avoid conflicts with Obsidian's native / menu.")
			.addText((text) => text
				.setPlaceholder("/lcg")
				.setValue(this.plugin.settings.triggerPhrase)
				.onChange(async (value) => {
					this.plugin.settings.triggerPhrase = value.trim() || DEFAULT_SETTINGS.triggerPhrase;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Auto-create front matter")
			.setDesc("When current note has no front matter, inserting fields will first create a YAML block.")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.autoCreateFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.autoCreateFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.autoOpenPanel"))
			.setDesc(t("settings.autoOpenPanelDesc"))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.autoOpenPanel)
				.onChange(async (value) => {
					this.plugin.settings.autoOpenPanel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Show advanced fields")
			.setDesc("Show low-frequency fields like author, password, repost, _build in /lcg menu and field descriptions.")
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
			.setName(t("settings.imageUpload"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("settings.pasteImage"))
			.setDesc(t("settings.pasteImageDesc"))
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
			.setName("Upload method")
			.setDesc("Object storage uses S3-compatible API; WEBDAV uses mkcol and put.")
			.addDropdown((dropdown) => dropdown
				.addOption("none", "Do not upload")
				.addOption("cloudflare-r2", "Cloudflare r2")
				.addOption("webdav", "WEBDAV")
				.setValue(this.plugin.settings.cdnProvider)
				.onChange(async (value) => {
					this.plugin.settings.cdnProvider = value as LCGWritingAssistantSettings["cdnProvider"];
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName("Public URL prefix")
			.setDesc("URL prefix written to Markdown after upload, e.g. https://cdn.example.com.")
			.addText((text) => text
				.setPlaceholder("https://cdn.example.com")
				.setValue(this.plugin.settings.cdnBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.cdnBaseUrl = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.uploadPathPrefix"))
			.setDesc(t("settings.uploadPathPrefixDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.uploadPathPrefixPlaceholder"))
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
			.setName("Test CDN upload")
			.setDesc("Upload a small text file then delete it to verify credentials, path, and public URL concatenation.")
			.addButton((button) => button
				.setButtonText("Test upload")
				.setCta()
				.onClick(async () => {
					button.setDisabled(true).setButtonText("Testing...");
					try {
						const result = await testUpload(this.plugin.settings);
						this.plugin.settings.cdnTestStatus = buildUploadTestStatus(result);
						await this.plugin.saveSettings();
						new Notice(formatUploadTestNotice(result), 12000);
					} catch (error) {
						const message = error instanceof Error ? error.message : t("settings.cdnTestFailed");
						this.plugin.settings.cdnTestStatus = {
							ok: false,
							message,
							checkedAt: new Date().toISOString(),
						};
						await this.plugin.saveSettings();
						new Notice(message, 10000);
					} finally {
						button.setDisabled(false).setButtonText(t("settings.cdnTestButton"));
						this.display();
					}
				}));

		this.renderCdnTestStatus(containerEl);
		this.renderSupportSection(containerEl);
	}

	private renderR2Settings(containerEl: HTMLElement): void {
		let pastedCredentials = "";

		new Setting(containerEl)
			.setName("Paste cloudflare r2 credentials")
			.setDesc("Paste account ID, cfat token, r2 endpoint/bucket, or r2 S3 credentials. Plugin only parses and fills, does not save the pasted text.")
			.addTextArea((text) => {
				text.inputEl.rows = 6;
				text
					.setPlaceholder("Account ID\ncfat_...\nhttps://<account_id>.r2.cloudflarestorage.com/<bucket>")
					.onChange((value) => {
						pastedCredentials = value;
					});
			})
			.addButton((button) => button
				.setButtonText("Parse and fill")
				.setCta()
				.onClick(async () => {
					const result = await parseR2Credentials(pastedCredentials);
					if (result.applied.length === 0) {
						new Notice("No r2 credentials detected.");
						return;
					}

					applyParsedR2Credentials(this.plugin.settings, result.credentials);
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
					const missing = result.missing.length > 0 ? `；${t("settings.r2CredentialsMissing", { fields: result.missing.join("、") })}` : "";
					const tokenNote = result.tokenDetected ? t("settings.r2DerivedFromToken") : "";
					new Notice(`${t("settings.r2CredentialsApplied", { fields: result.applied.join("、") })}${missing}${tokenNote}`, 10000);
					this.display();
				}));

		new Setting(containerEl)
			.setName("R2 endpoint account")
			.setDesc("Auto-parsed from r2 endpoint; usually no manual entry needed.")
			.addText((text) => text
				.setPlaceholder("Account ID")
				.setValue(this.plugin.settings.r2AccountId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccountId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 bucket")
			.setDesc(t("settings.r2EndpointDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.r2BucketPlaceholder"))
				.setValue(this.plugin.settings.r2Bucket)
				.onChange(async (value) => {
					this.plugin.settings.r2Bucket = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 access key ID")
			.setDesc("Auto-fetched via server-side validation when using cfat token.")
			.addText((text) => text
				.setPlaceholder("Access key ID")
				.setValue(this.plugin.settings.r2AccessKeyId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccessKeyId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("R2 secret access key")
			.setDesc(t("settings.r2DerivedFromToken"))
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder(t("settings.r2AccessKeyPlaceholder"))
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
			.setName(t("settings.webdavUrl"))
			.setDesc(t("settings.webdavUrlDesc"))
			.addText((text) => text
				.setPlaceholder("https://dav.example.com/blog-assets")
				.setValue(this.plugin.settings.webdavEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.webdavEndpoint = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.webdavUsername"))
			.setDesc(t("settings.webdavUsernameDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.webdavUsernamePlaceholder"))
				.setValue(this.plugin.settings.webdavUsername)
				.onChange(async (value) => {
					this.plugin.settings.webdavUsername = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.webdavPassword"))
			.setDesc(t("settings.webdavPasswordDesc"))
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder(t("settings.webdavPasswordPlaceholder"))
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
			.setName("Front matter field descriptions")
			.setHeading();

		const description = containerEl.createDiv({cls: "lcg-settings-note"});
		description.setText("Browse hugo/fixit field descriptions while writing in Obsidian. Enable \"add to template\" to include fields in the insert template.");

		const toolbar = containerEl.createDiv({cls: "lcg-template-toolbar"});
		const selectedCount = toolbar.createSpan({
			cls: "lcg-template-toolbar__count",
			text: `t("settings.templateSelected", {count: this.plugin.settings.frontmatterTemplateFieldKeys.length})`,
		});
		this.createButton(toolbar, "Reset to recommended", async () => {
			this.plugin.settings.frontmatterTemplateFieldKeys = [...DEFAULT_TEMPLATE_FIELD_KEYS];
			await this.plugin.saveSettings();
			this.display();
		});
		this.createButton(toolbar, "Keep required only", async () => {
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
		this.createInlineButton(actions, "Select all", async (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			await this.setTemplateFields(fields.map((field) => field.key), true, selectedCount);
			this.display();
		});
		this.createInlineButton(actions, "Deselect", async (evt) => {
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
		this.createBadge(badges, field.required ? t("settings.fieldRequired") : t("settings.fieldOptional"));
		this.createBadge(badges, FRONTMATTER_SOURCE_LABELS[field.source]);
		if (field.deprecated) {
			this.createBadge(badges, t("settings.fieldDeprecated"), "is-warning");
		}
		const templateStatus = this.createTemplateStatus(badges, isSelected);

		card.createDiv({cls: "lcg-field-card__description", text: field.description});
		if (field.example) {
			card.createDiv({cls: "lcg-field-card__example", text: `t("settings.fieldExample", {example: field.example})`});
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
		templateStatus.find(".lcg-field-card__template-text")?.setText(isSelected ? t("settings.fieldInTemplate") : t("settings.fieldNotInTemplate"));
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
		selectedCount.setText(t("settings.templateSelected", {count: this.plugin.settings.frontmatterTemplateFieldKeys.length}));
		await this.plugin.saveSettings();
	}

	private isTemplateFieldSelected(key: string): boolean {
		return this.plugin.settings.frontmatterTemplateFieldKeys.includes(key);
	}

	private formatGroupSelectionCount(fields: FrontmatterFieldDefinition[]): string {
		const total = fields.length;
		const selectedKeys = new Set(this.plugin.settings.frontmatterTemplateFieldKeys);
		const selected = fields.filter((field) => selectedKeys.has(field.key)).length;
		return t("settings.totalSelected", {total, selected, unchecked: total - selected});
	}

	private updateGroupSelectionCount(countEl: HTMLElement, fields: FrontmatterFieldDefinition[]): void {
		countEl.setText(this.formatGroupSelectionCount(fields));
	}

	private updateFieldCardA11y(card: HTMLElement, field: FrontmatterFieldDefinition, isSelected: boolean): void {
		card.setAttr("role", "checkbox");
		card.setAttr("tabindex", "0");
		card.setAttr("aria-checked", String(isSelected));
		card.setAttr("aria-label", `${field.label}，${isSelected ? t("settings.fieldInTemplate") : t("settings.fieldNotInTemplate")}，${t("settings.fieldCardToggleHint")}`);
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
				text: t("settings.cdnTestPending"),
			});
			return;
		}

		const statusEl = containerEl.createDiv({
			cls: `lcg-cdn-test-status ${status.ok ? "is-success" : "is-error"}`,
		});
		statusEl.createDiv({text: status.ok ? t("settings.cdnTestSuccess") : t("settings.cdnTestFailed")});
		statusEl.createDiv({
			cls: "lcg-cdn-test-status__detail",
			text: `${formatLocalDateTime(status.checkedAt)} · ${status.message}`,
		});
	}

	private clearCdnTestStatus(): void {
		this.plugin.settings.cdnTestStatus = null;
	}

	private renderSupportSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({cls: "lcg-support-section"});

		const label = section.createDiv({cls: "lcg-support-section__label"});
		label.setText("Support the project");

		const text = section.createDiv({cls: "lcg-support-section__text"});
		text.setText("Lcg writing assistant is a free open-source plugin. If it saves you time writing and publishing, consider sponsoring or checking out the pro roadmap.");

		const buttons = section.createDiv({cls: "lcg-support-section__buttons"});

		// Intentional: anchor element displayed but no click handler needed
		buttons.createEl("a", {
			cls: "lcg-support-section__btn",
			text: t("settings.afdian"),
			attr: {href: "https://afdian.net/@Ink-kai", target: "_blank", rel: "noopener"},
		});

		const proButton = buttons.createEl("button", {
			cls: "lcg-support-section__btn",
			text: "Learn about pro",
			attr: {type: "button"},
		});
		proButton.addEventListener("click", () => {
			new Notice("Pro roadmap coming soon!", 5000);
		});
	}
}

function formatUploadTestNotice(result: UploadTestResult): string {
	const publicAccess = result.publicAccess.checked
		? result.publicAccess.ok
			? "Public URL accessible"
			: `Public URL not accessible (HTTP ${result.publicAccess.status ?? "unknown"})`
		: "Public URL not checked";
	const cleanup = result.deleted ? "Test file deleted" : "Test file uploaded but auto-delete failed";

	return [
		"CDN configuration check complete:",
		"✓ Test object uploaded",
		result.publicAccess.ok ? `✓ ${publicAccess}` : `✗ ${publicAccess}`,
		result.deleted ? `✓ ${cleanup}` : `✗ ${cleanup}`,
		`URL: ${result.url}`,
	].join("\n");
}

function buildUploadTestStatus(result: UploadTestResult): UploadTestStatus {
	const publicAccess = result.publicAccess.checked
		? result.publicAccess.ok
			? t("settings.cdnPublicAccessOk")
			: t("settings.cdnPublicAccessFail", {status: result.publicAccess.status ?? "unknown"})
		: t("settings.cdnPublicAccessNotChecked");
	const cleanup = result.deleted ? t("settings.cdnTestFileDeleted") : t("settings.cdnTestFileNotDeleted");
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
