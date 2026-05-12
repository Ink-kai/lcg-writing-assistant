# I am submitting a new Community Plugin

- [ ] I attest that I have done my best to deliver a high-quality plugin, am proud of the code I have written, and would recommend it to others. I commit to maintaining the plugin and being responsive to bug reports. If I am no longer able to maintain it, I will make reasonable efforts to find a successor maintainer or withdraw the plugin from the directory.

## Repo URL

Link to my plugin: [PLUGIN_REPO_URL]

## Release Checklist

- [ ] I have tested the plugin on
  - [ ] Windows
  - [ ] macOS
  - [ ] Linux
  - [ ] Android _(if applicable)_
  - [ ] iOS _(if applicable)_
- [ ] My GitHub release contains all required files as individual assets, not just in `source.zip` or `source.tar.gz`
  - [ ] `main.js`
  - [ ] `manifest.json`
  - [ ] `styles.css` _(optional)_
- [ ] GitHub release name matches the exact version number specified in `manifest.json` (_Use the exact version number, without a leading `v`_)
- [ ] The `id` in `manifest.json` matches the `id` in `community-plugins.json`.
- [ ] `README.md` describes the plugin's purpose and provides clear usage instructions.
- [ ] I have read the developer policies at https://docs.obsidian.md/Developer+policies and assessed this plugin's adherence to these policies.
- [ ] I have read the tips in https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines and self-reviewed this plugin to avoid common pitfalls.
- [ ] I have added a license in the `LICENSE` file.
- [ ] This project respects and is compatible with the original license of any code from other plugins that it uses.
      I have given proper attribution to these other projects in `README.md`.

## Platform test plan

For each tested platform, use the `[VERSION]` release assets from GitHub, install `main.js`, `manifest.json`, and `styles.css` into a clean test vault under `.obsidian/plugins/[PLUGIN_ID]/`, reload Obsidian, enable the plugin, and verify:

- The plugin loads without startup errors.
- The `/lcg` editor trigger opens the writing menu in a Markdown note.
- The `插入 front matter` command inserts the configured Hugo/FixIt front matter template.
- The `打开 front matter 编辑` command opens the categorized editor.
- The `校验当前文章` command reports expected results for valid and invalid front matter.
- The editor context menu shows the `LCG 写作助手` menu item.
- The front matter editor opens, saves scalar fields, saves array fields, and ignores empty fields.
- Settings render correctly, persist after reload, and do not require a network service by default.
- With image upload disabled, normal image paste remains handled by Obsidian's default attachment workflow.
- If upload credentials are available on that platform, the upload test button verifies upload, public URL access, and cleanup; otherwise provider validation errors are shown without crashing.

Mobile-specific checks:

- The plugin enables on Android and iOS when `isDesktopOnly` is `false`.
- Commands, settings, validation, and front matter editing work without desktop-only APIs.
- Image paste and image selection behavior degrade safely where mobile clipboard or file picker support is limited.

## Before opening or updating the PR

- [ ] Run `npm run lint -- --format stylish`.
- [ ] Run `npm run build`.
- [ ] Run `node .github/scripts/validate-obsidian-plugin.mjs`.
- [ ] Confirm the release assets match the checked `manifest.json` version.
- [ ] Do not open a new PR for bot re-validation. Push changes to the plugin repository and wait for the bot to rescan.
