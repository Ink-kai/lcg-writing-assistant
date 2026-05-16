# LCG Writing Assistant

[中文说明](README-zh.md)

LCG Writing Assistant is a free, open-source Obsidian plugin for Hugo/FixIt writers who publish from Obsidian.

**Stop memorizing front matter field names. Stop fixing YAML errors. Stop manually uploading images.**

This plugin helps you insert front matter templates, edit fields visually, understand what each field means, and upload images to Cloudflare R2 or WebDAV — all without leaving Obsidian.

## Why Hugo Writers Need This

- **No more guessing field names** — Type `/lcg` and select what you need
- **No more YAML errors** — Visual editor prevents syntax mistakes
- **No more path hunting** — Images upload automatically and paths are inserted
- **No more docs翻来翻去** — Field descriptions explain what each field does

Works with Hugo, FixIt, LoveIt, PaperMod, and any Hugo theme.

## Features

- Type `/lcg` in a Markdown editor to open the LCG writing menu.
- Insert a configurable Hugo/FixIt front matter template.
- Edit front matter through **Front matter 编辑**.
- Browse grouped front matter field descriptions with Chinese labels.
- Validate the current note for required fields, date format, draft state, array fields, and old compatibility fields.
- Use the editor right-click **LCG 写作助手** entry.
- Paste image files into Markdown and upload them when CDN upload is enabled.
- Select or paste images in image fields and upload them to Cloudflare R2 or WebDAV.
- Leave image paste fully under Obsidian's default attachment workflow when CDN upload is disabled.
- Test CDN upload, public URL access, and cleanup from settings.

## Commands

- `插入 front matter`
- `打开 front matter 编辑`
- `校验当前文章`
- `插入 LCG 字段：...`

Command names are shown in Chinese because the plugin is currently focused on Hugo/FixIt writers using Chinese field guidance.

## Settings

- **基础**: configure the `/lcg` trigger phrase, auto-create front matter, and show advanced fields such as `author`, `password`, `repost`, and `_build`.
- **图片上传**: configure optional CDN upload, public base URL, path prefix, and Cloudflare R2 or WebDAV credentials.
- **字段说明**: browse grouped field reference cards and choose which fields are included in the default template.
- Paste Cloudflare R2 credentials and parse them into settings without saving the original pasted text.
- Test CDN upload, public URL access, and cleanup from settings.

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

In a Markdown note, type `/lcg` and select a writing action, such as inserting the template, opening **Front matter 编辑**, validating the note, or inserting a specific field.

### Right-click menu

Right-click in a Markdown editor and open **LCG 写作助手**.

### Front matter editor

Use the command palette, `/lcg`, or the editor right-click menu to open **Front matter 编辑** and fill fields by category. Only fields with values are written. Empty fields are ignored.

Array fields, such as `categories` and `tags`, use tag-style input. Type a value and press Enter or comma to add it.

Image fields accept:

- A direct URL typed into the field.
- A local image selected with the field's **选择** button.
- An image pasted into the field with Ctrl+V.

If CDN upload is enabled and configured, selected or pasted image files are uploaded and the resulting URL is filled into the field.

## Examples

### Example 1: Insert front matter template

1. Create a new note in Obsidian
2. Type `/lcg` in the editor
3. Select **插入 front matter**
4. The plugin inserts a template like:
   ```yaml
   ---
   title: ""
   date: 2026-05-16
   tags: []
   categories: []
   ---
   ```
5. Fill in the fields using the visual editor

### Example 2: Validate a post before publishing

1. Write your Hugo post with front matter
2. Type `/lcg` and select **校验当前文章**
3. The plugin checks for:
   - Required fields (title, date)
   - Valid date format (ISO 8601)
   - Draft status
   - Array field format
4. Shows a notice with validation results

### Example 3: Upload images automatically

1. Enable CDN upload in settings (Cloudflare R2 or WebDAV)
2. Paste an image into your Markdown note
3. The plugin automatically uploads the image and replaces the local path with the CDN URL
4. Your Hugo site displays the image from the CDN

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

### Quick Setup: Cloudflare R2

1. **Create a Cloudflare account** if you don't have one
2. **Create an R2 bucket** in Cloudflare dashboard → R2 → Create bucket
3. **Create an API token**: R2 → Settings → Tokens → Create API token
   - Select "Edit" template or create custom with `Object Read` + `Object Write` permissions
4. **Copy these values**:
   - Account ID (from R2 overview page)
   - Bucket name
   - Access Key ID
   - Secret Access Key
5. **Configure in plugin settings**:
   - Enable CDN upload
   - Enter your R2 credentials
   - Set public URL (e.g., `https://your-domain.com`)
   - Click "Test" to verify

### Quick Setup: WebDAV

1. **Use any WebDAV server** (Nextcloud, Synology NAS, Linux server with Apache/Nginx)
2. **Get your WebDAV URL**, e.g., `https://your-server.com/remote.php/dav/files/username/`
3. **Create credentials** in your WebDAV service
4. **Configure in plugin settings**:
   - Enable CDN upload
   - Select WebDAV provider
   - Enter endpoint, username, and password
   - Set public URL (your WebDAV server's public URL)
   - Click "Test" to verify

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

## Support

This plugin is free and open source. If you find it useful, consider supporting its development.

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
