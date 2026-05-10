import {Editor, MarkdownFileInfo, Notice, Plugin} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {getUploadConfigurationIssue, uploadFile} from "../uploader";

export function registerPasteImageHandler(plugin: Plugin, getSettings: () => LCGWritingAssistantSettings): void {
	plugin.registerEvent(plugin.app.workspace.on("editor-paste", (evt, editor, info) => {
		void handlePaste(evt, editor, info, getSettings());
	}));
}

async function handlePaste(
	evt: ClipboardEvent,
	editor: Editor,
	info: MarkdownFileInfo,
	settings: LCGWritingAssistantSettings,
): Promise<void> {
	if (evt.defaultPrevented || !settings.cdnEnabled) {
		return;
	}

	const imageFile = getClipboardImage(evt);
	if (!imageFile) {
		return;
	}

	const configurationIssue = getUploadConfigurationIssue(settings);
	if (configurationIssue) {
		new Notice(`${configurationIssue} 已保留 Obsidian 默认粘贴。`, 8000);
		return;
	}

	evt.preventDefault();

	try {
		new Notice("正在上传剪贴板图片...");
		const result = await uploadClipboardImage(imageFile, info.file?.path, settings);
		editor.replaceSelection(`![${imageFile.name}](${result.url})`);
		new Notice("图片已上传并插入。");
	} catch (error) {
		new Notice(error instanceof Error ? error.message : "剪贴板图片上传失败。", 8000);
	}
}

function getClipboardImage(evt: ClipboardEvent): File | null {
	const items = evt.clipboardData?.items;
	if (!items) {
		return null;
	}

	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		if (item?.kind === "file" && item.type.startsWith("image/")) {
			return item.getAsFile();
		}
	}

	return null;
}

async function uploadClipboardImage(file: File, notePath: string | undefined, settings: LCGWritingAssistantSettings): Promise<{url: string}> {
	return uploadFile({
		data: await file.arrayBuffer(),
		fileName: file.name || "clipboard-image.png",
		contentType: file.type || "application/octet-stream",
		notePath,
	}, settings);
}
