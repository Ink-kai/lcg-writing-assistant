# MVP 方案

## 核心验证目标

**渠道假设**：通过 Obsidian 社区能找到用户

---

## 当前进度

| 任务 | 状态 |
|------|------|
| Obsidian 社区插件审核 | ✅ PR 已提交，审核通过待合并 |
| GitHub README | ✅ 已做好 |
| 落地页 | ✅ 已建好（lcg-landing，Cloudflare Pages）|
| 内容试水 | ⏳ 待执行 |

---

## 可提前做的非前置任务

| 任务 | 说明 |
|------|------|
| 研究 Obsidian 论坛规则 | 了解能发什么内容、什么形式 |
| 写内容草稿 | 准备好帖子/文章，等插件上线后发 |
| 完善落地页 | 根据已有内容优化 |

---

## 最小验证形式

**直接发布插件**：等插件正式上线 Obsidian 社区，看安装量和用户反馈。

这是最简单、最直接的验证方式。

---

## 内容试水草稿

### Obsidian 论坛帖子

**标题**：LCG Writing Assistant - 免费的 Obsidian 插件，支持 Hugo/FixIt front matter 管理和微信公众号发布

**正文**：
```
Hi 大家，

我做了一个 Obsidian 插件 LCG Writing Assistant，帮助用 Hugo/FixIt 主题写博客的朋友。

核心功能：
- 在 Obsidian 里直接管理 Hugo front matter（模板、字段说明、校验）
- 支持微信公众号发布（自动排版、图片上传）
- CDN 上传支持（Cloudflare R2、WebDAV）

之前手动维护 front matter 经常漏字段或者格式不对，用这个插件可以减少这类问题。

免费开源，欢迎试用。GitHub: https://github.com/jnMetaCode/lcg-writing-assistant

有问题欢迎反馈。
```

---

### Reddit r/obsidian 帖子（英文版）

**Title**: [Plugin] LCG Writing Assistant - Free Obsidian plugin for Hugo/FixIt front matter and WeChat publishing

**Body**:
```
Hi everyone,

I built an Obsidian plugin called LCG Writing Assistant for Hugo/FixIt blog writers.

Key features:
- Front matter template management with field explanations
- WeChat public account publishing (auto-format, image upload)
- CDN upload support (Cloudflare R2, WebDAV)

Free and open source. GitHub: https://github.com/jnMetaCode/lcg-writing-assistant

Feedback welcome!
```

---

## 成功标准

| 指标 | 目标 |
|------|------|
| 插件安装量 | 上线后 30 天内 > 50 安装 |
| 用户反馈 | 有用户在论坛/GitHub 反馈使用体验 |
| 付费转化 | 暂不作为 MVP 阶段的主要指标 |

---

## 下一步

1. 等插件合并主分支并正式发布
2. 在 Obsidian 论坛/Reddit 发内容试水
3. 观察安装量和用户反馈
4. 根据反馈决定下一步优化方向