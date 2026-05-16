# LCG Writing Assistant

LCG Writing Assistant 是一个免费、开源的 Obsidian 插件，专为使用 Hugo/FixIt 发布博文的作者设计。

**告别记忆 front matter 字段名。告别修复 YAML 错误。告别手动上传图片。**

插件可以帮助你插入 front matter 模板、可视化编辑字段、理解每个字段的含义，以及上传图片到 Cloudflare R2 或 WebDAV——全部在 Obsidian 内完成。

## 为什么 Hugo 作者需要这个插件

- **不再猜测字段名** — 输入 `/lcg` 选择需要的内容
- **不再写错 YAML** — 可视化编辑器防止格式错误
- **不再找图片路径** — 图片自动上传并插入链接
- **不再翻文档** — 字段说明告诉你每个字段的用途

支持 Hugo、FixIt、LoveIt、PaperMod 和任何 Hugo 主题。

[English README](README.md)

## 功能

- 在 Markdown 编辑器中输入 `/lcg` 打开 LCG 写作菜单。
- 插入可配置的 Hugo/FixIt front matter 模板。
- 通过 **Front matter 编辑** 按分类补充文章 front matter。
- 在设置中查看分组字段说明，包含名称、属性、描述、来源和模板状态。
- 校验当前笔记的必填字段、日期格式、草稿状态、数组字段和兼容旧字段。
- 在编辑器右键菜单中使用 **LCG 写作助手** 入口。
- CDN 上传开启时，粘贴图片到正文会先上传，再插入 Markdown 图片链接。
- 图片字段支持填写 URL、选择本地图片、粘贴剪贴板图片。
- CDN 上传关闭时，图片粘贴完全交给 Obsidian 默认附件逻辑处理。
- 在设置中测试 CDN 上传、公开 URL 访问和测试文件清理。

## 命令

- `插入 front matter`
- `打开 front matter 编辑`
- `校验当前文章`
- `插入 LCG 字段：...`

## 设置

- **基础**：配置 `/lcg` 触发词、自动创建 front matter，以及是否显示 `author`、`password`、`repost`、`_build` 等高级字段。
- **图片上传**：配置可选的 CDN 上传、公开访问地址、上传路径前缀，以及 Cloudflare R2 或 WebDAV 凭据。
- **字段说明**：按分类浏览 front matter 字段说明，并选择哪些字段加入默认模板。
- 粘贴 Cloudflare R2 信息并解析到设置；插件不会保存粘贴原文。
- 测试 CDN 上传、公开 URL 访问和测试文件清理。

## 安装

### 从 Obsidian 社区插件安装

插件被 Obsidian 社区插件目录收录后：

1. 打开 **Settings → Community plugins**。
2. 选择 **Browse**。
3. 搜索 **LCG Writing Assistant**。
4. 选择 **Install**。
5. 启用插件。

### 手动安装

1. 从 GitHub Release 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在你的 vault 中创建目录：

```text
<Vault>/.obsidian/plugins/lcg-writing-assistant/
```

3. 将下载的文件复制到该目录。
4. 重新加载 Obsidian。
5. 在 **Settings → Community plugins** 中启用插件。

## 使用

### Slash 菜单

在 Markdown 笔记中输入 `/lcg`，选择需要的写作动作，例如插入模板、打开 **Front matter 编辑**、校验文章或插入单个字段。

### 右键菜单

在 Markdown 编辑器中右键，打开 **LCG 写作助手**。

### Front matter 编辑

通过命令面板、`/lcg` 或编辑器右键菜单打开 **Front matter 编辑**，按分类填写字段。只有填写了值的字段会写入笔记；空字段不会改动当前文章。

数组字段，例如 `categories` 和 `tags`，使用标签式输入。输入内容后按 Enter 或逗号即可添加。

图片字段支持：

- 直接输入 URL。
- 通过字段前面的 **选择** 按钮选择本地图片。
- 聚焦输入框后用 Ctrl+V 粘贴剪贴板图片。

如果开启并配置了 CDN 上传，选择或粘贴的图片会先上传，上传后的 URL 会自动填入字段。

## 示例

### 示例 1：插入 front matter 模板

