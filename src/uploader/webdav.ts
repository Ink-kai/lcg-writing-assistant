import {requestUrl} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {UploadInput, UploadTarget} from "./types";
import {buildUploadTarget} from "./path";
import {t} from "../i18n";

export async function uploadToWebDav(input: UploadInput, settings: LCGWritingAssistantSettings): Promise<UploadTarget> {
	assertWebDavSettings(settings);
	const target = buildUploadTarget(input, settings);
	await ensureWebDavDirectories(settings, target.key);

	const response = await requestUrl({
		url: joinEndpoint(settings.webdavEndpoint, target.key),
		method: "PUT",
		contentType: target.contentType,
		body: input.data,
		headers: buildWebDavHeaders(settings),
		throw: false,
	});

	if (response.status < 200 || response.status >= 300) {
		throw new Error(t("uploader.webdavUploadFailed", {status: response.status, text: response.text}));
	}

	return target;
}

export async function deleteFromWebDav(key: string, settings: LCGWritingAssistantSettings): Promise<boolean> {
	assertWebDavSettings(settings);
	const response = await requestUrl({
		url: joinEndpoint(settings.webdavEndpoint, key),
		method: "DELETE",
		headers: buildWebDavHeaders(settings),
		throw: false,
	});
	return response.status >= 200 && response.status < 300;
}

async function ensureWebDavDirectories(settings: LCGWritingAssistantSettings, key: string): Promise<void> {
	const parts = key.split("/").slice(0, -1);
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const response = await requestUrl({
			url: joinEndpoint(settings.webdavEndpoint, current),
			method: "MKCOL",
			headers: buildWebDavHeaders(settings),
			throw: false,
		});

		if (response.status === 405 || response.status === 409) {
			continue;
		}

		if (response.status < 200 || response.status >= 300) {
			throw new Error(t("uploader.webdavCreateDirFailed", {path: current, status: response.status}));
		}
	}
}

function assertWebDavSettings(settings: LCGWritingAssistantSettings): void {
	if (!settings.webdavEndpoint.trim()) {
		throw new Error(t("uploader.webdavUrl"));
	}
	if (!settings.cdnBaseUrl.trim()) {
		throw new Error(t("uploader.publicUrlRequired"));
	}
}

function buildWebDavHeaders(settings: LCGWritingAssistantSettings): Record<string, string> {
	const headers: Record<string, string> = {};
	if (settings.webdavUsername || settings.webdavPassword) {
		headers.Authorization = `Basic ${btoa(`${settings.webdavUsername}:${settings.webdavPassword}`)}`;
	}
	return headers;
}

function joinEndpoint(endpoint: string, key: string): string {
	const base = endpoint.trim().replace(/\/+$/, "");
	const encodedKey = key
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");
	return `${base}/${encodedKey}`;
}
