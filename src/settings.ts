import {App, Notice, Plugin, PluginSettingTab, Setting} from "obsidian";
import {testUpload} from "./uploader";
import {applyParsedR2Credentials, parseR2Credentials} from "./uploader/r2-credentials";
import {UploadProvider, UploadTestResult} from "./uploader/types";
import {setLocale, t} from "./i18n";
import type {Locale} from "./i18n/types";

export interface LCGWritingAssistantSettings {
	triggerPhrase: string;
	language: Locale;
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
	language: "en-US",
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

type SettingsTabId = "general" | "cdn";

export function normalizeSettings(settings: LCGWritingAssistantSettings): LCGWritingAssistantSettings {
	// Apply saved language
	if (settings.language) {
		setLocale(settings.language);
	}
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
		this.renderCdnSettings(containerEl);
	}

	private renderTabs(containerEl: HTMLElement): void {
		const tabsEl = containerEl.createDiv({cls: "lcg-settings-tabs"});
		const tabs: Array<{id: SettingsTabId; labelKey: string}> = [
			{id: "general", labelKey: "settings.general"},
			{id: "cdn", labelKey: "settings.cdn"},
		];
		for (const tab of tabs) {
			const button = tabsEl.createEl("button", {
				cls: "lcg-settings-tab",
				text: t(tab.labelKey as keyof typeof t),
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
			.setName(t("settings.language"))
			.setDesc(t("settings.languageDesc"))
			.addDropdown((dropdown) => dropdown
				.addOption("en-US", t("settings.languageEn"))
				.addOption("zh-CN", t("settings.languageZh"))
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value as Locale;
					setLocale(this.plugin.settings.language);
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("settings.triggerPhrase"))
			.setDesc(t("settings.triggerPhraseDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.triggerPhrasePlaceholder"))
				.setValue(this.plugin.settings.triggerPhrase)
				.onChange(async (value) => {
					this.plugin.settings.triggerPhrase = value.trim() || DEFAULT_SETTINGS.triggerPhrase;
					await this.plugin.saveSettings();
				}));
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
			.setName(t("settings.uploadMethod"))
			.setDesc(t("settings.uploadMethodDesc"))
			.addDropdown((dropdown) => dropdown
				.addOption("none", t("settings.uploadMethodNone"))
				.addOption("cloudflare-r2", t("settings.cloudflare"))
				.addOption("webdav", t("settings.webdav"))
				.setValue(this.plugin.settings.cdnProvider)
				.onChange(async (value) => {
					this.plugin.settings.cdnProvider = value as LCGWritingAssistantSettings["cdnProvider"];
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("settings.publicUrl"))
			.setDesc(t("settings.publicUrlDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.publicUrlPlaceholder"))
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
			.setName(t("settings.testCdn"))
			.setDesc(t("settings.testCdnDesc"))
			.addButton((button) => button
				.setButtonText(t("settings.cdnTestButton"))
				.setCta()
				.onClick(async () => {
					button.setDisabled(true).setButtonText(t("settings.testing"));
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
	}

	private renderR2Settings(containerEl: HTMLElement): void {
		let pastedCredentials = "";

		new Setting(containerEl)
			.setName(t("settings.r2Credentials"))
			.setDesc(t("settings.r2CredentialsDesc"))
			.addTextArea((text) => {
				text.inputEl.rows = 6;
				text
					.setPlaceholder(t("settings.r2CredentialsPlaceholder"))
					.onChange((value) => {
						pastedCredentials = value;
					});
			})
			.addButton((button) => button
				.setButtonText(t("settings.parseAndFill"))
				.setCta()
				.onClick(async () => {
					const result = await parseR2Credentials(pastedCredentials);
					if (result.applied.length === 0) {
						new Notice(t("settings.noCredentialsFound"));
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
			.setName(t("settings.r2Endpoint"))
			.setDesc(t("settings.r2EndpointDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.r2EndpointPlaceholder"))
				.setValue(this.plugin.settings.r2AccountId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccountId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.r2Bucket"))
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
			.setName(t("settings.r2AccessKey"))
			.setDesc(t("settings.r2AccessKeyDesc"))
			.addText((text) => text
				.setPlaceholder(t("settings.r2AccessKeyPlaceholder"))
				.setValue(this.plugin.settings.r2AccessKeyId)
				.onChange(async (value) => {
					this.plugin.settings.r2AccessKeyId = value.trim();
					this.clearCdnTestStatus();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("settings.r2SecretKey"))
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
				.setPlaceholder(t("settings.webdavUrlPlaceholder"))
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
}

function formatUploadTestNotice(result: UploadTestResult): string {
	const publicAccess = result.publicAccess.checked
		? result.publicAccess.ok
			? t("settings.publicAccessOk")
			: t("settings.cdnPublicAccessFail", {status: String(result.publicAccess.status ?? "unknown")})
		: t("settings.publicAccessNotChecked");
	const cleanup = result.deleted ? t("settings.testFileDeleted") : t("settings.testFileNotDeleted");

	return [
		t("settings.cdnCheckComplete"),
		t("settings.testObjectUploaded"),
		result.publicAccess.ok ? `✓ ${publicAccess}` : `✗ ${publicAccess}`,
		result.deleted ? `✓ ${cleanup}` : `✗ ${cleanup}`,
		`${t("settings.url")} ${result.url}`,
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
