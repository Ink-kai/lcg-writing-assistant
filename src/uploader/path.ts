import {normalizePath} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {UploadInput, UploadTarget} from "./types";

const DEFAULT_EXTENSION = "bin";

export function buildUploadTarget(input: UploadInput, settings: LCGWritingAssistantSettings): UploadTarget {
	const now = input.now ?? new Date();
	const prefix = normalizePrefix(settings.cdnPathPrefix);
	const noteSlug = slugify(getNoteBaseName(input.notePath) ?? "untitled");
	const extension = getExtension(input.fileName, input.contentType);
	const unique = `${formatDate(now)}-${formatTime(now)}-${randomSuffix()}`;
	const key = normalizePath(`${prefix}${formatDatePath(now)}/${noteSlug}-${unique}.${extension}`);

	return {
		key,
		publicUrl: joinUrl(settings.cdnBaseUrl, key),
		contentType: input.contentType || "application/octet-stream",
	};
}

export function buildTestUploadInput(): UploadInput {
	const data = new TextEncoder().encode(`LCG CDN upload test ${new Date().toISOString()}`).buffer;
	return {
		data,
		fileName: "lcg-cdn-test.txt",
		contentType: "text/plain; charset=utf-8",
		notePath: "lcg-cdn-test.md",
	};
}

export function normalizePrefix(prefix: string): string {
	const normalized = normalizePath(prefix.trim());
	if (!normalized || normalized === "/") {
		return "";
	}
	return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

export function joinUrl(baseUrl: string, key: string): string {
	const trimmedBase = baseUrl.trim().replace(/\/+$/, "");
	const encodedKey = key
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");
	return `${trimmedBase}/${encodedKey}`;
}

export function getExtension(fileName: string, contentType: string): string {
	const fromName = fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
	if (fromName) {
		return sanitizeExtension(fromName);
	}

	const mime = contentType.toLowerCase().split(";")[0]?.trim();
	if (mime === "image/jpeg") {
		return "jpg";
	}
	if (mime === "image/png") {
		return "png";
	}
	if (mime === "image/gif") {
		return "gif";
	}
	if (mime === "image/webp") {
		return "webp";
	}
	if (mime === "image/svg+xml") {
		return "svg";
	}
	if (mime === "text/plain") {
		return "txt";
	}
	return DEFAULT_EXTENSION;
}

function getNoteBaseName(notePath: string | undefined): string | null {
	if (!notePath) {
		return null;
	}
	const fileName = notePath.split("/").pop();
	if (!fileName) {
		return null;
	}
	return fileName.replace(/\.[^.]+$/, "");
}

function slugify(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "untitled";
}

function sanitizeExtension(value: string): string {
	const sanitized = value.replace(/[^a-z0-9]/g, "");
	return sanitized || DEFAULT_EXTENSION;
}

function formatDatePath(date: Date): string {
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}`;
}

function formatDate(date: Date): string {
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function formatTime(date: Date): string {
	return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

function randomSuffix(): string {
	const values = new Uint8Array(4);
	crypto.getRandomValues(values);
	return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}
