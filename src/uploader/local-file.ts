import {Notice, TFile, Vault} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {getUploadConfigurationIssue, uploadFile} from "./index";
import {t} from "../i18n";

export interface ImageUploadResult {
	markdownUrl: string;
	fileName: string;
	key: string;
	uploaded: boolean;
}

export async function uploadImageInput(
	input: File,
	notePath: string | undefined,
	settings: LCGWritingAssistantSettings,
): Promise<ImageUploadResult | null> {
	const configurationIssue = getUploadConfigurationIssue(settings);
	if (configurationIssue) {
		new Notice(t("uploader.localNotUpload", {issue: configurationIssue}), 8000);
		return null;
	}

	const result = await uploadFile({
		data: await input.arrayBuffer(),
		fileName: input.name || "image.png",
		contentType: input.type || "application/octet-stream",
		notePath,
	}, settings);

	return {
		markdownUrl: result.url,
		fileName: input.name || "image.png",
		key: result.key,
		uploaded: true,
	};
}

export async function readVaultImageFile(vault: Vault, file: TFile): Promise<File> {
	const data = await vault.readBinary(file);
	const type = getMimeType(file.extension);
	return new File([data], file.name, {type});
}

export function getClipboardImageFromEvent(evt: ClipboardEvent): File | null {
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

export function getImageFilesFromVault(vault: Vault): TFile[] {
	return vault.getFiles()
		.filter((file) => isImageExtension(file.extension))
		.sort((a, b) => a.path.localeCompare(b.path));
}

function isImageExtension(extension: string): boolean {
	return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(extension.toLowerCase());
}

function getMimeType(extension: string): string {
	switch (extension.toLowerCase()) {
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "gif":
			return "image/gif";
		case "webp":
			return "image/webp";
		case "svg":
			return "image/svg+xml";
		case "avif":
			return "image/avif";
		default:
			return "application/octet-stream";
	}
}
