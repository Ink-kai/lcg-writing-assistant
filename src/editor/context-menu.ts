/* eslint-disable obsidianmd/ui/sentence-case */
import {Editor, MarkdownFileInfo, Menu, Plugin} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {FrontmatterAssistantModal} from "../ui/frontmatter-modal";

export function registerEditorContextMenu(plugin: Plugin, getSettings: () => LCGWritingAssistantSettings): void {
	plugin.registerEvent(plugin.app.workspace.on("editor-menu", (menu, editor, info) => {
		addLCGMenuEntry(plugin, menu, editor, info, getSettings());
	}));
}

function addLCGMenuEntry(
	plugin: Plugin,
	menu: Menu,
	editor: Editor,
	info: MarkdownFileInfo,
	settings: LCGWritingAssistantSettings,
): void {
	menu.addSeparator();

	menu.addItem((item) => item
		.setTitle("LCG写作助手")
		.setIcon("file-pen-line")
		.onClick(() => {
			new FrontmatterAssistantModal(plugin.app, editor, settings, info.file?.path).open();
		}));
}
