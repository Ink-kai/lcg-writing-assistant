# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

For this open-source plugin:

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email the plugin author directly through their GitHub profile
3. Provide details about the vulnerability and potential impact

## Security Considerations

### Credential Storage

This plugin stores CDN credentials (Cloudflare R2 or WebDAV) in Obsidian's plugin data storage. This is necessary for the CDN upload feature to work.

- Credentials are stored in the plugin's `data.json` file
- This file is located in `<vault>/.obsidian/plugins/lcg-writing-assistant/`
- Anyone with access to your vault's configuration files can read these credentials
- Use separate credentials for this plugin if possible
- Consider the security implications before enabling CDN upload on shared devices

### Network Requests

When CDN upload is enabled, this plugin makes network requests to:

- Cloudflare API (for R2 token verification)
- Cloudflare R2 (for image uploads)
- Your configured WebDAV endpoint

All network requests are initiated by user actions (pasting or selecting images for upload). The plugin does not make any automatic network requests.

### Data Handling

- This plugin does not collect or transmit any vault content to external servers
- Only image files explicitly selected by the user are uploaded
- No telemetry or analytics is collected
- All processing happens locally in your Obsidian instance

## Best Practices

1. Use dedicated credentials for CDN uploads (not your main Cloudflare account credentials)
2. Enable CDN upload only when needed
3. Review your vault's file permissions
4. Keep the plugin updated to the latest version
