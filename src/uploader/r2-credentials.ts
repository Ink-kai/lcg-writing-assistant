import {requestUrl} from "obsidian";
import {LCGWritingAssistantSettings} from "../settings";

export interface ParsedR2Credentials {
	accountId?: string;
	bucket?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
	publicBaseUrl?: string;
	tokenValue?: string;
}

export interface R2CredentialParseResult {
	credentials: ParsedR2Credentials;
	missing: string[];
	applied: string[];
	tokenDetected: boolean;
}

const KEY_ALIASES: Record<string, keyof ParsedR2Credentials> = {
	account: "accountId",
	accountid: "accountId",
	account_id: "accountId",
	cloudflareaccountid: "accountId",
	r2accountid: "accountId",
	bucket: "bucket",
	bucketname: "bucket",
	r2bucket: "bucket",
	accesskeyid: "accessKeyId",
	awsaccesskeyid: "accessKeyId",
	access_key_id: "accessKeyId",
	aws_access_key_id: "accessKeyId",
	secretaccesskey: "secretAccessKey",
	awssecretaccesskey: "secretAccessKey",
	secret_access_key: "secretAccessKey",
	aws_secret_access_key: "secretAccessKey",
	publicbaseurl: "publicBaseUrl",
	publicurl: "publicBaseUrl",
	cdnbaseurl: "publicBaseUrl",
	cdnurl: "publicBaseUrl",
	token: "tokenValue",
	apitoken: "tokenValue",
	cloudflareapitoken: "tokenValue",
	r2token: "tokenValue",
};

export async function parseR2Credentials(text: string): Promise<R2CredentialParseResult> {
	const credentials: ParsedR2Credentials = {};
	parseJsonCredentials(text, credentials);
	const lines = text.split(/\r?\n/);

	for (const line of lines) {
		const parsed = parseKeyValueLine(line);
		if (!parsed) {
			continue;
		}
		const alias = KEY_ALIASES[normalizeKey(parsed.key)];
		if (alias && !credentials[alias]) {
			credentials[alias] = parsed.value;
		}
	}

	applyEndpointHints(text, credentials);
	applyThreeLineHints(lines, credentials);
	await deriveS3CredentialsFromToken(credentials);

	const missing = getMissingFields(credentials);
	const applied = getAppliedLabels(credentials);
	return {
		credentials,
		missing,
		applied,
		tokenDetected: Boolean(credentials.tokenValue),
	};
}

export function applyParsedR2Credentials(settings: LCGWritingAssistantSettings, credentials: ParsedR2Credentials): void {
	settings.cdnEnabled = true;
	settings.cdnProvider = "cloudflare-r2";
	if (credentials.accountId) {
		settings.r2AccountId = credentials.accountId;
	}
	if (credentials.bucket) {
		settings.r2Bucket = credentials.bucket;
	}
	if (credentials.accessKeyId) {
		settings.r2AccessKeyId = credentials.accessKeyId;
	}
	if (credentials.secretAccessKey) {
		settings.r2SecretAccessKey = credentials.secretAccessKey;
	}
	if (credentials.publicBaseUrl) {
		settings.cdnBaseUrl = credentials.publicBaseUrl;
	}
}

function parseKeyValueLine(line: string): {key: string; value: string} | null {
	const trimmed = line.trim().replace(/^[-*]\s*/, "");
	if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) {
		return null;
	}

	const match = trimmed.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
	if (!match) {
		return null;
	}

	const key = match[1]?.trim();
	const value = cleanValue(match[2] ?? "");
	if (!key || !value) {
		return null;
	}
	return {key, value};
}

function parseJsonCredentials(text: string, credentials: ParsedR2Credentials): void {
	try {
		const parsed = JSON.parse(text) as Record<string, unknown>;
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value !== "string") {
				continue;
			}
			const alias = KEY_ALIASES[normalizeKey(key)];
			if (alias && !credentials[alias]) {
				credentials[alias] = value;
			}
		}
	} catch {
		// Plain text paste is the common path; invalid JSON is expected.
	}
}

function applyEndpointHints(text: string, credentials: ParsedR2Credentials): void {
	const endpoint = text.match(/https:\/\/([a-z0-9]+)\.r2\.cloudflarestorage\.com(?:\/([a-zA-Z0-9._-]+))?/i);
	if (endpoint) {
		if (!credentials.accountId && endpoint[1]) {
			credentials.accountId = endpoint[1];
		}
		if (!credentials.bucket && endpoint[2]) {
			credentials.bucket = endpoint[2];
		}
	}
}

function applyThreeLineHints(lines: string[], credentials: ParsedR2Credentials): void {
	const values = lines
		.map((line) => cleanValue(line.replace(/^[-*]\s*/, "")))
		.filter(Boolean);

	for (const value of values) {
		if (!credentials.accountId && /^[a-f0-9]{32}$/i.test(value)) {
			credentials.accountId = value;
			continue;
		}

		if (!credentials.tokenValue && value.startsWith("cfat_")) {
			credentials.tokenValue = value;
		}
	}
}

async function deriveS3CredentialsFromToken(credentials: ParsedR2Credentials): Promise<void> {
	if (!credentials.tokenValue) {
		return;
	}

	if (!credentials.secretAccessKey) {
		credentials.secretAccessKey = await sha256Hex(credentials.tokenValue);
	}

	if (!credentials.accessKeyId && credentials.accountId) {
		credentials.accessKeyId = await verifyTokenAndGetId(credentials.accountId, credentials.tokenValue);
	}
}

async function verifyTokenAndGetId(accountId: string, tokenValue: string): Promise<string | undefined> {
	const response = await requestUrl({
		url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/tokens/verify`,
		method: "GET",
		headers: {
			Authorization: `Bearer ${tokenValue}`,
		},
		throw: false,
	});

	if (response.status < 200 || response.status >= 300) {
		return undefined;
	}

	const tokenId = readTokenId(response.json);
	if (tokenId) {
		return tokenId;
	}
	return undefined;
}

function readTokenId(value: unknown): string | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	const result = value.result;
	if (!isRecord(result) || typeof result.id !== "string") {
		return undefined;
	}
	return result.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanValue(value: string): string {
	return value
		.trim()
		.replace(/^["']|["']$/g, "")
		.replace(/,$/, "")
		.trim();
}

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[\s._-]+/g, "");
}

function getMissingFields(credentials: ParsedR2Credentials): string[] {
	const missing: string[] = [];
	if (!credentials.accountId) {
		missing.push("Account ID");
	}
	if (!credentials.bucket) {
		missing.push("bucket");
	}
	if (!credentials.accessKeyId) {
		missing.push("Access Key ID");
	}
	if (!credentials.secretAccessKey) {
		missing.push("Secret Access Key");
	}
	return missing;
}

function getAppliedLabels(credentials: ParsedR2Credentials): string[] {
	const labels: string[] = [];
	if (credentials.accountId) {
		labels.push("Account ID");
	}
	if (credentials.bucket) {
		labels.push("bucket");
	}
	if (credentials.accessKeyId) {
		labels.push("Access Key ID");
	}
	if (credentials.secretAccessKey) {
		labels.push("Secret Access Key");
	}
	if (credentials.publicBaseUrl) {
		labels.push("公开访问地址");
	}
	return labels;
}
