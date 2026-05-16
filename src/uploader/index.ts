import {requestUrl} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {buildTestUploadInput} from "./path";
import {deleteFromR2, uploadToR2} from "./r2";
import {UploadInput, UploadResult, UploadTestResult} from "./types";
import {deleteFromWebDav, uploadToWebDav} from "./webdav";
import {t} from "../i18n";

export async function uploadFile(input: UploadInput, settings: LCGWritingAssistantSettings): Promise<UploadResult> {
	const configurationIssue = getUploadConfigurationIssue(settings);
	if (configurationIssue) {
		throw new Error(configurationIssue);
	}

	if (settings.cdnProvider === "cloudflare-r2") {
		const target = await uploadToR2(input, settings);
		return {
			key: target.key,
			url: target.publicUrl,
		};
	}

	if (settings.cdnProvider === "webdav") {
		const target = await uploadToWebDav(input, settings);
		return {
			key: target.key,
			url: target.publicUrl,
		};
	}

	throw new Error(t("uploader.selectMethod"));
}

export function getUploadConfigurationIssue(settings: LCGWritingAssistantSettings): string | null {
	if (!settings.cdnEnabled) {
		return t("uploader.notEnabled");
	}

	if (settings.cdnProvider === "none") {
		return t("uploader.selectMethod");
	}

	if (!settings.cdnBaseUrl.trim()) {
		return t("uploader.publicUrlRequired");
	}

	if (settings.cdnProvider === "cloudflare-r2") {
		if (!settings.r2AccountId.trim()) {
			return t("uploader.r2AccountId");
		}
		if (!settings.r2Bucket.trim()) {
			return t("uploader.r2Bucket");
		}
		if (!settings.r2AccessKeyId.trim()) {
			return t("uploader.r2AccessKeyId");
		}
		if (!settings.r2SecretAccessKey.trim()) {
			return t("uploader.r2SecretAccessKey");
		}
	}

	if (settings.cdnProvider === "webdav" && !settings.webdavEndpoint.trim()) {
		return t("uploader.webdavUrl");
	}

	return null;
}

export async function testUpload(settings: LCGWritingAssistantSettings): Promise<UploadTestResult> {
	const result = await uploadFile(buildTestUploadInput(), settings);
	const publicAccess = await testPublicAccess(result.url);
	let deleted = false;

	if (settings.cdnProvider === "cloudflare-r2") {
		deleted = await deleteFromR2(result.key, settings);
	} else if (settings.cdnProvider === "webdav") {
		deleted = await deleteFromWebDav(result.key, settings);
	}

	return {
		key: result.key,
		url: result.url,
		deleted,
		publicAccess,
	};
}

async function testPublicAccess(url: string): Promise<UploadTestResult["publicAccess"]> {
	if (!url.trim()) {
		return {
			checked: false,
			ok: false,
		};
	}

	const response = await requestUrl({
		url,
		method: "GET",
		throw: false,
	});

	return {
		checked: true,
		ok: response.status >= 200 && response.status < 300,
		status: response.status,
	};
}
