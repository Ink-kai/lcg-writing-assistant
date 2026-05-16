import {Plugin} from "obsidian";
import {LCGWritingAssistantSettings} from "./settings";

export function registerLCGCommands(plugin: Plugin, settings: LCGWritingAssistantSettings): void {
	// CDN upload is handled via paste handler and settings
	// No additional commands needed - all functionality is accessible through:
	// 1. /lcg slash menu (provided by LCGSlashSuggest)
	// 2. Settings tab for CDN configuration
}
