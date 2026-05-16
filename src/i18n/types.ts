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
	"slash.uploadAll": string;
	"slash.uploadAllDesc": string;

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
	"notice.uploadAll": string;

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
	"settings.language": string;
	"settings.languageDesc": string;
	"settings.triggerPhrase": string;
	"settings.triggerPhraseDesc": string;
	"settings.triggerPhrasePlaceholder": string;
	"settings.autoOpenPanel": string;
	"settings.autoOpenPanelDesc": string;
	"settings.cdn": string;
	"settings.frontmatter": string;
	"settings.imageUpload": string;
	"settings.pasteImage": string;
	"settings.pasteImageDesc": string;
	"settings.uploadMethod": string;
	"settings.uploadMethodDesc": string;
	"settings.uploadMethodNone": string;
	"settings.languageEn": string;
	"settings.languageZh": string;
	"settings.cloudflare": string;
	"settings.webdav": string;
	"settings.testing": string;
	"settings.parseAndFill": string;
	"settings.noCredentialsFound": string;
	"settings.publicAccessOk": string;
	"settings.publicAccessNotChecked": string;
	"settings.testFileDeleted": string;
	"settings.testFileNotDeleted": string;
	"settings.cdnCheckComplete": string;
	"settings.testObjectUploaded": string;
	"settings.url": string;
	"settings.publicUrl": string;
	"settings.publicUrlDesc": string;
	"settings.publicUrlPlaceholder": string;
	"settings.uploadPathPrefix": string;
	"settings.uploadPathPrefixDesc": string;
	"settings.uploadPathPrefixPlaceholder": string;
	"settings.testCdn": string;
	"settings.testCdnDesc": string;
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
	"settings.r2Credentials": string;
	"settings.r2CredentialsDesc": string;
	"settings.r2CredentialsPlaceholder": string;
	"settings.r2Endpoint": string;
	"settings.r2EndpointDesc": string;
	"settings.r2EndpointPlaceholder": string;
	"settings.r2Bucket": string;
	"settings.r2BucketName": string;
	"settings.r2BucketPlaceholder": string;
	"settings.r2AccessKey": string;
	"settings.r2AccessKeyDesc": string;
	"settings.r2AccessKeyPlaceholder": string;
	"settings.r2SecretKey": string;
	"settings.r2SecretKeyPlaceholder": string;
	"settings.r2DerivedFromToken": string;
	"settings.r2CredentialsApplied": string; // {fields}
	"settings.r2CredentialsMissing": string; // {fields}
	"settings.webdavUrl": string;
	"settings.webdavUrlDesc": string;
	"settings.webdavUrlPlaceholder": string;
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

	// Field Labels
	"field.group.required": string;
	"field.group.recommended": string;
	"field.group.images": string;
	"field.group.fixit": string;
	"field.group.visibility": string;
	"field.group.seo": string;
	"field.group.advanced": string;
	"field.group.external": string;
	"field.group.compatibility": string;
	"field.group.other": string;
	"field.source.obsidian": string;
	"field.source.hugo": string;
	"field.source.theme": string;
	"field.source.custom": string;
	"field.label.title": string;
	"field.label.date": string;
	"field.label.draft": string;
	"field.label.description": string;
	"field.label.summary": string;
	"field.label.categories": string;
	"field.label.tags": string;
	"field.label.series": string;
	"field.label.collections": string;
	"field.label.featuredImage": string;
	"field.label.featuredImagePreview": string;
	"field.label.toc": string;
	"field.label.math": string;
	"field.label.lightgallery": string;
	"field.label.comment": string;
	"field.label.hiddenFromHomePage": string;
	"field.label.hiddenFromSearch": string;
	"field.label.hiddenFromFeed": string;
	"field.label.hiddenFromRelated": string;
	"field.label.slug": string;
	"field.label.url": string;
	"field.label.keywords": string;
	"field.label.lastmod": string;
	"field.label.subtitle": string;
	"field.label.author": string;
	"field.label.weight": string;
	"field.label.password": string;
	"field.label.message": string;
	"field.label.repost": string;
	"field.label.externalUrl": string;
	"field.label.build": string;
	"field.label.showTableOfContents": string;
	"field.label.showReadingTime": string;
	"field.label.showWordCount": string;
	"field.desc.title": string;
	"field.desc.date": string;
	"field.desc.draft": string;
	"field.desc.description": string;
	"field.desc.summary": string;
	"field.desc.categories": string;
	"field.desc.tags": string;
	"field.desc.series": string;
	"field.desc.collections": string;
	"field.desc.featuredImage": string;
	"field.desc.featuredImagePreview": string;
	"field.desc.toc": string;
	"field.desc.math": string;
	"field.desc.lightgallery": string;
	"field.desc.comment": string;
	"field.desc.hiddenFromHomePage": string;
	"field.desc.hiddenFromSearch": string;
	"field.desc.hiddenFromFeed": string;
	"field.desc.hiddenFromRelated": string;
	"field.desc.slug": string;
	"field.desc.url": string;
	"field.desc.keywords": string;
	"field.desc.lastmod": string;
	"field.desc.subtitle": string;
	"field.desc.author": string;
	"field.desc.weight": string;
	"field.desc.password": string;
	"field.desc.message": string;
	"field.desc.repost": string;
	"field.desc.externalUrl": string;
	"field.desc.build": string;
	"field.desc.showTableOfContents": string;
	"field.desc.showReadingTime": string;
	"field.desc.showWordCount": string;
}
