# 更新日志

本文档记录项目所有值得关注的变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号使用日历版本（CalVer）：`YYYYMMDD`。

## [20261030] - 2026-10-30

### 新增
- 后端新增 HTTPS 支持，可自动生成自签名证书；开发环境 Vite 代理与 `runserver.sh` 同步适配 HTTPS。
- 新增后端测试：题目分页筛选查询、题目创建/更新异常分支、备份导入、数据库迁移。
- 新增前端测试：AI 服务商配置解析与生效逻辑、AI 响应结构提取、JSON 解析兜底、备份导出。

### 修复
- 修复自定义 AI Provider（通义千问 / 豆包 / OpenAI 兼容 / 自建网关）识别图片时报 `TypeError: Cannot read properties of undefined (reading 'response')` 的问题：不再假设响应结构，兼容 `choices[].message.content`、`{result:{response}}`、Ollama 等格式与 SSE 流式响应，并在无可用内容时回显服务商原始响应片段。
- 修复 AI 服务商配置“看似保存成功但实际未生效”的问题：保存改为先落库再测试，连接测试失败不再丢弃整份配置。
- 修复「设为当前」只修改内存状态、需额外点击「保存配置」才生效的问题，现在切换后立即持久化。
- 修复读取 AI 配置失败时静默回退到 Google Gemini 默认值的问题：请求失败改用上次成功的缓存，从未成功过则明确报错；当前服务商缺少 API Key 时直接提示服务商名称，不再静默切换。
- 修复 `/api/config` 在配置表无记录时返回 500、导致前端误判为默认配置的问题。
- 修复「导出错题库」实际下载到字符串 `[object Promise]` 的问题：改为请求 `/api/export` 后保存为 JSON 文件，并增加导出中状态与失败提示。
- 修复旧版本数据库升级后缺少新增列（`analysis`、`knowledge_points` 等）的问题，启动时自动补齐。
- 批量录入窗口标题不再硬编码“Gemini 将为您逐一解析”，改为显示当前实际使用的服务商。

### 改进
- 收紧后端 CORS 策略，改用 `ALLOWED_ORIGINS` 环境变量配置允许来源。
- 优化备份导入的批量删除性能。
- AI 接口错误提示更可用：401/403 提示密钥无效、404 提示 Base URL 与模型名可能不正确、模型不支持图片时给出明确指引。
- Base URL 末尾误粘贴 `/chat/completions` 会被自动去除；服务商拒绝 `response_format` 时自动去掉该参数重试。
- 自建/本地网关（Ollama、vLLM 等）允许不填 API Key。
- `docker-compose-cn.yml` 端口配置适配 QNAP Container Station。

## [20260106] - 2026-01-06

### 新增
- 批量录入错题支持从剪贴板粘贴图片（Ctrl+V / 来自剪贴板），并走与上传图片一致的裁剪与识别流程。
- 批量录入错题窗口在有图片后仍显示“来自剪贴板”按钮，便于连续添加。

### 修复
- 修复垃圾桶角标数量在清空/恢复/删除后未即时同步的问题。

## [20260105] - 2026-01-05

### 新增
- 首次发布。
- 错题详情弹窗，支持富文本/公式渲染展示。
- 使用 KaTeX 渲染 LaTeX 数学公式。
- 支持题目图片展示与裁剪提取关键图/图例。
- 支持知识点标签管理，便于结构化复习。

[20261030]: https://github.com/aymwoo/E-Bu/releases/tag/v20261030
[20260106]: https://github.com/aymwoo/E-Bu/releases/tag/20260106
[20260105]: https://github.com/aymwoo/E-Bu/releases/tag/20260105
