import {requestUrl} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";
import {buildUploadTarget} from "./path";
import {UploadInput, UploadTarget} from "./types";
import {t} from "../i18n";

const SERVICE = "s3";
const REGION = "auto";
const EMPTY_BODY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export async function uploadToR2(input: UploadInput, settings: LCGWritingAssistantSettings): Promise<UploadTarget> {
	assertR2Settings(settings);
	const target = buildUploadTarget(input, settings);
	const url = buildR2ObjectUrl(settings, target.key);
	const headers = await signR2Request({
		method: "PUT",
		url,
		contentType: target.contentType,
		payloadHash: await sha256Hex(input.data),
		settings,
	});

	const response = await requestUrl({
		url,
		method: "PUT",
		contentType: target.contentType,
		body: input.data,
		headers,
		throw: false,
	});

	if (response.status < 200 || response.status >= 300) {
		throw new Error(t("uploader.r2UploadFailed", {status: response.status, text: response.text}));
	}

	return target;
}

export async function deleteFromR2(key: string, settings: LCGWritingAssistantSettings): Promise<boolean> {
	assertR2Settings(settings);
	const url = buildR2ObjectUrl(settings, key);
	const headers = await signR2Request({
		method: "DELETE",
		url,
		payloadHash: EMPTY_BODY_HASH,
		settings,
	});
	const response = await requestUrl({
		url,
		method: "DELETE",
		headers,
		throw: false,
	});
	return response.status >= 200 && response.status < 300;
}

function assertR2Settings(settings: LCGWritingAssistantSettings): void {
	if (!settings.r2AccountId.trim()) {
		throw new Error(t("uploader.r2AccountId"));
	}
	if (!settings.r2Bucket.trim()) {
		throw new Error(t("uploader.r2Bucket"));
	}
	if (!settings.r2AccessKeyId.trim()) {
		throw new Error(t("uploader.r2AccessKeyId"));
	}
	if (!settings.r2SecretAccessKey.trim()) {
		throw new Error(t("uploader.r2SecretAccessKey"));
	}
	if (!settings.cdnBaseUrl.trim()) {
		throw new Error(t("uploader.publicUrlRequired"));
	}
}

function buildR2ObjectUrl(settings: LCGWritingAssistantSettings, key: string): string {
	const accountId = encodeURIComponent(settings.r2AccountId.trim());
	const bucket = encodeURIComponent(settings.r2Bucket.trim());
	const encodedKey = key
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");
	return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
}

async function signR2Request(options: {
	method: string;
	url: string;
	contentType?: string;
	payloadHash: string;
	settings: LCGWritingAssistantSettings;
}): Promise<Record<string, string>> {
	const url = new URL(options.url);
	const now = new Date();
	const amzDate = toAmzDate(now);
	const dateStamp = amzDate.slice(0, 8);
	const headers: Record<string, string> = {
		host: url.host,
		"x-amz-content-sha256": options.payloadHash,
		"x-amz-date": amzDate,
	};

	if (options.contentType) {
		headers["content-type"] = options.contentType;
	}

	const signedHeaders = Object.keys(headers).sort().join(";");
	const canonicalHeaders = Object.keys(headers)
		.sort()
		.map((key) => `${key}:${normalizeHeaderValue(headers[key] ?? "")}\n`)
		.join("");
	const canonicalRequest = [
		options.method,
		url.pathname,
		url.searchParams.toString(),
		canonicalHeaders,
		signedHeaders,
		options.payloadHash,
	].join("\n");

	const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		await sha256Hex(canonicalRequest),
	].join("\n");
	const signingKey = await getSignatureKey(options.settings.r2SecretAccessKey, dateStamp);
	const signature = await hmacHex(signingKey, stringToSign);
	const requestHeaders = {...headers};
	delete requestHeaders.host;

	return {
		...requestHeaders,
		Authorization: [
			`AWS4-HMAC-SHA256 Credential=${options.settings.r2AccessKeyId}/${credentialScope}`,
			`SignedHeaders=${signedHeaders}`,
			`Signature=${signature}`,
		].join(", "),
	};
}

function normalizeHeaderValue(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

function toAmzDate(date: Date): string {
	return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function getSignatureKey(secretAccessKey: string, dateStamp: string): Promise<ArrayBuffer> {
	const dateKey = await hmacBytes(`AWS4${secretAccessKey}`, dateStamp);
	const regionKey = await hmacBytes(dateKey, REGION);
	const serviceKey = await hmacBytes(regionKey, SERVICE);
	return hmacBytes(serviceKey, "aws4_request");
}

async function sha256Hex(value: string | ArrayBuffer): Promise<string> {
	const data = typeof value === "string" ? new TextEncoder().encode(value) : value;
	const digest = await crypto.subtle.digest("SHA-256", data);
	return bufferToHex(digest);
}

async function hmacBytes(key: string | ArrayBuffer, value: string): Promise<ArrayBuffer> {
	const cryptoKey = await importHmacKey(key);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
	return signature;
}

async function hmacHex(key: string | ArrayBuffer, value: string): Promise<string> {
	return bufferToHex(await hmacBytes(key, value));
}

async function importHmacKey(key: string | ArrayBuffer): Promise<CryptoKey> {
	const rawKey = typeof key === "string" ? new TextEncoder().encode(key) : key;
	return crypto.subtle.importKey("raw", rawKey, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
}

function bufferToHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}
