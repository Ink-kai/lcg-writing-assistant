# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-16

### Added
- CDN image upload support for Cloudflare R2 and WebDAV
- Slash menu integration (`/lcg`) for quick access
- Paste image handler for automatic CDN upload
- Settings tab for CDN configuration
- Cloudflare R2 credential parsing from pasted tokens
- WebDAV upload support
- CDN upload testing and verification
- Onboarding hint when plugin loads

### Changed
- Simplified to focus on CDN upload as core feature
- Removed Panel View (available in 1.1.0)
- Removed front matter visual editor (available in 1.1.0)
- Removed validation feature (available in 1.1.0)

## [1.1.0] - 2026-05-16

### Added
- Panel View (Phase 1): Right sidebar panel showing current note's front matter
- Ribbon icon to toggle panel visibility
- Command "Open LCG panel" in command palette
- Panel automatically displays front matter fields when opening a note
- Click on field to open modal editor

### Fixed
- Resolved lint errors (sentence case, void promises)

## [1.0.0.1] - 2026-05-16

### Added
- New onboarding hint when plugin loads: "LCG 写作助手已加载！输入 /lcg 开始使用。"
- CDN setup guides for Cloudflare R2 and WebDAV in README
- Three usage examples in README (front matter template, validation, auto image upload)
- SECURITY.md with security policy

### Changed
- Updated plugin description for Obsidian marketplace
- Removed "Free and Pro" section to comply with marketplace guidelines
- Synchronized Chinese README with English version
- Added .gstack/ to .gitignore
