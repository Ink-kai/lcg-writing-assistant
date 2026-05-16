import {Plugin} from "obsidian";
import {registerLCGCommands} from "./commands";
import {LCGSlashSuggest} from "./editor/lcg-slash-suggest";
import {registerPasteImageHandler} from "./editor/paste-image";
import {DEFAULT_SETTINGS, LCGSettingTab, LCGWritingAssistantSettings, normalizeSettings} from "./settings";

export default class LCGWritingAssistantPlugin extends Plugin {
	settings: LCGWritingAssistantSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerEditorSuggest(new LCGSlashSuggest(this.app, () => this.settings));
		registerLCGCommands(this, this.settings);
		registerPasteImageHandler(this, () => this.settings);

		this.addSettingTab(new LCGSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LCGWritingAssistantSettings>));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
