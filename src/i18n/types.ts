export type Locale = "zh-CN" | "en-US";

export interface Translations {
	// Commands
	"command.insertFrontmatter": string;
	"command.openFrontmatterEditor": string;
	"command.validateCurrentNote": string;
	"command.insertField": string; // {field}

	// Slash Suggest
	"slash.choose": string;
	"slash.insert": string;
	"slash.close": string;
	"slash.required": string;
	"slash.deprecated": string;
	"slash.frontmatterTemplate": string; // {count}
	"slash.frontmatterTemplateDesc": string;
	"slash.frontmatterEditor": string;
	"slash.frontmatterEditorDesc": string;
	"slash.validate": string;
	"slash.validateDesc": string;

	// Panel
	"panel.title": string;
	"panel.placeholder": string;
	"panel.placeholderHint": string;
	"panel.noFrontmatter": string;
	"panel.insertTemplate": string;
	"panel.frontMatter": string;

	// Panel - Pipeline
	"panel.pipeline.title": string;
	"panel.pipeline.validation": string;
	"panel.pipeline.convert": string; // {count}
	"panel.pipeline.allPassed": string;
	"panel.pipeline.errors": string; // {count}
	"panel.pipeline.warnings": string; // {count}

	// Panel - Field
	"panel.field.empty": string;
	"panel.field.edit": string;
	"panel.field.copy": string;
	"panel.field.jump": string;
	"panel.field.delete": string;

	// Panel - Actions
	"panel.action.copied": string; // {value}
	"panel.action.emptyValue": string;

	// Validation
	"validation.required": string;
	"validation.invalidDate": string;
	"validation.draft": string;
	"validation.missingFrontmatter": string;
	"validation.missingFields": string; // {key}
	"validation.arrayRecommended": string; // {key}
	"validation.deprecatedField": string; // {key}
	"validation.group.required": string;
	"validation.group.recommended": string;
	"validation.group.images": string;
	"validation.group.fixit": string;
	"validation.group.visibility": string;
	"validation.group.seo": string;
	"validation.group.advanced": string;
	"validation.group.external": string;
	"validation.group.compatibility": string;
	"validation.group.other": string;

	// Editor
	"editor.frontmatterExists": string;
	"editor.templateEmpty": string;
	"editor.noFrontmatterAutoCreate": string;
	"editor.fieldExists": string; // {key}
	"editor.noFieldsToWrite": string;

	// Modal
	"modal.frontmatterEditor": string;
	"modal.fieldHint": string;
	"modal.fillDefaults": string;
	"modal.fillRequiredDefaults": string;
	"modal.clearAll": string;
	"modal.now": string;
	"modal.select": string;
	"modal.selectImage": string; // {label}
	"modal.pasteUrl": string;
	"modal.enterToAdd": string;
	"modal.notUpdate": string;
	"modal.enable": string;
	"modal.disable": string;
	"modal.cancel": string;
	"modal.write": string;
	"modal.blockFormat": string;
	"modal.inlineFormat": string;
	"modal.lines": string; // {count}
	"modal.line": string; // {count}
	"modal.noDefaults": string;
	"modal.remove": string; // {value}
	"modal.uploading": string; // {label}
	"modal.notUploaded": string;
	"modal.uploadedAndFilled": string; // {label}
	"modal.uploadFailed": string;
	"modal.writtenFields": string; // {count}
	"modal.cleanedUpImages": string; // {count}
	"modal.selectOption": string;

	// Notices
	"notice.validationPassed": string;
	"notice.validationErrors": string; // {errors} {warnings} {detail}
	"notice.pasteImageUpload": string;
	"notice.pasteImageSuccess": string;
	"notice.pasteImageFailed": string;
	"notice.pasteImageFallback": string; // {issue}

	// Uploader
	"uploader.selectMethod": string;
	"uploader.notEnabled": string;
	"uploader.publicUrlRequired": string;
	"uploader.r2AccountId": string;
	"uploader.r2Bucket": string;
	"uploader.r2AccessKeyId": string;
	"uploader.r2SecretAccessKey": string;
	"uploader.webdavUrl": string;
	"uploader.webdavUploadFailed": string; // {status} {text}
	"uploader.webdavCreateDirFailed": string; // {path} {status}
	"uploader.r2UploadFailed": string; // {status} {text}
	"uploader.localNotUpload": string; // {issue}

	// Settings
	"settings.general": string;
	"settings.autoOpenPanel": string;
	"settings.autoOpenPanelDesc": string;
	"settings.cdn": string;
	"settings.frontmatter": string;
	"settings.imageUpload": string;
	"settings.pasteImage": string;
	"settings.pasteImageDesc": string;
	"settings.uploadPathPrefix": string;
	"settings.uploadPathPrefixDesc": string;
	"settings.uploadPathPrefixPlaceholder": string;
	"settings.cdnTest": string;
	"settings.cdnTestButton": string;
	"settings.cdnTestSuccess": string;
	"settings.cdnTestFailed": string;
	"settings.cdnTestPending": string;
	"settings.cdnPublicAccess": string;
	"settings.cdnPublicAccessOk": string;
	"settings.cdnPublicAccessFail": string; // {status}
	"settings.cdnPublicAccessNotChecked": string;
	"settings.cdnTestFileDeleted": string;
	"settings.cdnTestFileNotDeleted": string;
	"settings.r2Endpoint": string;
	"settings.r2EndpointDesc": string;
	"settings.r2BucketName": string;
	"settings.r2BucketPlaceholder": string;
	"settings.r2AccessKey": string;
	"settings.r2AccessKeyPlaceholder": string;
	"settings.r2SecretKey": string;
	"settings.r2SecretKeyPlaceholder": string;
	"settings.r2DerivedFromToken": string;
	"settings.r2CredentialsApplied": string; // {fields}
	"settings.r2CredentialsMissing": string; // {fields}
	"settings.webdavUrl": string;
	"settings.webdavUrlDesc": string;
	"settings.webdavUsername": string;
	"settings.webdavUsernameDesc": string;
	"settings.webdavUsernamePlaceholder": string;
	"settings.webdavPassword": string;
	"settings.webdavPasswordDesc": string;
	"settings.webdavPasswordPlaceholder": string;
	"settings.templateSelected": string; // {count}
	"settings.fieldRequired": string;
	"settings.fieldOptional": string;
	"settings.fieldDeprecated": string;
	"settings.fieldExample": string; // {example}
	"settings.fieldInTemplate": string;
	"settings.fieldNotInTemplate": string;
	"settings.fieldCardToggleHint": string;
	"settings.totalSelected": string; // {total} {selected} {unchecked}
	"settings.afdian": string;

	// Errors
	"error.noEditor": string;
	"error.noValue": string;
	"error.readFailed": string; // {message}
	"error.saveFailed": string; // {message}
	"error.unknown": string;
}
