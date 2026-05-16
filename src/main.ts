import {Notice, Plugin} from "obsidian";
import {registerLCGCommands} from "./commands";
import {registerEditorContextMenu} from "./editor/context-menu";
import {LCGSlashSuggest} from "./editor/lcg-slash-suggest";
import {registerPasteImageHandler} from "./editor/paste-image";
import {DEFAULT_SETTINGS, LCGSettingTab, LCGWritingAssistantSettings, normalizeSettings} from "./settings";
import {LCGPanelView, LCG_PANEL_VIEW_TYPE, openPanel} from "./panel/view";

export default class LCGWritingAssistantPlugin extends Plugin {
	settings: LCGWritingAssistantSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerEditorSuggest(new LCGSlashSuggest(this.app, () => this.settings));
		registerLCGCommands(this, this.settings);
		registerEditorContextMenu(this, () => this.settings);
		registerPasteImageHandler(this, () => this.settings);

		this.registerView(LCG_PANEL_VIEW_TYPE, (leaf) => new LCGPanelView(leaf, this.app, this.settings));

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon("panel-stats", "LCG Panel", () => {
			openPanel(this.app);
		});

		this.addCommand({
			id: "open-lcg-panel",
			name: "Open lcg panel",
			callback: () => openPanel(this.app),
		});

		this.addSettingTab(new LCGSettingTab(this.app, this));

		new Notice("Lcg writing assistant loaded! Type /lcg to get started.");
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LCGWritingAssistantSettings>));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
