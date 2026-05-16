import {Locale, Translations} from "./types";
import {zhCN} from "./zh-CN";
import {enUS} from "./en-US";

const translations: Record<Locale, Translations> = {
	"zh-CN": zhCN,
	"en-US": enUS,
};

// Detect system locale
function getSystemLocale(): Locale {
	const lang = navigator.language || "en-US";
	if (lang.startsWith("zh")) {
		return "zh-CN";
	}
	return "en-US";
}

// Current locale (can be changed)
let currentLocale: Locale = getSystemLocale();

export function setLocale(locale: Locale): void {
	currentLocale = locale;
}

export function getLocale(): Locale {
	return currentLocale;
}

/**
 * Translate a key with optional parameters
 * @param key Translation key (e.g., "panel.field.edit")
 * @param params Optional parameters for interpolation (e.g., {value: "xxx"})
 */
export function t(key: keyof Translations, params?: Record<string, string | number>): string {
	const locale = currentLocale;
	const dict = translations[locale] || translations["en-US"];
	let text = dict[key] || key;

	if (params) {
		for (const [paramKey, value] of Object.entries(params)) {
			text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
		}
	}

	return text;
}

// Export translations type for external use
export type {Translations};