1. 在 Obsidian 中创建新笔记
2. 在编辑器中输入 `/lcg`
3. 选择 **插入 front matter**
4. 插件会插入如下模板：
   ```yaml
   ---
   title: ""
   date: 2026-05-16
   tags: []
   categories: []
   ---
   ```
5. 使用可视化编辑器填写字段

### 示例 2：发布前校验文章

1. 编写带有 front matter 的 Hugo 文章
2. 输入 `/lcg` 选择 **校验当前文章**
3. 插件会检查：
   - 必填字段（title、date）
   - 日期格式（ISO 8601）
   - 草稿状态
   - 数组字段格式
4. 显示校验结果通知

### 示例 3：自动上传图片

1. 在设置中开启 CDN 上传（Cloudflare R2 或 WebDAV）
2. 在 Markdown 笔记中粘贴图片
3. 插件自动上传图片并替换为 CDN 链接
4. 你的 Hugo 网站直接显示 CDN 上的图片

## CDN 上传

CDN 上传默认关闭。

关闭 CDN 上传时，插件不会拦截 Obsidian 默认图片粘贴行为，附件由 Obsidian 自己处理。

开启 CDN 上传后，插件可以上传图片到：

- Cloudflare R2
- WebDAV

插件会把服务配置保存在 Obsidian 插件数据中，可能包括：

- CDN 公开访问地址
- 上传路径前缀
- Cloudflare R2 account ID、bucket、access key ID 和 secret access key
- WebDAV endpoint、username 和 password

粘贴到设置中的 Cloudflare `cfat_...` token 会被解析，但不会以原始 token 字符串保存。

### 快速配置：Cloudflare R2

1. **创建 Cloudflare 账户**（如果没有）
2. **创建 R2 bucket**：Cloudflare 控制台 → R2 → 创建 bucket
3. **创建 API token**：R2 → 设置 → Tokens → 创建 API token
   - 选择"编辑"模板或创建自定义权限（需要 Object Read + Object Write）
4. **复制以下信息**：
   - Account ID（来自 R2 概览页面）
   - Bucket 名称
   - Access Key ID
   - Secret Access Key
5. **在插件设置中配置**：
   - 开启 CDN 上传
   - 输入 R2 凭据
   - 设置公开 URL（如 `https://your-domain.com`）
   - 点击"测试"验证

### 快速配置：WebDAV

1. **使用任意 WebDAV 服务器**（Nextcloud、群晖 NAS、Linux 服务器配 Apache/Nginx）
2. **获取 WebDAV 地址**，如 `https://your-server.com/remote.php/dav/files/username/`
3. **在 WebDAV 服务中创建凭据**
4. **在插件设置中配置**：
   - 开启 CDN 上传
   - 选择 WebDAV 提供商
   - 输入 endpoint、用户名和密码
   - 设置公开 URL（你的 WebDAV 服务器公开地址）
   - 点击"测试"验证

## 隐私和网络请求

插件不收集遥测数据。

插件不会把 vault 内容上传到插件作者控制的服务器。

只有用户主动使用 CDN 相关功能时，插件才会发起网络请求：

- 解析 R2 凭据时调用 Cloudflare token verify 接口。
- Cloudflare R2 上传、删除和上传测试请求。
- WebDAV 上传、删除、目录创建和上传测试请求。
- 点击 CDN 测试按钮时，对公开 URL 发起 GET 检查。

图片文件只会发送到用户自己配置的 CDN 或 WebDAV 地址。

凭据保存在本地 Obsidian 插件数据中。任何能访问你的 vault 配置文件的人，都可能读取这些凭据。

## 支持

插件是免费开源的。如果你觉得有用，可以考虑支持开发。

## 开发

```bash
npm install
npm run dev
npm run build
npm run lint
```

生产构建会在插件根目录输出 `main.js`。

## 发布检查

发布 GitHub Release 前：

1. 更新 `package.json` 和 `manifest.json` 中的 `version`。
2. 如果 `minAppVersion` 变化，更新 `versions.json`。
3. 运行 `npm run build`。
4. 运行 `npm run lint`。
5. 将以下文件作为 GitHub Release 附件上传：
   - `manifest.json`
   - `main.js`
   - `styles.css`

GitHub Release tag 必须和 `manifest.json` 中的版本号完全一致，不要加 `v` 前缀。
