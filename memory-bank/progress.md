# FreelyRSS 进度记录

## 当前状态

- 当前阶段：阶段 12 Step 86 已完成，首发前实现与架构回写已收尾。
- 本文件用途：记录接手项目时真正需要知道的当前状态、已落地能力、验证入口、下一步和风险。不再保存逐 Step 的流水账。
- 最后整理：2026-05-22。
- 总体结论：仓库已经从文档优先推进为可验证的 monorepo。后续不应沿着旧 86 步计划继续隐式加功能，而应先做发布 dry run，再为新需求建立新的 issue 或实施计划。

## 代码现状

已落地的仓库结构：

- `apps/desktop`：Tauri v2 + React 桌面端，包含三栏阅读 shell、源管理、OPML、搜索、批量操作、缓存设置、导出、任务状态、同步设置、本地 REST 状态入口和 AI 操作入口。
- `apps/web`：React Web 同步阅读入口，目前通过 remote client mock 表达远程只读边界。
- `apps/mobile`：Expo / React Native 阅读优先壳，覆盖同步快照、阅读、搜索、笔记草稿、播客卡片、移动缓存/分享能力边界。
- `apps/sync-server`：Axum 最小同步服务，提供登录、设备、加密事件上传/拉取、加密 blob 注册/列表，不暴露桌面业务表。
- `packages/ui`：共享 React UI 基础组件和主题变量。
- `packages/shared-types`：跨端 DTO、枚举、同步 payload 与字段边界类型。
- `packages/shared-query`：统一查询 AST、文本解析、JSON 序列化、校验、SQL plan。
- `packages/shared-config`：运行环境、代理、同步、AI、实验开关的默认值、环境变量解析、合并与校验。
- `crates/core-domain`：Rust 领域模型、SQLite v8 迁移、存储、FTS 搜索、AI artifact、规则审计、同步事件、备份恢复。
- `crates/feed-engine`：抓取、RSS/Atom/JSON Feed/HTML discovery 解析、标准化、SQLite 持久化和解析 fixture 回归。
- `crates/content-pipeline`：HTML 清洗、正文提取和内容模型。
- `crates/rule-engine`：查询表达式评估、规则动作计划和规则审计输入。
- `crates/search-engine`：搜索 crate 边界已预留，当前具体 FTS 实现仍在 `core-domain`。
- `crates/sync-engine`：同步批次、游标、加密、重放、合并、重试、WebDAV 对象存储和并发回归。
- `crates/integration-engine`：集成适配器、noop、Webhook、知识库 Markdown 导出。
- `crates/ai-adapter`：AI provider、mock provider、任务队列、摘要/关键词、翻译、限定上下文问答。
- `crates/performance-baseline`：万级文章性能基线测试 crate，仅用于验证，不属于运行时代码。

## 已完成能力摘要

- 工程基础：pnpm workspace、Cargo workspace、Biome、Changesets、lefthook、GitHub Actions、统一 `verify` 脚本。
- 桌面主链路：三栏 reader shell、路由状态、React Query 数据流、Zustand 视图状态、键盘快捷键、可访问性 landmark、高对比度主题。
- 订阅与阅读：源树、文章队列、阅读面板、状态标记、搜索高亮、虚拟队列、智能文件夹展示。
- 数据层：SQLite 迁移 v1-v8、WAL、外键、备份快照、恢复函数、业务表、索引、FTS5 和触发器。
- Feed 引擎：RSS/Atom/JSON Feed/HTML discovery、失败分类、增量抓取元数据、去重索引、fixture 回归。
- 内容与规则：正文提取、规则查询、动作计划、命中审计、智能文件夹所需查询模型。
- 缓存与导出：缓存策略/清理模型、Markdown/HTML/PDF 导出表面、批量操作、任务状态面板。
- 同步：本地 SyncEvent 边界、同步引擎、字段分类、AES-256-GCM 加密、WebDAV 对象存储、远程最小同步 API。
- 集成：Webhook 自动化适配器和知识库导出适配器。
- AI：默认由显式 UI 操作触发，结果写入 `AIArtifact`，支持缓存复用和删除；当前 provider 为 deterministic mock。
- Web：只读远程同步入口，不承担本地抓取、Tauri、桌面 SQLite、AI 生成或缓存维护。
- 移动端：阅读优先入口，不导入桌面 Tauri/SQLite/FeedEngine/本地 REST 职责。
- 发布文档：`docs/release-operations.md` 覆盖 fresh checkout、启动、验证、打包、运行数据、备份恢复、日志和故障处理。

## 当前验证入口

常用命令：

- `corepack pnpm run docs:links`
- `corepack pnpm run docs:release`
- `corepack pnpm run format:check`
- `corepack pnpm run lint`
- `corepack pnpm run test:desktop`
- `corepack pnpm run test:web`
- `corepack pnpm run test:mobile`
- `corepack pnpm run rust:fmt:check`
- `corepack pnpm run rust:clippy`
- `corepack pnpm run test:rust`
- `corepack pnpm run verify`

上一次里程碑记录中，`corepack pnpm run verify` 已通过。本文档精简后应至少重新跑 `docs:links` 和格式检查；若准备发布，应完整跑 `verify`。

## 发布前下一步

1. 按 `docs/release-operations.md` 在干净环境执行一次人工 dry run。
2. 记录 dry run 中出现的环境、打包、数据目录、备份恢复或启动问题。
3. 将问题拆成新的 issue 或新的实施计划，不要继续向旧 Step 86 后追加功能。
4. 如果要发布桌面版，补一次真实 Tauri 桌面窗口 smoke 验证；当前桌面 E2E 主要运行在 jsdom。

## 保留风险

- 发布 runbook 已有覆盖校验，但真实发布仍需要人工从 clean checkout 走完一次。
- 桌面本地 REST API 当前只读、loopback、token 保护；修改型操作仍需要单独设计用户确认流。
- 桌面文件日志目录已建立，旋转文件日志和用户可见恢复命令尚未暴露。
- 性能基线是 deterministic debug-test 预算，不是生产遥测。
- Web 和移动端是同步阅读入口，不是桌面完整能力复制品。
- 同步、AI、Webhook、知识库导出使用 deterministic provider 或本地适配器验证边界；生产账号、凭证、部署、限流和监控仍是后续工作。
- 未来 schema 变更必须继续走 `crates/core-domain/src/sqlite/migrations.rs` 和编号 SQL 迁移，不能在宿主层或测试里临时建表。

## 文档阅读顺序

1. `memory-bank/RSS-design-document.md`：产品定位和功能愿景。
2. `memory-bank/architecture.md`：当前代码事实、模块图、schema 和边界。
3. `memory-bank/progress.md`：当前状态、验证入口、风险和下一步。
4. `docs/release-operations.md`：发布和运维操作。
5. `memory-bank/implementation-plan.md`：历史 86 步计划，只作为追溯参考，不作为继续追加任务的入口。
