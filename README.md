# LCG Writing Assistant

[中文说明](README-zh.md)

LCG Writing Assistant is a free, open-source Obsidian plugin for writing Hugo/FixIt posts from Obsidian.

It focuses on single-post editing: front matter templates, field explanations, writing helpers, validation, and optional image upload to a CDN you configure.

## Features

- Type `/lcg` in a Markdown editor to open the LCG writing menu.
- Insert a configurable Hugo/FixIt front matter template.
- Edit front matter through **Front Matter 编辑**.
- Browse grouped front matter field descriptions with Chinese labels.
- Validate the current note for required fields, date format, draft state, array fields, and old compatibility fields.
- Use the editor right-click **LCG 写作助手** submenu from one entry.
- Paste image files into Markdown and upload them when CDN upload is enabled.
- Select or paste images in image fields and upload them to Cloudflare R2 or WebDAV.
- Leave image paste fully under Obsidian's default attachment workflow when CDN upload is disabled.
- Test CDN upload, public URL access, and cleanup from settings.

## Commands

- `Insert LCG front matter`
- `Validate current note`
- `Insert LCG field: ...`

## Settings

- Slash menu trigger phrase, default `/lcg`.
- Auto-create front matter when inserting a field into a note without YAML.
- Show advanced fields such as `author`, `password`, `repost`, and `_build`.
- Configure which fields are included in the default template.
- Configure CDN upload provider, public base URL, path prefix, and provider credentials.
- Paste Cloudflare R2 credentials and parse them into settings.
- Test Cloudflare R2 or WebDAV upload configuration.
- Browse grouped field reference cards with name, property, description, source, and template status.

## Installation

### From Obsidian community plugins

After the plugin is accepted into the community plugin directory:

1. Open **Settings → Community plugins**.
2. Select **Browse**.
3. Search for **LCG Writing Assistant**.
4. Select **Install**.
5. Enable the plugin.

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from a GitHub release.
2. Create this folder in your vault:

```text
<Vault>/.obsidian/plugins/lcg-writing-assistant/
```

3. Copy the downloaded files into that folder.
4. Reload Obsidian.
5. Enable the plugin in **Settings → Community plugins**.

## Usage

### Slash menu

In a Markdown note, type `/lcg` and select a writing action.

### Right-click menu

Right-click in a Markdown editor and open **LCG 写作助手**.

### Front matter editor

Use **Front Matter 编辑** to fill fields by category. Only fields with values are written. Empty fields are ignored.

Array fields, such as `categories` and `tags`, use tag-style input. Type a value and press Enter or comma to add it.

Image fields accept:

- A direct URL typed into the field.
- A local image selected with the field's **选择** button.
- An image pasted into the field with Ctrl+V.

If CDN upload is enabled and configured, selected or pasted image files are uploaded and the resulting URL is filled into the field.

## CDN Upload

CDN upload is off by default.

When CDN upload is disabled, this plugin does not intercept normal Obsidian image paste behavior. Obsidian handles attachments as usual.

When CDN upload is enabled, the plugin can upload image files to:

- Cloudflare R2
- WebDAV

The plugin stores provider settings in Obsidian plugin data. These settings may include:

- CDN public base URL
- path prefix
- Cloudflare R2 account ID, bucket, access key ID, and secret access key
- WebDAV endpoint, username, and password

Cloudflare `cfat_...` tokens pasted into settings are parsed and are not saved as the original token string.

## Privacy and Network Use

This plugin does not collect telemetry.

This plugin does not upload vault content to any server controlled by the plugin author.

Network requests are made only for user-triggered CDN features:

- Cloudflare token verification when parsing pasted R2 credentials.
- Cloudflare R2 upload, delete, and upload test requests.
- WebDAV upload, delete, directory creation, and upload test requests.
- Public URL GET checks when running the CDN test button.

Image file data is sent only to the CDN/WebDAV endpoint configured by the user.

Credentials are stored locally in Obsidian plugin data. Anyone with access to your vault configuration files may be able to read them.

## Free and Pro

This community plugin is the free, open-source version.

The free version is intended to remain useful for single-post editing:

- `/lcg` menu
- front matter editing
- field explanations
- template configuration
- basic validation
- manually configured CDN upload

Future paid features, if released, should focus on batch and publishing workflows, such as:

- scanning Hugo/FixIt project configuration
- batch front matter conversion
- batch image upload and path replacement
- multi-site publishing workflows
- advanced publishing checks

The free version should not require an account or license key.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

Production build outputs `main.js` at the plugin root.

## Release Checklist

Before publishing a GitHub release:

1. Update `version` in `package.json` and `manifest.json`.
2. Update `versions.json` when `minAppVersion` changes.
3. Run `npm run build`.
4. Run `npm run lint`.
5. Attach these files to the GitHub release:
   - `manifest.json`
   - `main.js`
   - `styles.css`

The GitHub release tag must exactly match the version in `manifest.json`, without a leading `v`.
