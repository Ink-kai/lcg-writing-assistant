export type UploadProvider = "none" | "cloudflare-r2" | "webdav";

export interface UploadInput {
	data: ArrayBuffer;
	fileName: string;
	contentType: string;
	notePath?: string;
	now?: Date;
}

export interface UploadResult {
	url: string;
	key: string;
}

export interface UploadTarget {
	key: string;
	publicUrl: string;
	contentType: string;
}

export interface UploadTestResult {
	url: string;
	key: string;
	deleted: boolean;
	publicAccess: {
		checked: boolean;
		ok: boolean;
		status?: number;
	};
}
