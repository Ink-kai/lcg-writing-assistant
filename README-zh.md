# LCG Writing Assistant

LCG Writing Assistant 是一个免费、开源的 Obsidian 插件，用于在 Obsidian 中编写 Hugo/FixIt 文章。

插件聚焦单篇文章写作：front matter 模板、字段说明、写作命令、基础校验，以及可选的图片 CDN 上传。

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

## 免费版和未来计划

当前社区插件是免费开源版本。

免费版会保持对单篇文章写作有用：

- `/lcg` 菜单
- front matter 编辑
- 字段说明
- 模板配置
- 基础校验
- 手动配置 CDN 上传

未来如果发布付费版本，付费功能应集中在批量和发布工作流，例如：

- 扫描 Hugo/FixIt 项目配置
- 批量 front matter 转换
- 批量图片上传和路径替换
- 多站点发布流程
- 高级发布检查

免费版不需要账号或许可证。

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
