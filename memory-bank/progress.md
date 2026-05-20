# FreelyRSS 进度记录

## 当前状态

- 阶段：阶段 11 Step 79 已完成，移动端已建立 React Native + Expo 阅读优先壳；首期移动入口只覆盖登录/同步快照、文章阅读、搜索、笔记草稿/同步批注展示和播客附件消费入口，桌面 SQLite、Tauri command、本地抓取、复杂规则编辑、AI 生成、Webhook、知识库导出、本地 REST API 和桌面缓存逐出均标记为延后能力。
- 最后更新：2026-05-20
- 风险状态：已从“Step 78 已通过 `apps/web/src/web-scope.ts` 与测试固化 Web 边界；下一步 Step 79 应进入移动端阅读优先壳”推进到“Step 79 已通过 `apps/mobile/src/mobile-scope.ts`、`mobile-client.ts`、`mobile-selectors.ts` 与 Expo 入口固化移动端首期边界；下一步 Step 80 应在同一移动端边界内补齐离线缓存、音频播放、后台恢复和系统分享基础能力，不要引入复杂规则编辑器或桌面本地 host 职责。”

### 2026-05-20 状态快照（最新）

- 当前完成：阶段 11 Step 79 已完成，`apps/mobile` 从占位包推进为 React Native + Expo 基础应用，新增 `App.tsx`、`app.json`、`tsconfig.json`、`vitest.config.ts` 和 `src/` 下的移动端 scope contract、同步快照 mock facade、选择器与回归测试。移动端 UI 现在呈现登录同步状态、阅读队列、搜索入口、文章阅读页、同步笔记展示/草稿输入和播客附件卡片；范围 contract 明确允许登录/同步、阅读、搜索、笔记和播客消费，并显式延后桌面本地抓取、SQLite/Tauri、本地 REST、复杂规则、AI 生成、Webhook、知识库导出和桌面缓存逐出。
- 当前验证：`corepack pnpm --filter @freelyrss/mobile test`、`corepack pnpm --filter @freelyrss/mobile check`、`corepack pnpm run format:check`、`corepack pnpm run lint`、`corepack pnpm --filter @freelyrss/mobile exec expo export --platform ios --output-dir dist-mobile-check` 与 `corepack pnpm run verify` 全部通过。`dist-mobile-check` 为验证输出，已在验证后删除。
- 当前下一步：进入阶段 11 Step 80“适配移动端缓存与媒体能力”。应补齐移动端离线缓存、音频播放、后台恢复和系统分享基础能力，但继续避免复杂规则编辑器、桌面本地抓取、桌面 SQLite/Tauri、本地 REST API、Webhook、知识库导出或 AI 生成控制台进入移动端首期边界。

### 2026-05-20 状态快照（历史：Step 78）

- 当前完成：阶段 11 Step 78 已完成，新增 `apps/web/src/web-scope.ts`，集中定义 Web 首期允许操作、延后操作、需求清单和 scope summary；`remote-client` 现在随远程 snapshot 返回 scope contract 与 summary；`web-app` 不再直接读取本地 mock detail map，而是通过 `fetchRemoteArticleDetail` 读取远程文章详情，并在入口 DOM 上暴露 `data-scope-mode="remote-sync-access"` 与 `data-scope-blockers="0"` 作为测试与调试信号。新增 Web scope 回归测试，证明桌面专属能力被显式延后、初始 Web 需求没有阻塞项或越界项，并且 remote client 只暴露读取函数。
- 当前验证：`corepack pnpm --filter @freelyrss/web test`、`corepack pnpm --filter @freelyrss/web build`、`corepack pnpm run format:check`、`corepack pnpm run lint` 与 `corepack pnpm run verify` 全部通过。
- 当前下一步：进入阶段 11 Step 79“构建移动端阅读优先壳”。应在 `apps/mobile` 中建立 React Native + Expo 基础应用，只先覆盖登录/同步、文章阅读、搜索、笔记和播客消费；不要在 Step 79 中实现桌面端本地抓取、完整规则编辑器、AI 生成控制台、知识库导出、Webhook、本地 REST API 或深度系统集成。

### 2026-05-17 状态快照（历史：Step 75）

- 当前完成：阶段 10 Step 75 已完成，新增 `AiArticleActionWorkflow`、`AiArticleTranslationRequest`、`AiArticleQuestionRequest` 与 `AiTranslationMode`，在 `AiTaskQueue` / `AiProviderRegistry` 上组装翻译和限定上下文问答任务；队列缓存指纹现在纳入 task properties，避免同一文本在不同翻译模式或问答 scope 下误命中缓存。桌面端新增 `generate_article_translation` 与 `answer_article_question` Tauri 命令，负责从 SQLite 加载授权文章/来源/当前过滤结果上下文、复用既有 `AIArtifactStore` 缓存、运行 deterministic mock provider、持久化 `translation` 与 `question-answer` artifact 并返回 DTO。Reader UI 新增显式翻译/问答面板，支持整文翻译、选段翻译、当前文章/当前来源/当前过滤结果 scope 选择、引用上下文显示和任务状态追踪。
- 当前验证：`cargo test -p freelyrss-ai-adapter`、`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml ai_`、`cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`、`corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`、`corepack pnpm --filter @freelyrss/shared-types check`、`corepack pnpm --filter @freelyrss/desktop build`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace` 与 `corepack pnpm run verify` 全部通过。`desktop build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 10 Step 76“实现 AI 隐私与开关控制”。应让 AI 默认关闭，展示发送范围、Provider、缓存删除和重新生成入口；验证重点是 AI 关闭状态下打开阅读器不会自动触发任何 AI 请求。不要在 Step 76 中加入真实 provider SDK、远程上传默认开关、同步协议载荷变更、Webhook/知识库导出自动注入模型输出或本地 REST API 直接触发模型副作用。

### 2026-05-15 状态快照（历史：Step 72）

- 当前完成：阶段 10 Step 72 已完成，新增 `crates/ai-adapter`，定义本地/远程 AI Provider 的统一 manifest、能力枚举、任务输入/输出、任务提交、超时策略、固定重试策略、注册表和错误边界。当前能力覆盖摘要、关键词、翻译和受限上下文问答；`MockLocalAiProvider` 与 `MockRemoteAiProvider` 通过同一 `AiProviderRegistry::submit` 入口执行任务，证明本地模型和远程模型不会分裂成两套调用面。
- 当前验证：`cargo test -p freelyrss-ai-adapter`、`cargo fmt --all --check`、`cargo clippy -p freelyrss-ai-adapter --all-targets -- -D warnings`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run desktop:build` 与 `corepack pnpm run verify` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 10 Step 73“建立 AI 任务队列与缓存”。应把摘要、关键词、翻译和问答任务排入后台队列，并把完成结果写入 `AIArtifact`；不要在 Step 73 中加入真实 Provider SDK、默认自动启用 AI、reader UI 直连模型、同步事件载荷变更、Webhook/知识库导出自动注入模型输出或本地 REST API 直接触发文件/模型副作用。

### 2026-05-14 状态快照（历史：Step 71）

- 当前完成：阶段 9 Step 71 已完成，`crates/integration-engine` 新增 `KnowledgeBaseExportAdapter`、`KnowledgeBaseExportTarget`、`KnowledgeBaseExportProfile`、`ExportArticleSnapshot`、`ExportAnnotationSnapshot` 和 `ExportAnnotationType`。导出连接器会在调用方显式配置的根目录下生成相对 Markdown 产物，包括索引、文章页和标签页；通用 Markdown、Obsidian、Logseq 与 Notion Markdown profile 分别拥有独立目录/元数据映射。
- 当前验证：`cargo test -p freelyrss-integration-engine knowledge_base`、`cargo test -p freelyrss-integration-engine`、`cargo fmt --all --check`、`cargo clippy -p freelyrss-integration-engine --all-targets -- -D warnings`、`cargo clippy --workspace --all-targets -- -D warnings`、`corepack pnpm run desktop:build`、`cargo test --workspace` 与 `corepack pnpm run verify` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 10 Step 72“建立 AI Provider 抽象”。应在新的 AI provider 边界中定义本地/远程模型统一接口、任务提交、超时和重试规则；不要把 AI 调用放进 reader UI、integration-engine 的 Webhook/knowledge-base provider、sync-engine、WebDAV 传输或本地 REST API 路由。

### 2026-05-12 状态快照（历史：Step 69）

- 当前完成：阶段 9 Step 69 已完成，`crates/integration-engine` 新增 `WebhookAutomationAdapter`、`WebhookEndpoint` 和 `WebhookPayload`，把文章分享、规则命中或导出完成一类自动化事件映射为 Webhook JSON POST。自动化请求现在可以携带文章快照，使测试端能收到文章 id、标题、URL、摘要、标签和触发属性等元数据。
- 当前验证：`cargo test -p freelyrss-integration-engine webhook`、`cargo test -p freelyrss-integration-engine`、`cargo fmt --all --check`、`cargo clippy -p freelyrss-integration-engine --all-targets -- -D warnings`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run desktop:build` 与 `corepack pnpm run verify` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 9 Step 70“实现基础 REST API”。应把它作为本地桌面 API 处理，优先监听 `127.0.0.1`，保持只读为主和显式授权边界；不要复用远程同步 API，不要让 Webhook 适配器或第三方 provider 逻辑进入 reader UI，也不要开放未保护的业务表镜像。

### 2026-05-11 状态快照（历史：Step 68）

- 当前完成：阶段 9 Step 68 已完成，`crates/integration-engine` 从占位 crate 推进为可测试的集成边界，新增 `IntegrationAdapter` trait、`IntegrationManifest`、四类 `IntegrationKind` / `IntegrationCapability`、统一请求/响应模型、`IntegrationRegistry` 和 `NoopIntegrationAdapter`。四类能力分别覆盖桥接源转换、稍后读保存、文章导出和自动化事件分发。
- 当前验证：`cargo test -p freelyrss-integration-engine`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run desktop:build` 与 `corepack pnpm run verify` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 9 Step 69“实现 Webhook 出站能力”。应把 Webhook 作为 `IntegrationKind::Automation` / `DispatchAutomationEvent` 的具体适配器接入，不要让桌面 reader UI、同步服务器、WebDAV 对象存储或本地 schema 直接承载 Webhook provider 逻辑。

### 2026-05-11 状态快照（历史：Step 67）

- 当前完成：阶段 8 Step 67 已完成，`crates/sync-engine/src/webdav.rs` 新增 WebDAV 对象命名空间、对象存储 trait、内存测试存储、同步 manifest、密文事件对象写入/拉取和密文 blob 元数据清单写入/读取。WebDAV 拉取会复用 `package_encrypted_event_batch` 的游标语义，并有回归证明同一批密文事件经官方批次路径和 WebDAV 路径解密重放后收敛到同一业务状态。
- 当前验证：`cargo test -p freelyrss-sync-engine webdav`、`cargo test -p freelyrss-sync-engine`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run desktop:build` 与 `corepack pnpm run verify` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 9 Step 68“建立集成适配器边界”。应在 `crates/integration-engine` 中定义第三方桥接、稍后读、导出连接器和自动化入口的统一接口，不要把外部服务商逻辑塞进 reader UI、sync-engine、WebDAV 适配层或本地业务 schema。

### 2026-05-10 状态快照（历史：Step 65）

- 当前完成：阶段 8 Step 65 已完成，`crates/sync-engine/src/encryption.rs` 新增客户端主密钥、AES-256-GCM 加密包络、密文事件批次和 PBKDF2-HMAC-SHA256 主密钥恢复包。`apps/sync-server` 的远程事件 DTO 和内存存储已从明文 `payload` 切换为 `encryptedPayload`，上传、拉取和测试路径均不再暴露 `read_state`、笔记正文等明文用户状态。`packages/shared-types/src/sync.ts` 同步补齐密文事件和恢复包 DTO。
- 当前验证：`cargo test -p freelyrss-sync-engine`、`cargo test -p freelyrss-sync-server`、`corepack pnpm --filter @freelyrss/shared-types check`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run verify` 与 `corepack pnpm run desktop:build` 全部通过。`desktop:build` 仍出现既有 Vite 大 chunk 提示，但构建成功。
- 当前下一步：进入阶段 8 Step 66“实现桌面端同步设置界面”。应只建立同步开关、账号/服务器配置、设备列表、最近同步时间和错误提示 UI，不要在 Step 66 里实现 WebDAV 适配、对象存储上传、后台调度或把客户端主密钥暴露给同步服务器。

### 2026-05-10 状态快照（历史：Step 62）

- 当前完成：阶段 8 Step 62 已完成，`crates/sync-engine` 新增 `batch.rs`、`replay.rs`、`retry.rs` 与 `error.rs`，把事件批次、游标推进、重放副本状态、重复事件跳过、重试耗尽判断和同步错误建模从分类器中拆出。`crates/core-domain/src/sqlite/sync_event_store.rs` 的回归现在会把本地生成的 `SyncEvent` 行转换为 `SyncEventEnvelope`，打包后重放到空同步副本状态并确认用户状态、批注和订阅源移动均能收敛。
- 当前验证：`cargo test -p freelyrss-sync-engine`、`cargo test -p freelyrss-core-domain sync_event`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`cargo test --workspace`、`corepack pnpm run verify`、`corepack pnpm run desktop:build`、`cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --bins --features tauri/custom-protocol --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'"` 与 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` 全部通过。
- 当前下一步：进入阶段 8 Step 63“实现同步服务器骨架”，应在 `apps/sync-server` 建立最小远程同步 API，复用 Step 62 的事件批次、游标和重试语义，只暴露加密后的同步事件、密文对象索引与设备元数据，不直接暴露或复制 `Article`、`Feed`、`Annotation`、`UserState` 等客户端业务读取主表。

### 2026-05-09 状态快照

- 当前完成：阶段 8 Step 61 已完成，`crates/sync-engine` 已补齐订阅源字段更新、FeedTag attach/detach 与 ArticleTag attach/detach 的事件分类；`crates/core-domain` 新增 `LocalSyncEventStore`，可以把标记已读、创建笔记/批注、移动订阅源和标签归属写入与 `SyncEvent` 记录写入绑定为同一事务。
- 当前验证：`cargo test -p freelyrss-sync-engine`、`cargo test -p freelyrss-core-domain sync_event`、`cargo fmt --all --check`、`cargo clippy --workspace --all-targets -- -D warnings`、`corepack pnpm run verify`、`corepack pnpm run desktop:build` 与 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` 全部通过。
- 当前下一步：进入阶段 8 Step 62“建立同步引擎基础”，应在 `crates/sync-engine` 中围绕现有 `SyncEvent` 行实现事件批次打包、游标跟踪、失败重试和本地重放逻辑，继续避免把 SQLite 文件、FTS 行、规则审计内部载荷、正文缓存路径或 Step 59 task status 当作同步对象。

### 2026-04-30 状态快照

- 当前完成：阶段 8 Step 60 已完成，`packages/shared-types` 现已拥有同步专用 DTO、字段边界常量和服务端最小实体类型；`crates/sync-engine` 现已拥有纯同步分类器，可以把文章状态变更、批注变更、正文缓存物化/逐出、正文密文 blob 引用、文章标签关系变更和源抓取诊断归入正确边界。
- 当前验证：`corepack pnpm --filter @freelyrss/shared-types check`、`cargo test -p freelyrss-sync-engine`、`corepack pnpm run desktop:build`、`corepack pnpm run verify` 与 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` 全部通过。
- 当前下一步：进入阶段 8 Step 61“在本地实现事件日志生成”，应在用户状态、批注、标签归属和订阅结构变化落库时生成 `SyncEvent`，并继续保持正文缓存物化、本地抓取诊断、搜索索引和 Step 59 任务状态为本地事实。

### 2026-04-29 状态快照

- 当前完成：阶段 7 Step 57 已完成，`apps/desktop` 现已支持把当前选中文章或当前可见文章队列导出为独立 HTML 文档，并可准备面向桌面打印管线的 PDF print source。HTML/PDF 导出保留文章标题、来源、作者、发布时间、URL、标签、阅读状态、当前 reader 内容模式、正文、批注标记、批注备注、附件引用和导出报告。
- 当前验证：`corepack pnpm --filter @freelyrss/desktop test -- --run html-pdf-export.test.ts markdown-export.test.ts reader-shell.test.tsx`、`corepack pnpm run format`、`corepack pnpm run desktop:build`、`corepack pnpm run verify` 与 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` 全部通过。
- 当前下一步：进入阶段 7 Step 58“实现批量操作”，应复用当前可见队列选择边界，并把批量标记已读、加标签、稍后读和缓存删除保持在独立 mutation / repository 路径中，而不是改写导出 formatter 或 reader pane。

### 2026-04-27 状态快照

- 当前完成：阶段 7 Step 55 已完成，`apps/desktop` 现已拥有一个纯规划的 `cache-maintenance.ts` 清理层、一个会把结果应用到 mock shell snapshot 的 repository 路径，以及一个独立的左栏缓存维护卡片；当前清理逻辑会优先处理 policy mismatch，再对非星标 / 非稍后读 / 无 note 的缓存文章执行 LRU 淘汰，同时保留受保护文章的本地附件路径。
- 当前验证：`corepack pnpm --filter @freelyrss/desktop test`、`corepack pnpm run desktop:build`、`corepack pnpm run verify` 与 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` 全部通过。
- 当前下一步：进入阶段 7 Step 56“实现 Markdown 导出”，在不破坏当前 reader detail、annotation 和 cache cleanup 边界的前提下，把文章正文、元数据与批注映射到一个可复用的导出契约，而不是在 UI 组件里临时拼接 Markdown 文本。

## 已确认决策

- 身份模型采用多模式并存，但以“账号 + 设备”为核心。
- 匿名模式仅作为离线或自托管补充场景。
- Web 端是同步数据的远程访问入口，天然依赖账号体系。
- 服务端只存储同步所需的最小数据集，不复制客户端完整业务 schema。
- 查询系统采用“可视化构造器为主，文本查询为辅”的双输入模型，统一落到 AST。
- Release 1 包含高亮、批注、PDF 导出、Markdown / HTML 导出、批量导出、播客附件与播放器、智能文件夹。
- Release 1 不包含官方同步、Web、移动端、AI、本地桌面 API、团队协作。
- API 分为本地桌面 API 与远程同步 API 两层。
- 性能与稳定性验收标准已数值化。

## 当前阻塞

- 当前无阻塞；下一步风险点是阶段 11 Step 79 需要建立移动端阅读优先壳，同时保持移动端首期只覆盖同步入口、阅读、搜索、笔记和播客消费，不把桌面本地抓取、复杂规则编辑器、AI 生成、Webhook、知识库导出、本地 REST API 或深度系统集成提前搬入移动端。

## 本次执行记录

### 2026-04-06 - 阶段 1 Step 5：建立 monorepo 目录骨架

- 已创建顶层目录：`apps/`、`packages/`、`crates/`。
- 已创建应用预留目录：`apps/desktop`、`apps/web`、`apps/mobile`、`apps/sync-server`。
- 已创建共享包预留目录：`packages/ui`、`packages/shared-types`、`packages/shared-query`、`packages/shared-config`。
- 已创建 Rust crate 预留目录：`crates/core-domain`、`crates/feed-engine`、`crates/content-pipeline`、`crates/rule-engine`、`crates/search-engine`、`crates/sync-engine`、`crates/integration-engine`。
- 本步骤未初始化 `pnpm workspace`、`Cargo workspace`、CI、lint 或数据库迁移，以避免越过 `implementation-plan.md` 的下一步骤边界。

### 验证结果

- 已逐项校验 Step 5 要求的 15 个预留目录，结果全部存在。
- 已检查 `apps/`、`packages/`、`crates/` 的当前层级，结构与 `memory-bank/implementation-plan.md` 和 `memory-bank/tech-stack.md` 保持一致。
- 当前验证结论：Step 5 通过，可进入 Step 6“建立 JS/TS 与 Rust 工作区”。

### 2026-04-06 - 阶段 1 Step 6：建立 JS/TS 与 Rust 工作区

- 已创建根工作区清单：`package.json`、`pnpm-workspace.yaml`、`Cargo.toml`。
- 已为 `apps/desktop`、`apps/web`、`apps/mobile` 建立最小 `package.json`，使其能被 `pnpm workspace` 识别。
- 已为 `packages/ui`、`packages/shared-types`、`packages/shared-query`、`packages/shared-config` 建立最小 `package.json`，固化共享包命名边界。
- 已为 `crates/core-domain`、`crates/feed-engine`、`crates/content-pipeline`、`crates/rule-engine`、`crates/search-engine`、`crates/sync-engine`、`crates/integration-engine` 建立 `Cargo.toml` 与占位 `src/lib.rs`，使其能被 `Cargo workspace` 识别并编译。
- `apps/sync-server` 本次仍保持目录占位，尚未加入任何工作区清单，避免在 Step 6 越过服务端脚手架边界。
- 为完成 Rust 侧验证，当前机器已补装 `rustup` stable toolchain；这属于本地开发环境补齐，不改变仓库实施顺序。

### 验证结果

- 已执行 `corepack pnpm install --lockfile-only`，结果显示 `Scope: all 8 workspace projects`。
- 已执行 `corepack pnpm list -r --depth -1`，确认根包、3 个应用包和 4 个共享包全部被识别。
- 已执行 `cargo metadata --no-deps --format-version 1`，确认 7 个 Rust crate 全部被识别为 workspace members。
- 已执行 `cargo test --workspace`，结果通过；当前 crate 仅包含占位库目标，因此测试数为 0，但编译与工作区解析链路已经跑通。
- 当前验证结论：Step 6 通过，可进入 Step 7“确定统一代码规范”。

### 2026-04-06 - 阶段 1 Step 7：确定统一代码规范

- 已选定前端规范方案为 `Biome`（统一格式化与 lint，避免 ESLint + Prettier 双维护），并在根目录新增 `biome.json`。
- 已在根 `package.json` 增加统一检查脚本：`format`、`format:check`、`lint`、`lint:fix`、`rust:fmt`、`rust:fmt:check`、`rust:clippy`、`test:rust`、`verify`。
- 已引入 `lefthook` 并新增 `lefthook.yml`，定义 `pre-commit` 提交前检查链路：前端规范检查、Rust 格式检查、Rust Clippy。
- 已新增 `.gitignore`，忽略 `node_modules/` 与 `target/`，避免规范工具与 Rust 构建产物污染仓库视图。

### 验证结果

- 已执行 `corepack pnpm install`，安装并接线 `@biomejs/biome` 与 `lefthook`，`pre-commit` hook 已同步成功。
- 已执行 `corepack pnpm run format:check`，结果通过。
- 已执行 `corepack pnpm run lint`，结果通过。
- 已执行 `C:\Users\Administrator\.cargo\bin\cargo.exe fmt --all --check`，结果通过。
- 已执行 `C:\Users\Administrator\.cargo\bin\cargo.exe clippy --workspace --all-targets -- -D warnings`，结果通过。
- 已执行 `C:\Users\Administrator\.cargo\bin\cargo.exe test --workspace`，结果通过（当前测试数为 0，编译链路正常）。
- 已执行 `corepack pnpm run verify`（临时补充 `PATH` 以包含 cargo），结果通过，确认统一脚本可串行跑完前端与 Rust 检查。
- 已执行 `corepack pnpm exec lefthook run pre-commit --all-files`（临时补充 `PATH` 以包含 cargo），结果通过，确认提交前检查链路可执行且无冲突。
- 当前验证结论：Step 7 通过，可进入 Step 8“建立变更集与版本管理流程”。

### 2026-04-06 - 阶段 1 Step 8：建立变更集与版本管理流程

- 已在根工作区引入 `@changesets/cli`，并新增 `changeset`、`changeset:add`、`changeset:status`、`changeset:version` 脚本入口。
- 已初始化 `.changeset/` 目录，并保留 `config.json` 作为 workspace 版本计算配置入口。
- 已重写 `.changeset/README.md`，明确当前版本策略：JS/TS 客户端与共享包由 changesets 管理；同步协议版本、Rust crate 版本与数据库 schema 版本独立管理，不与包版本混用。
- 已创建一次 bootstrap changeset，并成功生成 7 个 JS/TS workspace 包的首批 `CHANGELOG.md` 与版本号草稿，验证变更记录可以落到每个包自己的发布线，而不是堆在仓库根级别。
- 已将 `apps/desktop`、`apps/web`、`apps/mobile`、`packages/ui`、`packages/shared-types`、`packages/shared-query`、`packages/shared-config` 的版本从 `0.0.0` 推进到 `0.0.1`，作为工作区版本管理基线。
- 已同步更新锁文件，确保版本管理工具链可复现安装。

### 验证结果

- 已执行 `corepack pnpm run changeset:status`，结果正确计算出 7 个包的 patch bump 计划，证明变更记录可生成预期的发布计划草稿。
- 已执行 `corepack pnpm run changeset:version`，结果成功写入各包版本号与 `CHANGELOG.md`，证明版本流转与发布说明草稿生成链路可用。
- 已执行 `corepack pnpm run verify`（临时补充 `PATH` 以包含 cargo），结果通过。
- 已执行 `corepack pnpm exec lefthook run pre-commit --all-files`（临时补充 `PATH` 以包含 cargo），结果通过。
- 当前验证结论：Step 8 通过，可进入 Step 9“建立基础 CI 流程”。

### 2026-04-07 - 阶段 1 Step 9：建立基础 CI 流程

- 已新增 `.github/workflows/ci.yml`，建立最小可用 CI。
- `docs-links` 作业负责 Markdown 本地链接校验。
- `workspace-verify` 作业负责 JS 依赖安装、前端格式与 lint、Rust 编译检查、格式检查、Clippy 与测试。
- 已新增 `scripts/check-doc-links.mjs`，提供与平台无关的文档本地链接校验，避免外部网络波动导致 CI 假失败。
- 已在根 `package.json` 新增 `docs:links` 脚本，并将其纳入 `verify` 链路，保证本地验证与 CI 校验口径一致。
- 已将 `memory-bank/tech-stack.md` 与 `memory-bank/architecture.md` 中引用 `RSS-design-document.md` 的绝对路径链接改为相对路径，消除跨平台链接检查误报。

### 验证结果

- 已执行 `corepack pnpm install`，依赖安装通过（覆盖 CI 中前端依赖安装环节）。
- 已执行 `corepack pnpm run verify`（含 `format:check`、`lint`、`rust:fmt:check`、`rust:clippy`、`test:rust`、`docs:links`），结果通过。
- 已执行 `cargo check --workspace`，Rust 工作区编译检查通过（覆盖 CI 中 Rust 编译环节）。
- 当前验证结论：Step 9 通过，可进入 Step 10“定义配置与环境变量边界”。

### 2026-04-07 - 阶段 1 Step 10：定义配置与环境变量边界

- 已在 `packages/shared-config` 内建立共享配置包实现，新增 `src/index.js`、`src/defaults.js`、`src/env.js`、`src/merge.js`、`src/validate.js`、`src/errors.js`，将配置默认值、环境变量解析、分层合并、错误建模与校验边界拆分为独立模块。
- 已定义配置覆盖范围：运行环境、运行目标、日志级别、代理设置、同步配置、AI 配置与实验性功能开关。
- 已固化配置来源优先级：`defaults -> standard-proxy-env -> freelyrss-env -> explicit-overrides`，其中标准代理环境变量复用 `HTTP_PROXY`、`HTTPS_PROXY` 与 `NO_PROXY`，FreelyRSS 专用变量使用 `FREELYRSS_` 前缀。
- 已在 `packages/shared-config/README.md` 写明环境变量约定、优先级与校验规则，避免后续桌面端、Web 端或测试环境各自发明配置口径。
- 已更新 `packages/shared-config/package.json` 暴露包入口，并为该包添加独立测试脚本；同时在根 `package.json` 新增 `test:config`，并将其接入 `verify`。
- 已更新 `.github/workflows/ci.yml`，让工作区校验作业显式执行共享配置测试，避免配置边界只在本地验证。

### 验证结果

- 已执行 `corepack pnpm run test:config`，4 个配置测试全部通过，覆盖桌面开发环境加载、桌面测试环境加载、同步缺失必填项报错与 AI 缺失凭证报错。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`。
- 已执行 `cargo check --workspace`，Rust 工作区编译检查通过，确认本次 JS/TS 侧改动未破坏现有根级验证链路。
- 当前验证结论：Step 10 通过，阶段 1 完成，可进入阶段 2 Step 11“初始化桌面应用壳”。

### 2026-04-07 - 阶段 2 Step 11：初始化桌面应用壳

- 已将 `apps/desktop` 从占位包推进为可运行桌面端前端壳，补齐 `index.html`、`tsconfig.json`、`vite.config.ts`、`src/main.tsx`、`src/App.tsx`、`src/styles.css` 与 `src/vite-env.d.ts`。
- 已在 `apps/desktop/package.json` 中接入 React 19、TypeScript 5.9、Vite 8 与 `@tauri-apps/cli`，并暴露 `dev`、`build`、`preview`、`tauri` 四类桌面壳入口。
- 已新增 `apps/desktop/src-tauri` 桌面宿主层，包含 `Cargo.toml`、`build.rs`、`tauri.conf.json`、`src/lib.rs`、`src/main.rs`、`capabilities/default.json` 与占位图标资源，使 Tauri 壳、前端构建产物与 Rust 入口可以接线。
- 已将 `src-tauri` 明确保持在根 Cargo workspace 之外，通过本地 `[workspace]` 边界把“应用宿主 crate”和“共享 Rust 引擎 crates”分离，避免后续把桌面运行时壳误并入共享核心模块。
- 已在根 `package.json` 新增 `desktop:dev`、`desktop:build`、`desktop:tauri:dev`、`desktop:tauri:build` 四个桌面相关脚本入口，并把 `.gitignore` / `biome.json` 调整到可忽略 `dist/`、`src-tauri/gen/` 与 `src-tauri/target/` 等生成产物。
- 已在本步骤中保持界面刻意最小化：当前 `App.tsx` 只承担“桌面壳已接线”的占位职责，不越过 Step 12 去提前定义共享设计系统或三栏阅读器布局。

### 验证结果

- 已执行 `corepack pnpm install`，桌面壳新增的 JS/TS 依赖安装通过。
- 已执行 `corepack pnpm run desktop:build`，确认桌面前端壳可完成 TypeScript 检查与 Vite 产物构建。
- 已执行 `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all --check`，桌面壳 Rust 宿主层格式检查通过。
- 已执行 `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'"`，确认 Tauri/Rust 宿主层可编译。
- 已执行 `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'" -- -D warnings`，桌面壳 Rust 宿主层静态检查通过。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认 `beforeBuildCommand`、前端产物路径、Tauri 配置与 Rust 入口可在 CLI 级别串通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已执行 `corepack pnpm run verify`，根级格式、lint、共享配置测试、Rust workspace 校验与文档链接检查全部通过。
- 说明：当前机器上 `crates.io` 直连在 Cargo 拉取依赖时表现不稳定，因此桌面壳 Rust/Tauri 验证命令使用了临时 `rsproxy` registry override；该镜像配置未写入仓库文件，仅用于本次环境中的验证拉取。
- 当前验证结论：Step 11 通过，可进入阶段 2 Step 12“建立共享 UI 基础包”。

### 2026-04-08 - 阶段 2 Step 12：建立共享 UI 基础包

- 已在 `packages/ui` 中建立共享 UI 基础包源码目录，新增 `src/index.ts`、`src/theme.css`、`src/lib/cx.ts` 与 `src/components/*`，把主题变量、分栏布局、卡片表面、按钮、输入框、列表分组和列表行拆分为多个纯展示层模块。
- 已将 `packages/ui/package.json` 从占位清单推进为可消费的 workspace 包，显式暴露包入口与 `theme.css` 样式入口，并补齐 React peer dependency 与本地 `@types/react` 开发依赖，保证共享包在 pnpm workspace 边界下具备稳定类型解析。
- 已将 `apps/desktop/package.json` 接入 `@freelyrss/ui`，并在 `apps/desktop/src/main.tsx` 中显式引入 `@freelyrss/ui/theme.css`，使桌面壳不再依赖本地全局主题定义。
- 已重写 `apps/desktop/src/App.tsx`，让桌面壳使用共享包中的 `ThemeRoot`、`SplitLayout`、`SplitPane`、`Surface`、`TextInput`、`Button`、`ListSection` 与 `ListRow` 组合出三栏预览界面，验证共享样式和组件边界已可服务后续阅读器布局。
- 已收敛 `apps/desktop/src/styles.css` 的职责，使其只负责桌面壳级组合与页面编排，不再承担长期共享设计系统角色。
- 本步骤中出现过一次类型边界问题：`packages/ui` 作为独立 workspace 包无法直接复用桌面壳的 React 类型声明；已通过在 `packages/ui` 内补齐 `@types/react` 解决，避免后续共享前端包重复踩到同类问题。

### 验证结果

- 已执行 `corepack pnpm install`，确认新增 workspace 依赖与共享包类型依赖均可被锁定与解析。
- 已执行 `corepack pnpm run desktop:build`，确认桌面壳在消费 `@freelyrss/ui` 后可完成 TypeScript 检查与 Vite 产物构建。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认共享 UI 接线后，桌面壳前端产物、Tauri 宿主装配与 Rust 入口链路仍可端到端打通。
- 当前验证结论：Step 12 通过，可进入阶段 2 Step 13“建立共享类型包”。

### 2026-04-08 - 阶段 2 Step 13：建立共享类型包

- 已将 `packages/shared-types` 从占位包推进为可独立检查的 TypeScript workspace 包，新增 `tsconfig.json`、`src/index.ts`、`src/ids.ts`、`src/primitives.ts`、`src/enums.ts`、`src/organization.ts`、`src/feed.ts`、`src/article.ts` 与 `src/automation.ts`，把标识符、基础 JSON/时间原语、状态枚举和各领域 DTO 拆分到多个文件，避免形成单一“大类型文件”。
- 已在 `packages/shared-types/package.json` 中补齐 `exports`、`types` 与 `check` 脚本，并为该包补充本地 `typescript` 开发依赖，使共享类型包可以在不依赖桌面壳工具链的前提下独立完成类型校验。
- 已在根 `package.json` 中新增 `test:types` 并接入 `verify`，把共享类型包纳入统一质量门禁，避免类型契约仅依赖桌面壳偶然消费时才暴露问题。
- 已在 `apps/desktop/package.json` 中接入 `@freelyrss/shared-types`，并重写 `apps/desktop/src/App.tsx` 的 mock 数据，让订阅源分组、文章列表、阅读详情、标签与批注示例全部受共享 DTO 约束，而不是继续使用壳内临时对象字面量。
- 已明确保留 `Rule.conditions`、`SmartFolder.queryDefinition`、`AIArtifact.result` 与 `SyncEvent.payload` 为 `JsonValue` 边界，占位承接后续阶段 2 Step 14 的共享查询表达式模型，同时避免在 Step 13 提前硬编码 AST 或服务端协议细节。

### 验证结果

- 已执行 `corepack pnpm install`，确认 `packages/shared-types` 的本地 TypeScript 依赖、桌面壳对 `@freelyrss/shared-types` 的 workspace 依赖以及锁文件更新均可稳定解析。
- 已执行 `corepack pnpm run test:types`，确认 `packages/shared-types` 可独立通过 `tsc --noEmit` 校验，不依赖桌面壳编译上下文。
- 已执行 `corepack pnpm run desktop:build`，确认桌面壳在消费 `@freelyrss/shared-types` 后可完成 TypeScript 检查与 Vite 构建。
- 已执行 `corepack pnpm run verify`，结果通过；其中已包含新接入的 `test:types`，证明共享类型包已纳入仓库统一验证链路。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认共享类型包接线后，桌面壳前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通。
- 当前验证结论：Step 13 通过，可进入阶段 2 Step 14“建立共享查询表达式包”。

### 2026-04-08 - 阶段 2 Step 14：建立共享查询表达式包

- 已将 `packages/shared-query` 从占位包推进为可独立校验和测试的 TypeScript workspace 包，补齐 `tsconfig.json`、`src/index.ts` 与 `test/query.test.mjs`，使其具备明确的源码入口、类型边界与包级验证入口。
- 已在 `packages/shared-query/src/ast.ts` 中固化规则、搜索和智能文件夹共用的查询 AST、排序定义与受控字段集合，并在 `src/schema.ts` 中集中维护字段别名、默认操作符、合法操作符与枚举取值，避免查询语义散落到应用壳或未来执行层。
- 已在 `packages/shared-query/src/builder.ts` 中提供“可视化构造器 -> AST”的构造接口，在 `src/text-query.ts` 中提供“文本查询 -> AST”的最小解析路径，并用 `src/normalize.ts` 统一收敛分组、取反与单子节点归一化，保证两种输入最终落到同一结构。
- 已在 `packages/shared-query/src/validate.ts` 与 `src/errors.ts` 中建立查询校验边界，显式拒绝非法字段、非法操作符、错误值类型和空列表谓词，避免把无效查询推迟到后续 Rust 引擎或数据库层才暴露。
- 已在 `packages/shared-query/src/serialize.ts` 中建立 AST 的 JSON 序列化与反序列化边界，在 `src/sql-plan.ts` 中输出面向 SQLite schema 的轻量 SQL 查询计划，当前覆盖 `Article`、`Feed`、`UserState`、`Attachment`、`Tag` 等核心实体的 where/join/order by 规划，但不在此阶段引入真实数据库执行器。
- 已在根 `package.json` 中新增 `test:query` 并接入 `verify`，使共享查询包拥有与共享配置、共享类型和 Rust workspace 同等级的独立质量门禁。

### 验证结果

- 已执行 `corepack pnpm install`，确认 `packages/shared-query` 的本地 TypeScript 依赖、脚本入口与锁文件状态均可稳定解析。
- 已执行 `corepack pnpm run test:query`，确认共享查询包可独立通过 `tsc --noEmit` 校验，并通过 4 个 Node 原生测试：构造器与文本查询归一化等价、JSON 序列化往返、SQL 计划编译输出、非法谓词校验。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`test:types`、新增的 `test:query`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`，证明当前步骤已纳入仓库统一验证链路。
- 当前验证结论：Step 14 通过，可进入阶段 2 Step 15“实现三栏主布局”。

### 2026-04-08 - 阶段 2 Step 15：实现三栏主布局

- 已重写 `apps/desktop/src/App.tsx`，把桌面壳从“共享包接线演示”推进为真正的三栏阅读器骨架：左栏承载来源上下文与订阅树占位，中栏承载文章队列与选中文章状态，右栏承载阅读面板与空状态回退。
- 已在桌面壳内显式收敛本步骤允许的局部状态，只保留 `selectedSourceId` 与 `selectedArticleId` 两类本地选择态，用于证明三栏交互骨架成立，但不提前引入真实查询执行、路由或数据库访问。
- 已继续复用 `packages/ui` 中的 `ThemeRoot`、`SplitLayout`、`SplitPane`、`Surface`、`TextInput`、`Button`、`ListSection` 与 `ListRow`，确认共享 UI 仍只提供展示层构件，桌面壳负责组合出阅读器结构，而不是把业务语义下沉回共享展示包。
- 已更新 `apps/desktop/src/styles.css`，为三栏壳补齐壳级响应式重排、滚动容器、空状态与阅读面板排版规则，确保窄窗口下右栏可下沉而不破坏左栏与中栏的基本可读性。
- 已保留当前阶段的数据边界为共享 DTO + 本地 mock：来源、文章、详情、标签、批注和附件示例仍受 `@freelyrss/shared-types` 约束，但不在本步骤越过 `implementation-plan.md` 去接入真实数据访问层。

### 验证结果

- 已执行 `corepack pnpm run desktop:build`，确认桌面壳在引入真实三栏骨架和局部选择态后，仍可完成 TypeScript 检查与 Vite 构建。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`，证明阶段 2 Step 15 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认三栏主布局接入后，桌面壳前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 当前验证结论：Step 15 通过，可进入阶段 2 Step 16“建立导航与视图状态框架”。

### 2026-04-09 - 阶段 2 Step 16：建立导航与视图状态框架

- 已将桌面壳从“单体 `App.tsx` 组合组件”重构为显式的应用层与功能层结构：`src/app` 承载 QueryClient 与 Router，`src/features/reader-shell` 承载 mock 数据、选择器、局部状态与三栏展示组件。
- 已在 `apps/desktop/package.json` 中接入 `@tanstack/react-router`、`@tanstack/react-query` 与 `zustand`，并新增 `vitest`、`@testing-library/react`、`@testing-library/user-event` 与 `jsdom` 作为桌面壳验证基础设施；根级 `package.json` 同步新增 `test:desktop` 并接入 `verify`。
- 已把“当前来源”“当前选中文章”迁移为路由搜索参数来源：`sourceId` 与 `articleId` 现在由 TanStack Router 承载，顶部导航条和左栏来源树共享同一导航入口，不再依赖壳组件内部 `useState` 维护选择态。
- 已把“当前视图/过滤条件”迁移为桌面壳局部 store 来源：`apps/desktop/src/features/reader-shell/state.ts` 通过 Zustand 收敛 `searchText`、`statusFilter` 与 `sortMode` 三类局部视图状态，避免把导航态与视图过滤态重新混回单体壳组件。
- 已在 `apps/desktop/src/features/reader-shell/selectors.ts` 中显式定义 route state + store state 的组合方式：先按来源路由筛选，再按视图过滤状态和本地搜索文本收敛文章队列，并在同一层内处理空队列回退与选中文章修正。
- 已让 `@freelyrss/shared-query` 在 Step 16 真正进入桌面壳的视图状态边界：桌面壳现在会把局部过滤状态构造成共享查询定义并展示 JSON 预览，但仍刻意停在“状态表达与预览”层，不越过当前阶段去执行真实 SQL 或数据库访问。
- 已引入桌面端自动化验收测试 `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`，覆盖“初始进入空来源路由时回收失效文章引用，再切回非空导航入口恢复有效选中文章”的关键回归场景，直接对应 Step 16 的验收目标。
- 已更新 `apps/desktop/src/styles.css` 与 `apps/desktop/vite.config.ts`，补齐顶部导航条、视图状态预览、字段集语义化工具栏与 `jsdom` 测试环境配置，使新的导航/状态框架既可被构建也可被自动化验证。
### 验证结果

- 已执行 `corepack pnpm run desktop:build`，确认引入路由、异步查询状态和局部 store 后，桌面壳仍可完成 TypeScript 检查与 Vite 生产构建。
- 已执行 `corepack pnpm run test:desktop`，新增 Vitest + Testing Library 用例通过，确认空数据路由切换时不会保留失效文章引用，且从空来源切回“Unread desk”后可恢复有效选中文章。
- 已执行 `corepack pnpm run verify`，结果通过；其中已包含新增的 `test:desktop`，证明阶段 2 Step 16 的桌面端状态框架已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认路由与测试依赖接入后，前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 2 Step 16 的交接记录、文件职责说明与新的架构边界见解，避免后续开发者仍按 Step 15 的单体壳认知继续推进。
- 当前验证结论：Step 16 通过，可进入阶段 2 Step 17“建立键盘与可访问性基础设施”。

### 2026-04-09 - 阶段 2 Step 17：建立键盘与可访问性基础设施

- 已新增 `apps/desktop/src/features/reader-shell/accessibility.ts`，集中收敛桌面壳的地标 id、快捷键映射与可编辑输入检测逻辑，避免导航条、三栏面板与测试文件各自硬编码快捷键事实来源。
- 已扩展 `apps/desktop/src/features/reader-shell/state.ts` 与 `apps/desktop/src/App.tsx`：桌面壳局部 store 现在除 `searchText`、`statusFilter`、`sortMode` 外，还承载 `themeTone` 与 reset 能力；根级 `App` 则只消费该壳级主题状态并把它传给 `ThemeRoot`，继续保持 provider 装配职责。
- 已更新 `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`、`navigation-strip.tsx`、`source-pane.tsx`、`queue-pane.tsx` 与 `reader-pane.tsx`，为顶部导航、三栏面板和页面顶部补齐以下无障碍基础设施：跳转链接、`Alt+1..4` 快捷键、可聚焦 landmark、稳定的 heading/landmark 命名、`aria-describedby` 快捷键提示与高对比模式入口。
- 已把中栏与右栏的 landmark 名称从“当前来源标题/当前文章标题”收敛为稳定的“Article queue / Reading panel”区域名，同时把当前来源标题和当前文章标题下沉为区域内上下文文本，避免屏幕阅读器把动态业务内容误当成区域恒定名称。
- 已扩展 `packages/ui/src/components/split-layout.tsx`、`packages/ui/src/components/theme-root.tsx` 与 `packages/ui/src/theme.css`：`SplitPane` 现在支持 ref 转发以承接区域聚焦，`ThemeRoot` 支持 `high-contrast` 主题变体，基础 token 层新增高对比颜色、轮廓与表面规则，使高对比能力保持在共享视觉边界而不是散落在桌面壳局部样式中。
- 已更新 `apps/desktop/src/styles.css`，补齐 skip links、区域聚焦轮廓、快捷键说明卡片与高对比切换按钮等仅属于桌面壳编排层的样式，不把这些壳级辅助结构反向塞回共享 UI 包。
- 已扩展 `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`，除保留 Step 16 的“空来源回收失效文章引用”回归场景外，新增“键盘快捷键可聚焦命名区域并切换高对比主题”的验收用例，把可访问性入口纳入自动化质量门禁。

### 验证结果

- 已执行 `corepack pnpm run desktop:build`，确认接入快捷键、地标命名、跳转链接与主题切换后，桌面壳仍可完成 TypeScript 检查与 Vite 生产构建。
- 已执行 `corepack pnpm run test:desktop`，2 个 Vitest + Testing Library 用例全部通过，确认旧有空路由回退逻辑未回归，且 `Alt+1..4` 快捷键与高对比主题入口可被自动化验证。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`，证明阶段 2 Step 17 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认桌面壳新增的无障碍层没有破坏前端构建、Tauri 宿主装配与 Rust 入口链路，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 2 Step 17 的交接记录、文件职责说明与新的架构边界见解，避免后续开发者在接入数据层时绕过已建立的键盘与地标边界。
- 当前验证结论：Step 17 通过，可进入阶段 3 Step 18“选定数据库迁移方案”。

### 2026-04-09 - 阶段 3 Step 18：选定数据库迁移方案

- 已在 `crates/core-domain` 中新增 `sqlite` 模块，建立桌面本地库的统一迁移入口，把连接预处理、迁移历史校验、待执行迁移判定、事务提交与迁移报告收敛到共享 Rust 边界，而不是直接塞进 `src-tauri`。
- 已落地两张系统表：`schema_migrations` 负责记录已执行迁移的版本、名称与时间；`app_metadata` 负责保存 bootstrap 级数据库元数据。这样 Step 19 起的所有业务表都可以通过同一套机制继续演进。
- 已将失败恢复策略编码化：每条迁移单独运行在 `IMMEDIATE` 事务中，单条迁移失败时自动回滚该事务；针对“已有库 + 存在待执行迁移”的场景，会在应用迁移前通过 `VACUUM INTO` 生成快照备份，并提供显式恢复函数清理 `-wal` / `-shm` 后回放快照。
- 已在 `apps/desktop/src-tauri/src/storage.rs` 中把桌面宿主的职责限制为“解析 app local data 目录、决定数据库文件与备份目录位置、在 setup 阶段触发初始化”；迁移语义、版本边界和恢复策略继续留在 `core-domain`，避免宿主层掌握数据库实现细节。
- 已将桌面本地数据库默认布局固定为 `app_local_data_dir()/database/freelyrss.sqlite3` 与 `app_local_data_dir()/database/backups/`，为后续 Step 22 的更完整本地数据分层预留稳定起点，但暂不越界引入正文缓存、媒体缓存或导出目录。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，5 个迁移相关测试全部通过，覆盖空库初始化、重复执行幂等、升级前备份生成、失败迁移事务回滚与从备份快照恢复数据库。
- 已执行 `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --message-format short`，确认桌面宿主对 `freelyrss-core-domain` 的接线可编译，`setup` 钩子在类型与依赖边界上成立。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `test:rust` 已纳入新增的 `core-domain` 迁移测试，证明 Step 18 已进入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认新增数据库初始化接线后，前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 当前验证结论：Step 18 通过，可进入阶段 3 Step 19“实现核心业务表”。

### 2026-04-09 - 阶段 3 Step 19：实现核心业务表

- 已把嵌入式迁移 SQL 从 `crates/core-domain/src/sqlite/migrations.rs` 中抽离为独立版本化文件：`crates/core-domain/src/sqlite/migrations/001_bootstrap_metadata.sql` 继续承载 bootstrap 元数据，`crates/core-domain/src/sqlite/migrations/002_core_business_tables.sql` 新增核心业务 schema，避免后续数据库演进继续堆进 Rust 多行字符串。
- 已在 `002_core_business_tables.sql` 中通过同一条迁移链路落地 `Folder`、`Tag`、`Feed`、`Article`、`FeedTag`、`ArticleTag`、`Attachment`、`UserState`、`Annotation`、`Rule`、`SmartFolder`、`AIArtifact` 与 `SyncEvent` 13 张业务表，表名与字段命名严格对齐 `architecture.md` 当前 schema 基线。
- 已把 Step 19 阶段就必须固定的数据库语义直接编码进业务表定义：主键、核心外键、联结表复合主键、布尔位 `CHECK`、受控枚举 `CHECK`、`UserState.reading_progress` 合法区间以及 `CURRENT_TIMESTAMP` 默认值，避免后续为补这些基础约束而重建整表。
- 已保持阶段边界：本次没有引入 `feed_url` 唯一索引、`feed_id + source_guid` 联合索引或时间/状态查询索引；这些补强继续留给 Step 20，避免把“建表”和“查询优化/唯一性补齐”混成同一步。
- 已在 `crates/core-domain/src/sqlite/mod.rs` 增加 schema 验收测试，逐表验证 13 张业务表的字段序列与 `architecture.md` 完全一致；同时同步更新空库初始化测试，使首次建库现在明确会应用 `v1 + v2` 两条迁移。

### 验证结果

- 已执行 `cargo fmt --all` 与 `cargo fmt --all --check`，确认 Step 19 新增迁移文件与 Rust 测试满足仓库 Rust 格式要求。
- 已执行 `cargo test -p freelyrss-core-domain`，6 个迁移相关测试全部通过；新增验收覆盖 13 张业务表存在性与字段序列校验，既保留 Step 18 的迁移安全测试，也补上 Step 19 的 schema 基线验证。
- 已执行 `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --message-format short`，确认桌面宿主对更新后的 `freelyrss-core-domain` 迁移集接线可编译，`setup` 阶段不会因 schema 版本提升而失效。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `test:rust`、`test:desktop`、共享查询/类型/配置校验与文档链接检查全部通过，证明 Step 19 已进入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认业务 schema 接入后前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 当前验证结论：Step 19 通过，可进入阶段 3 Step 20“补齐索引与约束”。

### 2026-04-11 - 阶段 3 Step 20：补齐索引与约束

- 已新增 `crates/core-domain/src/sqlite/migrations/003_core_business_indexes.sql` 作为数据库 `v3` 迁移文件，在不重写 Step 19 业务表的前提下补齐 `Feed.feed_url` 唯一索引、`Tag.scope + name` 唯一索引、`Article.feed_id + source_guid` 联合索引、文章时间字段索引、状态字段索引以及关联表/同步表查询索引。
- 已更新 `crates/core-domain/src/sqlite/migrations.rs` 的嵌入式迁移注册表，使本地数据库初始化链路从 `v1 + v2` 推进为 `v1 + v2 + v3`，继续保持版本号、迁移名与外部 `.sql` 资产一一对应。
- 已扩展 `crates/core-domain/src/sqlite/mod.rs` 中的迁移验收测试：除保留 Step 18 / Step 19 的建库、回滚、备份与字段序列验证外，新增索引存在性校验，以及“重复 `feed_url`、重复 `scope + name` 标签、非法外键、非法状态值会被 SQLite 拒绝”的数据库级约束验收。
- 本次索引补齐继续保持既有边界：`core-domain/sqlite` 负责 schema 演进与数据库级约束，`apps/desktop/src-tauri/src/storage.rs` 继续只负责桌面本地路径与启动接线，前端壳未提前引入任何直接 SQL 执行逻辑。

### 验证结果

- 已执行 `cargo fmt --all` 与 `cargo test -p freelyrss-core-domain`，8 个迁移相关测试全部通过；新增覆盖索引存在性与约束拒绝非法写入的验收场景。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `test:desktop`、`test:query`、`test:types`、`test:config`、`rust:clippy`、`test:rust` 与文档链接检查，证明 Step 20 已进入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认数据库 schema 提升到 `v3` 后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 当前验证结论：Step 20 通过，可进入阶段 3 Step 21“建立全文搜索表与同步更新机制”。

### 2026-04-11 - 阶段 3 Step 21：建立全文搜索表与同步更新机制

- 已新增 `crates/core-domain/src/sqlite/migrations/004_article_search_fts.sql` 作为数据库 `v4` 迁移文件，集中落地 `ArticleSearchSource` 搜索文档投影视图、`ArticleSearch` FTS5 虚拟表，以及围绕 `Article`、`Feed`、`ArticleTag`、`Tag` 的同步更新触发器。
- 已把文章搜索文档的组装边界固定在迁移层：标题、摘要、正文、作者、来源标题和文章标签名统一从 `ArticleSearchSource` 投影生成，避免后续搜索索引拼装逻辑回流到桌面宿主层或前端壳层。
- 已更新 `crates/core-domain/src/sqlite/migrations.rs`，将本地数据库 schema 版本从 `v3` 推进到 `v4`，继续保持版本号、迁移名与外部 `.sql` 资产一一对应。
- 已扩展 `crates/core-domain/src/sqlite/mod.rs` 中的迁移验收测试：新增 FTS 结构存在性校验、`v3 -> v4` 升级回填验证，以及“文章内容更新、来源标题更新、标签增删改、文章删除后搜索索引同步收敛”的数据库级回归场景。
- 本次实现继续保持既有边界：`core-domain/sqlite` 负责 FTS 结构与触发器演进，`apps/desktop/src-tauri/src/storage.rs` 继续只负责本地路径与启动接线，前端壳仍未提前接入直接 SQL 执行或真实搜索 UI。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，11 个迁移相关测试全部通过；新增覆盖 FTS 表/视图/触发器存在性、`v3 -> v4` 升级回填以及文章/来源/标签变更后的索引同步场景。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`，证明 Step 21 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认数据库 schema 提升到 `v4` 后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 3 Step 21 的交接记录、FTS schema 基线、文件职责说明与新的架构边界见解。
- 当前验证结论：Step 21 通过，可进入阶段 3 Step 22“建立本地缓存目录结构”。

### 2026-04-11 - 阶段 3 Step 22：建立本地缓存目录结构

- 已扩展 `apps/desktop/src-tauri/src/storage.rs` 的宿主路径模型：在保留 `database/freelyrss.sqlite3` 与 `database/backups/` 的前提下，新增 `cache/content/`、`cache/media/`、`exports/` 与 `logs/` 目录约定，把桌面端本地数据分层从“只有数据库”推进为“数据库 + 缓存 + 导出 + 日志”的稳定布局。
- 已将宿主启动入口从 `setup_local_database` 收敛为 `setup_local_storage`，使 `apps/desktop/src-tauri/src/lib.rs` 在 Tauri `setup` 阶段先创建完整目录布局，再继续沿用 `freelyrss-core-domain` 的 SQLite 初始化链路；数据库 schema 语义仍然完全留在 `core-domain/sqlite`。
- 已在 `apps/desktop/src-tauri/src/storage.rs` 中新增宿主侧单元测试，覆盖路径推导、目录创建与“数据库文件必须落在受管 `database/` 目录内”的初始化验收，避免 Step 22 继续依赖人工检查本地目录。
- 已在 `apps/desktop/src-tauri/Cargo.toml` 中补齐 `tempfile` 测试依赖，使桌面宿主私有路径契约拥有独立自动化验收入口，而不是只在根级 workspace 验证链中被间接覆盖。
- 本次实现继续保持既有边界：`core-domain/sqlite` 仍只负责迁移编排、schema 历史、索引与 FTS 结构；`apps/desktop/src-tauri/src/storage.rs` 只负责桌面宿主本地路径装配与目录初始化；前端壳继续停留在 route / store / query / accessibility 分层，不提前引入 SQL 执行或缓存消费逻辑。

### 验证结果

- 已执行 `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`，4 个宿主存储相关测试全部通过，覆盖数据库路径推导、完整目录布局创建以及数据库初始化落点校验。
- 已执行 `corepack pnpm run verify`，结果通过；其中包含 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links`，证明 Step 22 未破坏仓库既有质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认宿主本地目录布局扩展后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 3 Step 22 的交接记录、本地目录职责说明与新的架构边界见解。
- 当前验证结论：Step 22 通过，可进入阶段 3 Step 23“准备标准化测试数据集”。

### 2026-04-11 - 阶段 3 Step 23：准备标准化测试数据集

- 已在 `crates/feed-engine/tests/fixtures/` 下建立固定样本目录，并新增 `manifest.json` 作为样本清单入口，集中声明 RSS、Atom、JSON Feed、富媒体、重复文章、缺字段文章、长文与多语言场景的覆盖关系。
- 已新增测试专用文档 `crates/feed-engine/tests/fixtures/README.md`，明确这些样本只服务解析、标准化、回归与后续抓取验收，不进入 `src/` 运行时边界。
- 已补齐 5 份固定样本文件：`rss/rss-2-rich-media.xml`、`rss/rss-2-duplicates-and-missing-fields.xml`、`rss/rss-0.91-legacy.xml`、`atom/atom-longform-multilingual.xml` 与 `json-feed/json-feed-podcast.json`；其中额外纳入 RSS 0.91 兼容样本，为后续 Step 26 的 legacy RSS 解析预留回归资产。
- 已新增 `crates/feed-engine/tests/fixture_catalog.rs`，把“样本场景覆盖完整”“路径仍停留在测试目录”“文件签名与条目数符合声明”“关键 marker 未丢失”收敛为自动化测试，而不是依赖人工逐个检查 XML/JSON 文件。
- 已在 `crates/feed-engine/Cargo.toml` 中仅补齐测试期 `serde` / `serde_json` 依赖，并同步更新根 `Cargo.lock`；运行时库入口 `crates/feed-engine/src/lib.rs` 仍保持最小边界，未提前引入抓取或解析实现。
- 本次实现继续保持既有边界：固定样本全部停留在 `feed-engine` 的 `tests/` 范围；`core-domain/sqlite` 继续只负责 schema、索引与 FTS；`src-tauri` 宿主路径层与前端壳层没有消费这些测试资产。

### 验证结果

- 已执行 `cargo test -p freelyrss-feed-engine`，3 个样本目录校验测试全部通过，确认 manifest、样本文件、marker 与场景覆盖声明一致。
- 已执行 `corepack pnpm run verify`，结果通过；其中新增的 `freelyrss-feed-engine` 测试已纳入根级 `test:rust` 链路，证明 Step 23 已进入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认新增测试样本与 Rust 测试依赖未破坏桌面前端构建、Tauri 宿主装配与 Rust 入口链路，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 3 Step 23 的交接记录、测试样本文件职责说明与新的架构边界见解。
- 当前验证结论：Step 23 通过，可进入阶段 3 Step 24“建立 Rust 领域模型”。

### 2026-04-11 - 阶段 3 Step 24：建立 Rust 领域模型

- 已在 `crates/core-domain/src/model/` 下新增 `mod.rs`、`error.rs`、`ids.rs`、`primitives.rs`、`enums.rs`、`organization.rs`、`feed.rs`、`article.rs` 与 `automation.rs`，把领域层拆分为实体、值对象、受控枚举与错误模型四类边界，而不是继续把领域语义混在 `sqlite` 迁移模块里。
- 已在 `crates/core-domain/src/lib.rs` 中同时导出 `model` 与 `sqlite`，使 `freelyrss-core-domain` 从“只暴露迁移能力”推进为“同时暴露领域语义与持久化边界”的共享 Rust 入口。
- 已在 `crates/core-domain/Cargo.toml` 中补齐 `serde` 与 `serde_json` 依赖，使 typed id、字符串值对象与 JSON 值对象都能保持稳定序列化能力，为后续桌面宿主、抓取引擎和查询/同步层复用这些模型预留一致的数据表示。
- 已新增 `crates/core-domain/src/sqlite/records.rs`，把 SQLite 记录层显式收敛为存储侧翻译边界：它负责把 `0/1` 布尔位、JSON 文本列与字符串枚举转换为领域层的 `bool`、`JsonBlob` 与受控枚举，避免这些 SQLite 专有表示泄漏进 `core-domain/model`。
- 已把 `UserState.reading_progress` 的合法区间校验前移到领域层 `UserState::validate()`，证明 Step 24 的目标不是“列出 struct”，而是把数据库语义中会继续影响业务逻辑的约束显式固定到领域模型。
- 已在 `crates/core-domain/src/sqlite/records.rs` 中补齐 record/domain 往返测试与非法值拒绝测试，覆盖组织类实体、Feed/Article、附件/状态/批注、规则/智能文件夹/AI 产物/同步事件四组模型，验证“字段不丢失、JSON 语义不变、非法布尔位/非法枚举/非法 JSON 不会漏进领域层”。
- 本次实现继续保持既有边界：`core-domain/model` 只表达领域语义与共享命名，`core-domain/sqlite` 继续负责迁移与存储翻译，`feed-engine` 的固定样本仍停留在测试目录，桌面宿主与前端壳没有提前接入任何真实抓取或查询执行逻辑。

### 验证结果

- 已执行 `cargo fmt --all`、`cargo test -p freelyrss-core-domain`、`cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings` 与 `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --message-format short`，确认 Step 24 的领域模型、记录映射测试与桌面宿主接线全部通过。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 24 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认新增领域层与存储翻译层后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 3 Step 24 的交接记录、领域模型文件职责说明与新的架构边界见解。
- 当前验证结论：Step 24 通过，可进入阶段 4 Step 25“建立抓取器抽象”。

### 2026-04-11 - 阶段 4 Step 25：建立抓取器抽象

- 已在 `crates/feed-engine/src/` 下新增 `error.rs`、`model.rs`、`ports.rs` 与 `fetcher.rs`，把抓取链路拆分为统一错误模型、阶段间公共数据模型、`transport / parser / normalizer / repository` 四段端口，以及只负责调用编排的 `FeedFetcher`，避免在还没有真实网络和解析实现前就把抓取逻辑直接写回 UI、宿主层或 `core-domain/model`。
- 已在 `crates/feed-engine/src/lib.rs` 中集中导出 Step 25 的公共入口，使后续调度层、桌面宿主或解析实现可以只消费 `freelyrss-feed-engine` 的稳定 API，而不必深链具体模块文件。
- 已在 `crates/feed-engine/Cargo.toml` 中补齐运行时 `freelyrss-core-domain` 与 `thiserror` 依赖，让 `FeedFormat`、`FeedId`、`UrlString`、`IsoDateTime` 等共享 Rust 领域类型可以直接进入抓取器边界，同时保持 crate 尚未提前引入任何真实 HTTP 客户端或 XML/JSON 解析库。
- 已新增 `crates/feed-engine/tests/fetcher_pipeline.rs`，通过 stub `transport`、stub `parser`、stub `normalizer` 与 stub `repository` 建立空实现接线测试，验证“无真实网络请求时抓取编排仍能闭环”和“解析阶段失败后不会错误进入标准化 / 持久化阶段”两类核心场景。
- 本次实现继续保持既有边界：`FeedFetcher` 只负责按顺序编排四段端口，不承担网络细节、格式解析或存储实现；`core-domain/model` 继续只承载稳定领域语义；Step 23 的固定样本仍停留在 `feed-engine/tests/fixtures/`，为 Step 26 之后的真实解析验收预留输入资产，而没有回流到桌面宿主或前端壳层。

### 验证结果

- 已执行 `cargo fmt --all` 与 `cargo test -p freelyrss-feed-engine`，确认 Step 25 新增的 2 个抓取器接线测试和既有 3 个样本目录校验测试全部通过。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 25 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认新增抓取器抽象与 `feed-engine` 运行时依赖后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 25 的交接记录、抓取器抽象文件职责说明与新的架构边界见解。
- 当前验证结论：Step 25 通过，可进入阶段 4 Step 26“支持 RSS 与 Atom 解析”。

### 2026-04-11 - 阶段 4 Step 26：支持 RSS 与 Atom 解析

- 已在 `crates/feed-engine/src/` 下新增 `normalizer.rs` 与 `parser/` 目录，把 Step 25 预留的 `FeedParser` / `FeedNormalizer` 端口收敛为默认实现：`DefaultFeedParser` 负责格式探测与 XML 解析分发，`DefaultFeedNormalizer` 负责把解析结果投影到统一 `NormalizedFeedBatch`，避免调用方在宿主层手工拼接默认标准化逻辑。
- 已在 `crates/feed-engine/src/parser/mod.rs` 中实现 UTF-8 检查、XML 根节点探测、RFC 3339 / RFC 2822 时间规范化与 URL / 语言值对象转换，并把 RSS 与 Atom 的具体字段映射继续拆分到 `parser/rss.rs` 和 `parser/atom.rs`，保持格式分支不回流到 `fetcher.rs`、宿主层或 UI。
- 已在 `crates/feed-engine/src/parser/rss.rs` 中补齐 RSS 2.0 与 RSS 0.9x 解析路径，覆盖 `channel/item`、`guid`、`link`、`author`、`description`、`content:encoded`、`enclosure`、`media:thumbnail` 与 `media:content` 等字段，并把 enclosure / media 统一投影为 `ParsedAttachment`。
- 已在 `crates/feed-engine/src/parser/atom.rs` 中补齐 Atom 1.0 解析路径，覆盖 `feed/entry`、`link rel`、`author`、`summary`、`content type=xhtml|html`、`published` / `updated` 与 `xml:lang` 继承，并保留 XHTML / HTML 正文入口，供后续正文抽取与内容清洗继续复用。
- 已新增 `crates/feed-engine/tests/parser_fixtures.rs`，用 Step 23 固定样本对 RSS 2.0 富媒体、RSS 0.91 兼容、Atom 长文多语言与默认标准化输出做回归验收；本次实现继续保持既有边界：解析样本仍只停留在 `feed-engine/tests/fixtures/`，`FeedFetcher` 继续只负责编排四段端口，桌面宿主与前端壳层没有提前引入真实 feed 解析分支。

### 验证结果

- 已执行 `cargo fmt --all`、`cargo clippy -p freelyrss-feed-engine --all-targets -- -D warnings` 与 `cargo test -p freelyrss-feed-engine`，确认新增默认 parser / normalizer、4 个样本回归测试以及既有 Step 25/Step 23 验收测试全部通过。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 26 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认新增 `roxmltree` / `chrono` 依赖与 `feed-engine` 默认解析实现后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 26 的交接记录、默认 parser / normalizer 文件职责说明与新的架构边界见解。
- 当前验证结论：Step 26 通过，可进入阶段 4 Step 27“支持 JSON Feed 解析”。

### 2026-04-11 - 阶段 4 Step 27：支持 JSON Feed 解析

- 已在 `crates/feed-engine/src/parser/json_feed.rs` 新增 JSON Feed 默认解析模块，使用 `serde` / `serde_json` 把 JSON Feed 1.1（兼容 version 1 / 1.1）收敛到与 RSS / Atom 相同的 `ParsedFeedDocument` / `ParsedArticle` / `ParsedAttachment` 契约，而不是在宿主层引入 JSON 专用分支。
- 已更新 `crates/feed-engine/src/parser/mod.rs`，把默认 parser 的格式分发从“仅支持 XML”推进为“JSON 走 `json_feed`，XML 继续走 `rss` / `atom`”；`FeedFetcher`、`FeedNormalizer` 与四段端口接口保持不变，Step 25 的编排边界没有回流。
- 已更新 `crates/feed-engine/Cargo.toml`，将 `serde` / `serde_json` 从仅测试依赖推进为运行时依赖，使 JSON Feed 解析能力属于 `feed-engine` crate 的正式默认实现，而不再只是固定样本目录校验工具链的一部分。
- 已扩展 `crates/feed-engine/tests/parser_fixtures.rs`，新增 JSON Feed 样本的解析回归与标准化回归，覆盖文本正文、HTML 正文、音频 / 视频 / 图片 attachments、缩略图回退与发布时间映射，继续复用 Step 23 已固定的 `json-feed/json-feed-podcast.json` 样本资产。
- 本次实现继续保持既有边界：`FeedFetcher` 继续只负责编排，`DefaultFeedNormalizer` 继续只消费统一解析结果并投影为统一标准化结果，JSON Feed 固定样本继续只停留在 `feed-engine/tests/fixtures/`，没有反向混入桌面宿主、前端壳层或 `core-domain/model`。

### 验证结果

- 已执行 `cargo fmt --all`，确认新增 JSON Feed parser 与测试文件格式化通过。
- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；其中包含 Step 25 抓取器接线测试、Step 23 样本目录验收，以及新增的 2 个 JSON Feed 解析 / 标准化回归测试。
- 已执行 `cargo clippy -p freelyrss-feed-engine --all-targets -- -D warnings`，结果通过，确认 Step 27 未引入新的 Rust 静态分析问题。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 27 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认 `feed-engine` 新增 JSON 运行时依赖与默认 parser 后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 27 的交接记录、JSON parser 文件职责说明与新的架构边界见解。
- 当前验证结论：Step 27 通过，可进入阶段 4 Step 28“支持网页 feed 自动发现”。

### 2026-04-13 - 阶段 4 Step 28：支持网页 feed 自动发现

- 已在 `crates/feed-engine/src/model.rs` 中新增 `ParsedSource`、`FeedDiscoveryResult`、`DiscoveredFeed` 与 `FetchRunOutput`，把 parser / fetcher 的公共契约从“只能成功返回 feed 文档”推进为“可以返回已解析 feed 文档，或返回网页自动发现结果”，避免用错误字符串承载“多个候选 feed / 未发现 feed”这类正常控制流。
- 已更新 `crates/feed-engine/src/ports.rs` 与 `crates/feed-engine/src/fetcher.rs`，使 `FeedParser` 端口显式返回 `ParsedSource`，并让 `FeedFetcher` 在收到 discovery 结果时于 parse 阶段后直接短路返回，不再误进 normalize / persist；这继续保持 Step 25 确立的编排边界，而没有把 HTML 判定回流到桌面宿主或前端壳层。
- 已在 `crates/feed-engine/src/parser/html.rs` 新增 HTML 自动发现模块，并更新 `crates/feed-engine/src/parser/mod.rs`：默认 parser 现在会在 JSON / XML 之外识别 HTML 页面，读取 `<link rel="alternate">` 中的 RSS / Atom / JSON Feed 链接，支持 `<base href>` 与相对链接解析，并把“单个候选源”“多个候选源”“未发现任何源”收敛为统一 discovery 结果。
- 已更新 `crates/feed-engine/Cargo.toml` 与根 `Cargo.lock`，补齐 `scraper` 与 `url` 运行时依赖，使 HTML 解析与相对 URL 解析继续留在 `feed-engine` 内部，而不扩散到宿主层或共享领域层。
- 已扩展 `crates/feed-engine/tests/fetcher_pipeline.rs`，新增 discovery 短路验收，验证 `FeedFetcher` 在收到 HTML 自动发现结果后只执行 `fetch -> parse`，不会继续进入 `normalize` 与 `persist`。
- 已扩展 `crates/feed-engine/tests/parser_fixtures.rs` 与 `crates/feed-engine/tests/fixture_catalog.rs`，并在 `crates/feed-engine/tests/fixtures/html/` 下新增 `html-single-feed.html`、`html-multiple-feeds.html` 与 `html-no-feed.html` 三份固定样本；同时更新 `tests/fixtures/manifest.json` 与 `tests/fixtures/README.md`，把 HTML discovery 场景正式纳入与 RSS / Atom / JSON Feed 同级的长期回归资产。
- 本次实现继续保持既有边界：`DefaultFeedNormalizer` 继续只消费 `ParsedFeedDocument`，`FeedRepository` 继续只处理标准化结果；HTML 自动发现仅作为 parser 私有前置分支与 fetcher 的成功短路结果存在，尚未提前接入任何数据库写入或 UI 决策逻辑。

### 验证结果

- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；其中包含 3 个抓取器编排测试、3 个固定样本目录校验测试，以及 9 个 parser / normalizer / HTML discovery 回归测试。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 28 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，确认 `feed-engine` 新增 HTML discovery 运行时依赖与解析分支后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 28 的交接记录、HTML discovery 文件职责说明与新的架构边界见解。
- 当前验证结论：Step 28 通过，可进入阶段 4 Step 29“实现订阅源持久化流程”。

### 2026-04-16 - 阶段 4 Step 29：实现订阅源持久化流程

- 已在 `crates/core-domain/src/sqlite/store.rs` 新增 `FeedStore`，把 `Feed`、`Article`、`Attachment` 与默认 `UserState` 的 SQLite 写入语义正式收敛到 `core-domain/sqlite`：该模块负责按事务 upsert `Feed` / `Article`、初始化首批文章的默认阅读状态，并在同一篇文章重写时替换其附件集合。
- 已扩展 `crates/core-domain/src/sqlite/error.rs` 与 `crates/core-domain/src/sqlite/mod.rs`，为持久化层补齐 `StoreError`、`prepare_database_connection` 与 `FeedStore` / `FeedGraphPersistReport` 公共出口，使桌面宿主初始化链与抓取引擎仓储接线都能复用同一套 SQLite 连接准备与存储边界。
- 已在 `crates/feed-engine/src/sqlite_repository.rs` 新增 `SqliteFeedRepository`，把标准化结果映射成领域对象后落入 `FeedStore`：新建订阅时会先按 `feed_url` 复用既有 `Feed.id` 或生成稳定 `FeedId`，已存在文章则按 `source_guid` 复用 `Article.id`，从而在后续刷新时保留既有 `UserState` 与用户自定义的 `Feed.custom_name` / 排序 / 更新频率等字段。
- 已更新 `crates/feed-engine/src/lib.rs` 与 `crates/feed-engine/Cargo.toml`，公开默认 SQLite 仓储实现，并补齐 `rusqlite`、`sha2` 与 `tempfile` 依赖，使 `feed-engine` 自己拥有可回归的真实持久化接线验收，而不需要把 SQLite 细节扩散到桌面壳或前端层。
- 已为 Step 29 新增两类真实落库测试：其一验证“新建订阅 -> 首批文章 -> 附件 / 默认 `UserState`”闭环；其二验证重复持久化时会复用既有 `Feed` / `Article` 标识、保留用户字段与阅读状态，并替换旧附件而不是追加脏数据。
- 本次实现继续保持既有边界：`FeedFetcher` 仍只负责编排 `fetch -> parse -> normalize -> persist`；HTML discovery 继续在 parse 后短路，不会进入持久化；真正的 SQL 与默认状态初始化职责继续留在 `core-domain/sqlite`，而不是回流到宿主层或 UI。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，结果通过；现有 16 个迁移、索引、FTS 与 record/domain 往返测试全部通过，确认 Step 29 没有破坏既有 SQLite 基线。
- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；除既有抓取链与样本回归外，新增 2 个真实 SQLite 仓储测试也全部通过。
- 已执行 `cargo fmt --all` 与 `corepack pnpm run verify`，结果通过；其中 `rust:fmt:check`、`rust:clippy`、`test:rust` 以及前端、共享包与文档链路检查全部通过，证明 Step 29 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，结果通过；确认 `freelyrss-core-domain` 与 `freelyrss-feed-engine` 新增持久化接线后，桌面端前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 29 的交接记录、文件职责说明与新的架构洞察。
- 当前验证结论：Step 29 通过，可进入阶段 4 Step 30“实现去重规则”。

### 2026-04-16 - 阶段 4 Step 30：实现去重规则

- 已在 `crates/core-domain/src/sqlite/migrations/005_article_dedup_indexes.sql` 新增数据库 `v5` 迁移，为 `Article` 补齐按 `feed_id` 收敛的 `canonical_url`、`original_url`、`title + published_at` 与 `content_hash` 去重辅助索引；`crates/core-domain/src/sqlite/migrations.rs` 已同步把该迁移注册到嵌入式迁移序列中，避免 Step 30 的查重查询退化为无索引扫描。
- 已在 `crates/core-domain/src/sqlite/store.rs` 新增 `find_article_id_by_url`、`find_article_id_by_title_and_published_at` 与 `find_article_id_by_content_hash`，把 URL、标题+发布时间+来源与内容哈希三层数据库级匹配规则继续收敛在共享 SQLite 边界，而不是散落到桌面宿主或前端壳层。
- 已更新 `crates/feed-engine/src/sqlite_repository.rs`，让 `SqliteFeedRepository` 在持久化前按“已存在 `source_guid` -> URL -> 标题+发布时间+来源 -> 内容哈希 -> 稳定回退 ID”的顺序解析文章身份；同时新增批次内去重注册表，使同一批抓取结果中的重复条目会折叠到同一个 `Article.id`，并采用“首个匹配条目保留、后续重复条目跳过”的策略，避免同批次内仍写入重复文章。
- 已在同一文件中补齐内容哈希推导与稳定 ID 回退：当文章缺失 `source_guid` 时，会优先使用 canonical/original URL、标题+发布时间或内容哈希生成稳定 `ArticleId`，并把内容哈希落到 `Article.content_hash`，为后续刷新复用与增量抓取奠定一致身份基础。
- 已新增 Step 30 回归测试：其一使用 `rss-2-duplicates-and-missing-fields.xml` 真正验证同批次重复 canonical URL 只落 2 篇文章且不会误删稀疏文章；其二分别验证“无 guid / 无 URL 时按标题+发布时间复用文章身份”和“无 guid / 无 URL / 无发布时间时按内容哈希复用文章身份”。同时 `crates/core-domain/src/sqlite/mod.rs` 已新增 `v4 -> v5` 迁移验收，确认去重辅助索引会在升级路径中落地。
- 本次实现继续保持既有边界：`FeedFetcher` 仍只负责 `fetch -> parse -> normalize -> persist` 编排；真正的去重查询继续留在 `core-domain/sqlite`，批次内折叠与稳定 ID 选择继续留在 `feed-engine` 默认 SQLite 仓储实现，HTML discovery 仍在 parse 后短路，不进入持久化。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，结果通过；现有 17 个 SQLite 迁移、索引、FTS、升级与约束测试全部通过，其中包含 Step 30 新增的 `v4 -> v5` 去重索引升级验收。
- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；除既有抓取链、fixture 目录和 parser / normalizer 回归外，新增的 3 个去重仓储测试全部通过。
- 已执行 `corepack pnpm run verify`，结果通过；其中 `format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过，证明 Step 30 已纳入仓库统一质量门禁。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，结果通过；确认 `freelyrss-core-domain` 的 `v5` 迁移与 `freelyrss-feed-engine` 的去重仓储逻辑接入后，桌面端前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 30 的交接记录、文件职责说明与新的架构洞察。
- 当前验证结论：Step 30 通过，可进入阶段 4 Step 31“实现增量抓取与缓存头支持”。

### 2026-04-18 - 阶段 4 Step 31：实现增量抓取与缓存头支持

- 已在 `crates/feed-engine/src/model.rs` 新增 `NotModifiedFeed`、`TransportFetchOutput`、`RecordedFeedCheck` 与 `FetchNotModifiedReport`，把 `304 Not Modified` 从普通成功响应中显式拆出，避免后续继续依赖状态码字符串分支做控制流。
- 已在 `crates/feed-engine/src/ports.rs`、`crates/feed-engine/src/fetcher.rs` 与 `crates/feed-engine/src/lib.rs` 把 transport / fetcher / 对外 API 推进为“修改后正文”与“未修改响应”双分支；`FeedFetcher` 在 not-modified 路径下只记录检查结果，不再进入 parser / normalizer / persist 主链路。
- 已新增 `crates/feed-engine/src/transport.rs` 与 `ReqwestFeedTransport` / `FeedTransportOptions`，集中收敛 `Accept`、`If-None-Match`、`If-Modified-Since`、请求超时、最大重试次数、重试间隔与响应元数据投影；瞬态网络错误和 `408` / `429` / `5xx` 会在 transport 内重试，不回流到宿主或 UI。
- 已在 `crates/feed-engine/src/sqlite_repository.rs` 与 `crates/core-domain/src/sqlite/store.rs` 补齐 not-modified 记账闭环：当 feed 返回 `304` 时，会复用既有 `Feed.id`，更新 `feed_url`、`last_checked_at`、`last_success_at`、`etag` 与 `last_modified`，同时不重写 `Article`、`Attachment` 或 `UserState`。
- 已扩展 `crates/feed-engine/tests/fetcher_pipeline.rs`、`crates/feed-engine/src/transport.rs` 内部测试与 `crates/feed-engine/src/sqlite_repository.rs` 仓储测试，分别覆盖条件请求头透传、`304` 短路、瞬态 HTTP 状态重试、not-modified 记账与“未变更不重写文章”的回归场景；本次还把 `transport.rs` 中仅供测试使用的辅助方法限制在 `#[cfg(test)]` 下，确保仓库级 `clippy -D warnings` 通过。
- 本次实现继续保持既有边界：HTTP 缓存语义留在 `feed-engine` transport 与 fetcher 成功分支中，真正的数据库状态更新继续留在 `SqliteFeedRepository` / `FeedStore`；parser、normalizer、桌面宿主与前端壳层没有新增任何缓存头判断或重试逻辑。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，结果通过；17 个 SQLite 迁移、索引、FTS、升级与约束测试全部通过。
- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；8 个 crate 内测试、4 个抓取编排测试、3 个 fixture 目录测试与 9 个 parser / normalizer 回归测试全部通过，覆盖条件请求、`304` 短路、重试与持久化记账路径。
- 已执行 `corepack pnpm run verify`，结果通过；`format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，结果通过；确认 `feed-engine` 新增 transport、条件请求与 not-modified 分支后，桌面端前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 当前验证结论：Step 31 通过，可进入阶段 4 Step 32“建立源健康状态与错误分类”。

### 2026-04-18 - 阶段 4 Step 32：建立源健康状态与错误分类

- 已在 `crates/core-domain/src/model/enums.rs`、`crates/core-domain/src/model/feed.rs` 与 `crates/core-domain/src/sqlite/records.rs` 新增 `FeedErrorKind`、`Feed.last_error_kind` / `last_error_message` / `last_error_at` / `consecutive_failures` 字段，把“错误类型”和“连续失败计数”正式纳入共享领域模型与 SQLite 记录翻译层，而不是继续依赖 `Feed.health_status` 的单字段含义承载全部失败语义。
- 已新增 `crates/core-domain/src/sqlite/migrations/006_feed_health_diagnostics.sql`，并更新 `crates/core-domain/src/sqlite/migrations.rs` 与 `crates/core-domain/src/sqlite/mod.rs`：数据库 schema 已推进到 `v6`，为 `Feed` 表补齐健康诊断列与 `last_error_kind` / `consecutive_failures` 索引，同时新增 `v5 -> v6` 升级验收，确保已有数据库能平滑获得 Step 32 的诊断能力。
- 已扩展 `crates/core-domain/src/sqlite/store.rs`：`record_feed_successful_check()` 现在会清空错误字段并把 `consecutive_failures` 归零；新增长 `record_feed_failed_check()`，负责按失败类型递增连续失败次数、写入最近错误详情，并在“权限错误立即升级”与“连续失败达到阈值升级”为 `error` 之间做统一健康状态判定。
- 已更新 `crates/feed-engine/src/error.rs`、`crates/feed-engine/src/model.rs`、`crates/feed-engine/src/ports.rs` 与 `crates/feed-engine/src/fetcher.rs`：`FeedEngineError` 现在显式区分网络、权限、解析与空内容分类，`DefaultFeedParser` 会把空正文响应映射为独立 `empty` 错误，`FeedFetcher` 则会在 transport 或 parser 失败后先通过 `record_failure()` 触发仓储回写，再把原始错误返回给调用方。
- 已更新 `crates/feed-engine/src/transport.rs` 与 `crates/feed-engine/src/sqlite_repository.rs`：transport 现在会把 `401` / `403` 分类为权限错误，其余网络与 HTTP 失败继续作为网络失败处理；默认 SQLite 仓储新增 `record_failure()`，在已知 feed 上回写失败诊断，在首次添加且尚未落库的 feed 请求上则安全跳过健康状态写入，避免用“记录失败失败”覆盖原始抓取错误。
- 已同步扩展 `packages/shared-types/src/enums.ts`、`packages/shared-types/src/feed.ts`、`packages/shared-types/src/index.ts` 与 `apps/desktop/src/features/reader-shell/mock-data.ts`，把 `FeedErrorKind` 与错误摘要字段纳入共享 DTO 契约和桌面壳 mock 数据，为 Step 33 左栏订阅树消费健康诊断信息预留稳定字段边界。

### 验证结果

- 已执行 `cargo test -p freelyrss-core-domain`，结果通过；18 个 SQLite 迁移、索引、升级、约束与 record/domain 往返测试全部通过，其中包含新的 `v5 -> v6` 健康诊断迁移验收。
- 已执行 `cargo test -p freelyrss-feed-engine`，结果通过；11 个仓储 / transport 测试、5 个抓取编排测试与 10 个 parser / normalizer 回归测试全部通过，覆盖权限错误分类、空内容分类、失败回写、连续失败升级与成功清零路径。
- 已执行 `corepack pnpm run verify`，结果通过；`format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，结果通过；确认 `core-domain` 的 `v6` schema 与 `feed-engine` 的失败分类接入后，桌面前端构建、Tauri 宿主装配与 Rust 入口链路仍可端到端打通，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 32 的交接记录、数据库 schema 变更、文件职责说明与新的架构洞察。
- 当前验证结论：Step 32 通过，可进入阶段 4 Step 33“建立订阅树与分组管理 UI”。

### 2026-04-18 - 阶段 4 Step 33：建立订阅树与分组管理 UI

- 已在 `apps/desktop/src/features/reader-shell/mock-data.ts` 把桌面壳 mock 数据从“扁平来源行”推进为“快速视图 + 订阅树 DTO”双边界：快速视图继续服务跨源入口，订阅树则显式携带 `FolderTreeNodeDto` / `FeedTreeNodeDto`，并引入嵌套文件夹样本，验证左栏不再依赖手写扁平行才能表达层级。
- 已在 `apps/desktop/src/features/reader-shell/types.ts` 与 `apps/desktop/src/features/reader-shell/selectors.ts` 建立 Step 33 的壳层组合边界：`ReaderShellData` 现在显式区分快速视图与订阅树输入，selectors 负责把树 DTO 投影为可渲染树行、聚合文件夹未读计数、递归解析文件夹所含订阅源，并在当前 route 指向深层节点时自动保持祖先展开，避免“路由选中项被树折叠隐藏”。
- 已在 `apps/desktop/src/features/reader-shell/state.ts` 中为 shell store 新增 `collapsedFolderIds` 与本地折叠操作；该状态只服务左栏交互，不进入 route、不写入共享类型，也不触碰 `feed-engine` / SQLite，确保 Step 33 的 UI 行为仍是纯前端壳层责任。
- 已在 `apps/desktop/src/features/reader-shell/components/source-pane.tsx` 与 `apps/desktop/src/styles.css` 中把左栏从普通分段列表推进为真正的树形导航：快速视图仍使用通用 `ListSection` / `ListRow`，订阅树则改为语义化 `ul/li` 结构、独立折叠按钮、树深度缩进与分组操作区，使树特有行为继续留在 feature 目录而不是回灌到 `packages/ui`。
- 已在 `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` 中把 Step 33 接入现有 route / query / store 组合：route 继续拥有 `sourceId` / `articleId`，shell store 继续拥有队列过滤与高对比模式，并新增把折叠状态投影为 `subscriptionRows` 的接线；中栏文章队列因此可以在选择文件夹或订阅源时稳定刷新，而无需引入新的宿主 API。
- 已在 `apps/desktop/src/features/reader-shell/reader-shell.test.tsx` 新增 Step 33 回归测试，验证左栏可折叠树能稳定显示嵌套文件夹、折叠后隐藏子节点、重新展开后恢复可见，并在选择文件夹节点后正确刷新中栏文章列表。
- 本次实现继续保持既有边界：`packages/shared-types` 仍只提供树 DTO 和健康摘要字段；树行投影、层级聚合与展开行为继续留在桌面 reader shell；`core-domain/sqlite` 仍只承担 `Folder` / `Feed` / 健康诊断事实来源，没有因为左栏树展示而新增任何树拼装 SQL 或 UI 专用状态字段。

### 验证结果

- 已执行 `corepack pnpm --filter @freelyrss/desktop test`，结果通过；桌面端现有 3 个 reader shell 测试全部通过，其中包含 Step 33 新增的订阅树折叠与队列刷新验收。
- 已执行 `corepack pnpm run desktop:build`，结果通过；`tsc` 与 Vite 构建均成功，确认树 DTO 投影、shell store 扩展与样式更新没有破坏桌面前端生产构建。
- 已执行 `corepack pnpm run verify`，结果通过；`format:check`、`lint`、`test:config`、`test:types`、`test:query`、`test:desktop`、`rust:fmt:check`、`rust:clippy`、`test:rust` 与 `docs:links` 全部通过。
- 已执行 `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`，结果通过；确认 Step 33 的桌面壳改动未破坏前端构建、Tauri 宿主装配与 Rust 入口链路，生成 `apps/desktop/src-tauri/target/debug/freelyrss-desktop.exe`。
- 已在验证通过后同步回写 `memory-bank/progress.md` 与 `memory-bank/architecture.md`，补齐阶段 4 Step 33 的交接记录、文件职责说明与新的架构洞察。
- 当前验证结论：Step 33 通过，可进入阶段 4 Step 34“实现订阅源编辑操作”。

## 下一步（2026-04-18 更新）

- 按 `implementation-plan.md` 执行阶段 4 Step 34，在现有订阅树与分组管理 UI 基础上实现订阅源编辑操作，先补齐重命名、自定义显示名、更新频率、图标更新与手动刷新入口。
- 在推进 Step 34 时继续保持当前边界：`shared-types` 继续只提供稳定 `Feed` / `FeedSummary` 契约，桌面端 reader shell 与后续桌面命令层负责编辑交互和状态回显，`core-domain/sqlite` 继续保有订阅源事实与用户组织字段的最终写入边界，不把编辑语义回流到 `feed-engine`、宿主初始化链或基础 UI 组件层。

## 历史下一步（2026-04-16）

- 按 `implementation-plan.md` 执行阶段 4 Step 31，在当前去重闭环之上补齐 `ETag`、`Last-Modified`、条件请求与失败重试策略，避免每次刷新都全量重抓。
- 在推进 Step 31 时继续保持当前边界：`FeedFetcher` 与 transport 负责条件请求头和响应元数据，`SqliteFeedRepository` 与 `FeedStore` 继续只处理去重后的持久化与状态写入，不让 HTTP 缓存语义、失败重试或 UI 反馈逻辑回流到宿主或前端壳层。

## 2026-04-18 ASCII Addendum

### Stage 4 Step 34 Completed: feed editing actions in the desktop shell

- Implemented shell-level feed editing for title rename, custom display label, update interval, icon URL, and manual refresh.
- Kept Step 34 inside the desktop shell boundary. The fetch engine, Rust storage layer, shared base UI primitives, and database schema were not changed for edit semantics.
- Added a dedicated feed editor card in the left pane and wired it to the currently selected concrete feed only.
- Extended shell data composition so the route can resolve a full `FeedDto` for the active feed while the subscription tree continues to consume summary/tree projections.
- Promoted the mock layer from read-only fixture access to a writable mock repository that can update feed metadata, perform a manual refresh, and return a full shell snapshot for React Query cache replacement.
- Updated the Step 34 regression test to verify save behavior, persistence across an app reopen within the mock shell, and manual refresh health recovery.
- During validation, fixed two build blockers discovered after the initial implementation:
- `feed-editor-card.tsx`: explicit non-null narrowing after the empty-state return so TypeScript accepts later save/refresh handlers.
- `mock-data.ts`: snapshot output now materializes mutable `navigationEntries` instead of leaking a readonly tuple into `ReaderShellData`.

### Step 34 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 4 Step 35: OPML import.
- Preserve the current boundary split:
- `packages/shared-types` stays as DTO contract only.
- desktop reader shell owns edit interaction and route-adjacent command wiring.
- writable persistence of source facts remains a later `core-domain/sqlite` concern rather than a `feed-engine` concern.

## 2026-04-19 ASCII Addendum

### Stage 4 Step 35 Completed: OPML import in the desktop shell

- Implemented shell-level OPML import through a dedicated left-pane card that accepts OPML payload text and reports imported feeds, created folders, and skipped duplicates.
- Kept Step 35 inside the desktop shell boundary. No Rust engine, shared DTO contract, or database schema changes were required for this step.
- Added recursive OPML parsing in the shell-owned mock repository with lazy folder materialization, so nested outlines become folders only when a non-duplicate descendant feed actually needs them.
- Defined duplicate handling at the feed URL boundary. Feed URLs already present in the shell snapshot, or repeated inside the same OPML payload, are skipped instead of creating second sources.
- Imported feeds currently enter the shell as pending source facts with no articles yet, which keeps Step 35 focused on source-tree structure rather than fetch or persistence integration.
- Added regression coverage for nested folder preservation, global duplicate skipping, and import summary reporting.

### Step 35 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 4 Step 36: OPML export.
- Preserve the current boundary split:
- desktop reader shell owns OPML text acceptance, import feedback, and route-adjacent mutation wiring.
- shell mock repository owns parsing, deduplication, and full-snapshot replacement for imported source structure.
- `packages/shared-types` remains DTO-only, and real durable OPML persistence still belongs to later `core-domain/sqlite` wiring.

## 2026-04-20 ASCII Addendum

### Stage 4 Step 36 Completed: OPML export in the desktop shell

- Implemented shell-level OPML export through a dedicated left-pane card that generates a portable OPML payload from the current subscription tree and reports exported feed and folder counts.
- Kept Step 36 inside the desktop shell boundary. No Rust engine, shared DTO contract, or database schema changes were required for this step.
- Added OPML serialization to the shell-owned mock repository so the same source-organization layer now owns both OPML import and OPML export in the mock environment.
- Export now serializes the current folder/feed hierarchy in sort order and uses display titles for visible source labels while preserving canonical feed titles and URLs in standard OPML attributes.
- To stay aligned with Step 35 lazy folder materialization, export only emits folders that still contain feed descendants. That keeps export/import round-trips structurally stable instead of generating empty groups that the import path intentionally does not materialize.
- Added a round-trip regression that exports the live shell tree, resets the mock repository to an empty state, re-imports the generated OPML, and verifies that folder paths and feed paths match the pre-export structure.
- During validation, fixed two verification blockers discovered after the initial implementation:
- `mock-data.ts`: recursive export helper now declares an explicit boolean return type so `tsc` accepts the round-trip traversal.
- `opml-export-card.tsx`: switched the React type-only import to `import type` so Biome `useImportType` passes during repository verification.

### Step 36 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 37: article list query flow.
- Preserve the current boundary split:
- desktop reader shell owns OPML import/export presentation plus route-adjacent command wiring.
- shell mock repository owns OPML parsing, OPML serialization, and round-tripable source-structure snapshots.
- `packages/shared-types` remains DTO-only, and durable OPML persistence plus article-query execution still belong to later `core-domain/sqlite` integration.

## 2026-04-21 ASCII Addendum

### Stage 5 Step 37 Completed: article list query flow in the desktop shell

- Implemented a dedicated shell-side article query composition layer that turns the current route source, queue search text, status preset, and sort mode into one explicit query definition.
- Kept Step 37 inside the desktop shell and shared query-boundary layers. No Rust crate, SQLite schema, or durable persistence contract changed in this step.
- Added `apps/desktop/src/features/reader-shell/article-query.ts` as the Step 37 execution boundary. It now owns source-scope clause generation, shared-query definition assembly, and mock execution against shell snapshots.
- Moved the middle-pane list away from ad hoc chained filters in `selectors.ts`. The route now resolves a single article query object and uses its visible result set plus serialized preview to drive the queue.
- Extended `packages/shared-query` with a first-class `feedId` field so feed and folder route scopes can compile into the same query vocabulary used by shell filters and future SQL execution.
- Widened `anyText` SQL compilation to include feed display titles, which keeps current queue-search semantics aligned with the shared query package rather than leaving feed-title matching as a shell-only special case.
- Updated queue presentation so the middle pane now shows the active article query summary and serialized shared-query payload, making the route/filter/sort composition boundary visible and inspectable.
- Added a Step 37 regression that selects a concrete feed route, flips sort order, narrows the queue with search text, then layers on a status preset to verify the queue result set follows one combined query path.

### Step 37 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 38: article list virtualization.
- Preserve the current boundary split:
- desktop reader shell owns route-adjacent query composition, local queue controls, and query preview presentation.
- `packages/shared-query` owns the reusable query vocabulary and future SQL compilation surface.
- durable article-query execution against SQLite still belongs to later `core-domain/sqlite` integration rather than the mock shell repository.

## 2026-04-21 ASCII Addendum II

### Stage 5 Step 38 Completed: article list virtualization in the desktop shell

- Implemented shell-local queue virtualization so the middle pane now mounts a bounded render window instead of painting every visible article row at once.
- Kept Step 38 inside the desktop shell rendering boundary. The route-backed article query contract from Step 37 is unchanged, and no Rust crate, shared DTO schema, or SQLite schema changed in this step.
- Added `@tanstack/react-virtual` to the desktop app and introduced a dedicated queue virtualization helper that centralizes row-size estimates, overscan, and viewport fallback behavior for the queue pane.
- Updated `QueuePane` to virtualize the current query result set, show a rendered-row summary, and reset queue scroll position when the query definition changes so route and filter transitions do not strand the user mid-list.
- Added a dense mock-shell mode that seeds a dedicated long-queue feed with 48 generated article fixtures. This keeps virtualization verification inside the shell test boundary without polluting the default reader-shell snapshot used by other steps.
- Added a Step 38 regression that selects the dense feed, confirms the queue renders fewer rows than the full result set, then scrolls the middle pane and verifies the render window advances to later articles.

### Step 38 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 39: reading panel base view.
- Preserve the current boundary split:
- desktop reader shell owns queue virtualization, scroll-window reset behavior, and route-adjacent queue presentation.
- the route plus `article-query.ts` still own article-query composition; virtualization consumes the result set but does not redefine it.
- dense queue fixtures remain a shell-test-only proving ground, while durable queue execution and storage-backed pagination still belong to later `core-domain/sqlite` work.

## 2026-04-21 ASCII Addendum III

### Stage 5 Step 39 Completed: reading panel base view in the desktop shell

- Implemented a stable reader-pane base view so the right pane now renders concrete article metadata, summary, and body content for the route-selected queue item instead of a shell placeholder.
- Kept Step 39 inside the desktop shell presentation boundary. No Rust crate, SQLite schema, shared DTO contract, or durable persistence logic changed in this step.
- Expanded the reader pane to show feed title, author, published timestamp, read state, reading progress, language, summary text, extracted-body content, and a stable no-body fallback when an article has metadata but no readable body.
- Preserved the existing Step 37 and Step 38 contracts: route state still owns `sourceId` and `articleId`, the middle pane still owns query-backed selection flow, and the right pane only consumes the resolved `ArticleDetailDto`.
- Added a Step 39 regression that switches between two queue articles and verifies the reading panel updates to the new article title, summary, and body while removing stale text from the previously selected article.

### Step 39 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 40: raw-content and extracted-content reader modes.
- Preserve the current boundary split:
- desktop reader shell owns reading-panel presentation and route-adjacent article selection wiring.
- `packages/shared-types` remains DTO-only, and the reader pane continues to consume resolved article detail rather than executing its own queries.
- durable article rendering preferences and content-source persistence still belong to later shell/store or `core-domain/sqlite` work rather than this presentation step.

## 2026-04-21 ASCII Addendum IV

### Stage 5 Step 40 Completed: extracted and original reader modes in the desktop shell

- Implemented a shell-local reader content-mode toggle so the right pane can switch between extracted reading text and original source content for the currently selected article.
- Kept Step 40 inside the desktop shell presentation and local-preference boundary. No Rust crate, SQLite schema, shared DTO contract, or durable article-storage contract changed in this step.
- Added `ReaderContentMode` and a persisted shell preference in `state.ts`, so the latest reader-mode choice is stored locally and reused when the app reopens.
- Updated the shell route to treat reader mode like other local view controls: route state still owns `sourceId` and `articleId`, while the shell store now owns the content-mode preference that the reader pane consumes.
- Expanded the reader pane to present explicit mode buttons, render extracted content as reading paragraphs, render original content as a raw source block, and show mode-specific empty states when one representation is unavailable.
- Added distinct `contentRaw` fixture payloads to the mock reader-shell article details so the Step 40 mode switch produces visible output changes before the later extraction-pipeline milestone lands.
- Added a Step 40 regression that toggles the current article between extracted and original modes, then simulates reopening the app and verifies that the latest content-mode choice is preserved.

### Step 40 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 41: content extraction pipeline.
- Preserve the current boundary split:
- desktop reader shell owns the reader-mode toggle, local preference persistence, and content-mode presentation.
- `packages/shared-types` remains DTO-only, and the right pane still consumes already-resolved article detail instead of inventing new reader-specific contracts.
- durable extraction output generation and any storage-backed content-source policy still belong to later `content-pipeline` and `core-domain/sqlite` work rather than this shell-only presentation step.

## 2026-04-21 ASCII Addendum V

### Stage 5 Step 41 Completed: content extraction pipeline in Rust

- Implemented the first real `crates/content-pipeline` boundary instead of keeping Step 41 as a shell-side placeholder.
- Added a dedicated content-pipeline contract that accepts raw HTML plus an optional document URL and returns cleaned HTML, extracted text, thumbnail URL, language estimate, and word-count estimate.
- Kept Step 41 inside the Rust content-processing layer. No desktop-shell route logic, shared DTO contract, SQLite schema, or persistence wiring changed in this step.
- Added candidate scoring for `article` / `main` / `section` / `div` / `body` nodes so the extraction path prefers likely reading content instead of whole-page boilerplate.
- Added thumbnail recognition that prefers Open Graph or Twitter image metadata and falls back to the first content image, with relative URLs resolved against the document URL.
- Added lightweight sanitization that strips comments, scripts, styles, form-like blocks, noisy structural wrappers, and unsafe attributes before returning cleaned HTML.
- Added language and word-count heuristics so later storage wiring can populate `Article.language` and `Article.word_count` from the same extraction result instead of inventing separate estimators downstream.
- Added Rust unit coverage for boilerplate removal, extracted-body selection, meta-thumbnail resolution, content-image fallback, and CJK language/word-count estimation.

### Step 41 Verification

- Passed `cargo test -p freelyrss-content-pipeline`
- Passed `cargo clippy -p freelyrss-content-pipeline --all-targets -- -D warnings`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 42: attachment and podcast enclosure support.
- Preserve the current boundary split:
- `crates/content-pipeline` now owns cleaned-body extraction, thumbnail detection, and text-derived language / word-count estimation.
- `crates/feed-engine` still owns remote fetch and feed-document parse semantics, not reader presentation or desktop-shell state.
- durable persistence of extraction results still belongs to later `core-domain/sqlite` integration rather than this standalone content-processing step.

## 2026-04-22 ASCII Addendum

### Stage 5 Step 42 Completed: attachment and podcast enclosure support in the desktop shell

- Implemented attachment visibility in the reader pane so the right side now renders concrete attachment metadata cards instead of stopping at an attachment count.
- Kept Step 42 inside the desktop shell presentation boundary. No Rust crate, SQLite schema, shared DTO contract, or durable attachment-persistence logic changed in this step.
- Added a dedicated podcast fixture path in the shell mock repository: `Night Audio Digest` now exposes a real article detail with an MP3 enclosure, companion artwork, cache-path metadata, and attachment-aware queue counts.
- Added a separate empty feed fixture so the earlier stale-selection regression still validates empty-route reconciliation without overloading the podcast source with two conflicting responsibilities.
- Expanded the reader pane to distinguish audio, image, video, and generic file attachments, surface MIME type, duration, size, cache status, and raw attachment URL, and label audio entries explicitly as podcast enclosures.
- Updated shell copy so Step 42 is reflected in the route frame and reader-panel description without changing the underlying route/query/state ownership model.
- Added a Step 42 regression that selects the podcast feed, opens the article detail, and verifies that audio enclosure metadata plus companion image metadata are visible in the reader.

### Step 42 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 43: article state mutations.
- Preserve the current boundary split:
- desktop reader shell now owns attachment presentation, enclosure labeling, and empty-route fixture coverage, but it still does not own attachment discovery or persistence.
- `packages/shared-types` remains DTO-only, and `ArticleDetailDto` continues to be the single detail contract consumed by the reader.
- durable read-state, starring, liking, read-later, and progress writes still belong to later shell-command and `core-domain/sqlite` integration rather than this presentation-only step.

## 2026-04-22 ASCII Addendum II

### Stage 5 Step 43 Completed: article state mutations in the desktop shell

- Implemented shell-level article state writes for `readState`, `starred`, `liked`, `readLater`, `importance`, and `readingProgress`.
- Kept Step 43 inside the desktop shell command and presentation boundary. No Rust crate, SQLite schema, shared DTO contract, or durable persistence wiring changed in this step.
- Added one shell-owned mutation path in the mock repository so article list rows, article details, quick-view counts, and feed unread counts all derive from the same updated snapshot instead of drifting between list and detail copies.
- Expanded the reading panel with explicit state controls and visible state summaries, replacing the old placeholder footer buttons with real interaction for read-state transitions, saved-state toggles, importance changes, and progress writes.
- Preserved the Step 37 query boundary: the queue still consumes one composed article query, and Step 43 now proves that changing article state can immediately re-shape that result set without moving query execution or persistence into the reader pane.
- Fixed a fixture baseline inconsistency while landing the feature: the `article-window-behavior` detail now points at its own user-state fixture instead of reusing the podcast article state.
- Added regressions for two risks:
- mutating the active article to `read` while on the unread route now removes it from the queue and reconciles route selection to the next visible article.
- mutating star / like / read-later / importance / progress now survives an app reopen within the mock shell.

### Step 43 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 44: keyboard reading flow.
- Preserve the current boundary split:
- desktop reader shell now owns article-state mutation controls and immediate queue/reader echo, but it still does not own durable article-state persistence.
- `packages/shared-types` remains DTO-only, and `ArticleDetailDto` / `ArticleListItemDto.state` continue to be the single reader-facing state contract.
- durable writes to `UserState` still belong to later shell-command and `core-domain/sqlite` integration, while Step 44 should focus on keyboard command routing across the already-mutatable reader surface.

## 2026-04-22 ASCII Addendum III

### Stage 5 Step 44 Completed: keyboard reading flow in the desktop shell

- Implemented pane-scoped keyboard reading flow in the desktop shell without introducing a second queue-selection state or changing the route-backed article contract.
- Kept Step 44 inside the desktop shell interaction boundary. No Rust crate, SQLite schema, shared DTO contract, or durable persistence wiring changed in this step.
- Extended the shell shortcut catalog so landmark shortcuts and reading-flow shortcuts now share one shell-owned fact source instead of scattering key knowledge across route code, copy, and tests.
- Added queue-and-reader keyboard routing in `reader-shell-route.tsx`: `J` / `ArrowDown` and `K` / `ArrowUp` move through the visible article result set, `Enter` opens the current queue selection into the reading panel by transferring focus, `M` toggles read state, `S` toggles starred, `F` toggles read later, and `R` focuses the reader.
- Intentionally scoped the new reading commands to the focused queue or reader landmarks rather than every descendant control. That preserves native button and input behavior and avoids stealing `Enter` from existing reader actions or OPML / source-editing inputs.
- Reused the existing Step 43 shell-side article mutation path for keyboard-triggered state changes, so queue counts, quick views, and reader facts still echo from one snapshot boundary.
- Added a Step 44 regression that completes a keyboard-only reading path: focus the queue, move to a different article, open the reader, mark the article read, and move again without using the mouse.
- While validating the regression, confirmed that the existing stale-selection reconciliation rule still falls back to the first visible article after the current article drops out of the unread route; Step 44 preserves that route behavior instead of introducing a new keyboard-only cursor policy.

### Step 44 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 45: reading theme and layout settings.
- Preserve the current boundary split:
- desktop reader shell now owns pane-scoped keyboard reading flow and shortcut routing, but it still does not own durable article-state persistence or storage-backed reader preferences.
- route state still owns `sourceId` and `articleId`; Step 44 did not introduce a second persisted queue cursor or a shell-only article selection model.
- keyboard-triggered state changes still reuse the Step 43 shell mutation path, while typography, spacing, and theme preference persistence should remain a shell/store concern before any later `core-domain/sqlite` promotion.

## 2026-04-22 ASCII Addendum IV

### Stage 5 Step 45 Completed: reading theme and layout settings in the desktop shell

- Implemented shell-owned reading presentation preferences for `Daylight`, `Midnight`, and `High contrast` themes plus font family, font size, line height, and margin modes.
- Kept Step 45 inside the desktop shell view-preference and UI-theme boundaries. No Rust crate, SQLite schema, shared DTO contract, or durable reader-preference persistence changed in this step.
- Expanded `useReaderViewStore` persistence beyond reader content mode so reading presentation settings now survive an app reopen while still staying in local shell storage rather than moving into route state or durable article settings.
- Extended `ThemeRoot` and shared theme tokens to support a daylight theme and tone-aware surface variables, so the existing shell UI can switch tones without duplicating theme logic inside each reader component.
- Added a dedicated reading environment section in the reader pane with explicit theme, font, size, line-height, and margin controls, and bound the current article container to stable data attributes so tests can verify the actual rendered preference state.
- Updated shell-local CSS to drive reader typography and spacing from CSS custom properties instead of hard-coded dark-mode assumptions, which keeps daylight and high-contrast modes readable across the reading surface.
- Added a Step 45 regression that changes presentation settings, simulates an app reopen, and verifies that the chosen theme and layout persist while extracted article text remains visible after switching into high contrast.

### Step 45 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 46: highlights and annotations.
- Preserve the current boundary split:
- desktop reader shell now owns persisted reading presentation settings, but it still does not own durable annotation storage or anchor serialization.
- `packages/ui` now provides the reusable theme-token surface for daylight, midnight, and high-contrast tones, but it does not own reader-preference persistence or article-formatting policy.
- durable annotation anchors, note payloads, and any future cross-session selection replay still belong to later reader-interaction work plus `core-domain/sqlite` integration rather than this shell-only preference step.

## 2026-04-22 ASCII Addendum V

### Stage 5 Step 46 Completed: highlights and annotations in the desktop shell

- Implemented extracted-text selection capture plus shell-side highlight and note creation in the reader pane.
- Kept Step 46 inside the desktop shell interaction boundary. No Rust crate, SQLite schema, shared DTO contract, or durable annotation persistence changed in this step.
- Added paragraph-scoped extracted-text anchors with `contentMode`, `paragraphIndex`, `startOffset`, and `endOffset` so annotation replay depends on stable article-text positions rather than raw DOM range objects.
- Added one shell-owned annotation creation path in the mock repository so new annotations validate against extracted paragraphs, append into the current article snapshot, and survive a simulated app reopen without changing route ownership.
- Expanded the reader pane with inline replay, a pending-selection card, note drafting, annotation cards, and selection-aware validation messaging.
- Added a Step 46 regression that creates one highlight and one note on `article-source-context`, reopens the app, and verifies both anchors replay plus note text persistence.
- Boundary reminder: durable annotation storage, cross-device anchor portability, and SQLite-backed replay still belong to later `core-domain/sqlite` integration rather than the mock shell repository.

### Step 46 Verification

- Passed `corepack pnpm run format`
- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 47: unified query expression parsing and validation.
- Preserve the current boundary split:
- desktop reader shell now owns text-selection capture, paragraph-scoped annotation authoring, and reader-side replay in the mock shell, but it still does not own durable annotation storage.
- `packages/shared-types` remains DTO-only, and Step 46 did not extend `AnnotationDto` beyond the existing reader-facing contract.
- durable query parsing, validation, and later SQLite-backed annotation persistence still belong to `packages/shared-query` and `core-domain/sqlite` work rather than this shell-local interaction step.

## 2026-04-22 ASCII Addendum VI

### Stage 5 Step 47 Completed: unified query expression parsing and validation

- Implemented a richer shared-query parsing and validation boundary instead of leaving queue text filters on the earlier minimal token scan.
- Kept Step 47 centered on `packages/shared-query` plus shell-side consumption. No Rust crate, SQLite schema, shared article DTO contract, or durable saved-query persistence changed in this step.
- Replaced the old flat text-query scan with parser logic that now supports grouped expressions, explicit comparison operators, inline negation, and input-range-aware `QueryTextParseError` failures.
- Hardened `parseQueryDefinitionJson` so malformed persisted query JSON now fails with structured validation issues before it reaches downstream normalization or future execution layers.
- Updated the desktop queue filter to route its text through `parseTextQuery`, keep route scope, status presets, and shell sort ownership intact, and surface parser feedback in the existing article-query summary instead of silently diverging inside the shell.
- Added regressions for two risks:
- grouped shared-query text syntax now compiles into the queue query and visibly narrows the unread route result set.
- invalid queue filter text now reports a precise parser error while preserving the route-backed queue instead of clearing the visible articles.

### Step 47 Verification

- Passed `corepack pnpm run format`
- Passed `corepack pnpm --filter @freelyrss/shared-query check`
- Passed `corepack pnpm --filter @freelyrss/shared-query test`
- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 48: rule-engine hit evaluation.
- Preserve the current boundary split:
- `packages/shared-query` now owns text parsing, serialized-shape validation, and query-definition error modeling, but it still does not execute rules or persist saved queries.
- desktop reader shell only consumes parser output and message state for queue filtering; it still does not own the query language or durable smart-folder and rule storage.
- durable saved-query persistence and SQLite-backed execution remain later `core-domain/sqlite` work, while Step 48 should move into `crates/rule-engine` on top of the now-stricter shared query contract.

## 2026-04-23 ASCII Addendum VII

### Stage 5 Step 48 Completed: rule-engine hit evaluation in Rust

- Implemented the first executable `crates/rule-engine` boundary instead of leaving the crate as a placeholder.
- Kept Step 48 inside the Rust rule-evaluation boundary. No SQLite schema, desktop-shell route contract, shared article DTO, or rule-action persistence wiring changed in this step.
- Added a path-aware query-definition parser inside `crates/rule-engine` so persisted `Rule.conditions` JSON is structurally and semantically validated before any article facts are evaluated.
- Added a `RuleMatchContext` that evaluates unified query predicates against `Article`, optional `Feed`, optional `UserState`, article tags, and attachments, including default unread / normal / false fallbacks when user state is absent.
- Limited Step 48 to hit evaluation only. Query sort definitions are parsed and validated for contract compatibility, but they do not influence rule matching yet because action execution and audit flow belong to Step 49.
- Added Rust unit coverage for complex nested rule matches, default-state fallbacks when optional context is missing, and path-based validation failures for invalid persisted conditions.

### Step 48 Verification

- Passed `cargo test -p freelyrss-rule-engine`
- Passed `cargo clippy -p freelyrss-rule-engine --all-targets -- -D warnings`
- Passed `cargo fmt --all --check`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 49: rule action execution.
- Preserve the current boundary split:
- `packages/shared-query` still owns query vocabulary and cross-platform validation semantics; Step 48 only adds a Rust consumer for the persisted contract.
- `crates/rule-engine` now owns condition parsing and hit evaluation over domain entities, but it still does not mutate `UserState`, tags, folders, or SQLite rows.
- `crates/core-domain` and SQLite remain the durable boundary for action writes and audit persistence, while Step 49 should connect rule hits to explicit actions without collapsing evaluation and persistence into one module.

## 2026-04-23 ASCII Addendum VIII

### Stage 5 Step 49 Completed: rule action execution planning in Rust

- Implemented a controlled `Rule.actions` contract in `crates/rule-engine` instead of leaving action payloads as opaque JSON until the SQLite layer.
- Kept Step 49 inside the Rust rule-engine command-planning boundary. No SQLite schema, desktop-shell route contract, shared article DTO, or audit-persistence wiring changed in this step.
- Added path-based validation for `Rule.actions`, including controlled support for `readState`, `starred`, `readLater`, `importance`, `tagNames`, `moveToFolderId`, `clearCachedAttachments`, plus explicit `{ "type": "noop" }` compatibility for placeholder rules.
- Added explicit command planning after a rule match: the engine now emits user-state update commands, article-tag addition commands, feed-folder move commands, and attachment-cache cleanup commands instead of mutating domain rows directly.
- Made Step 49 state-aware and idempotent at the command boundary. Planned commands are filtered against default/current `UserState`, existing article tags, current feed folder placement, and cached attachment paths so already-satisfied actions collapse to an empty plan instead of duplicate side effects.
- Added Rust unit coverage for supported action parsing, invalid action payload reporting, matched-rule command planning, and no-op collapse when the snapshot already satisfies the requested actions.

### Step 49 Verification

- Passed `cargo test -p freelyrss-rule-engine`
- Passed `cargo clippy -p freelyrss-rule-engine --all-targets -- -D warnings`
- Passed `cargo fmt --all --check`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 50: rule audit history.
- Preserve the current boundary split:
- `packages/shared-query` still owns query vocabulary and cross-platform validation semantics; Step 49 does not move action vocabulary into JS packages or shared DTOs.
- `crates/rule-engine` now owns condition evaluation plus action-plan generation, but it still does not write SQLite rows or audit records.
- `crates/core-domain` and SQLite remain the durable boundary for command application and audit persistence; Step 50 should record which rules matched and which commands were planned without forcing multiple layers to re-parse the same rule definitions.

## 2026-04-23 ASCII Addendum IX

### Stage 5 Step 50 Completed: rule audit history across Rust and SQLite

- Implemented a dedicated durable audit boundary instead of leaving rule history as an implicit future concern. `crates/rule-engine` now emits audit-ready evaluation results, while `crates/core-domain` and SQLite persist them through one explicit `RuleAudit` model.
- Kept Step 50 split across the correct layers. `crates/rule-engine` serializes rule inputs and planned commands once, but it still does not write SQLite rows; `crates/core-domain` and SQLite store and read the resulting audit payloads without re-parsing `Rule.conditions` or `Rule.actions`.
- Added schema `v7` with a `RuleAudit` table plus rule/history lookup indexes so rule-history reads are now durable and migration-tested rather than remaining a comment in the architecture docs.
- Added a dedicated `RuleAuditStore` instead of extending `FeedStore` with unrelated automation concerns. Audit-history insert/list/update flows now have their own persistence boundary and tests.
- Preserved `execute_rule()` as the action-planning convenience API. A new audit path sits beside it, so existing consumers still receive `RuleActionPlan` while later automation writers can persist the richer audit payload.
- Added coverage for matched and non-matched audit generation, record translation, migration upgrade to `v7`, history listing by rule, and later applied-effects updates on an existing audit row.

### Step 50 Verification

- Passed `cargo test -p freelyrss-rule-engine`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `cargo clippy -p freelyrss-rule-engine -p freelyrss-core-domain --all-targets -- -D warnings`
- Passed `cargo fmt --all --check`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 5 Step 51: smart folders.
- Preserve the current boundary split:
- `packages/shared-query` still owns query vocabulary and validation semantics; Step 50 does not move saved-query meaning into desktop-shell state.
- `crates/rule-engine` now owns evaluation snapshots plus planned-command serialization, but it still does not write SQLite rows or apply commands.
- `crates/core-domain` and SQLite now own durable rule-audit storage; Step 51 should extend the same durable query contract to `SmartFolder` reads and writes without inventing a new shell-only filter model.

## 2026-04-24 ASCII Addendum X

### Stage 5 Step 51 Completed: smart folders across desktop shell and SQLite

- Implemented Stage 5 Step 51 as one shared-query-driven feature instead of a shell-local shortcut list. `SmartFolder` now behaves as a durable saved-query boundary in `crates/core-domain` and as a first-class navigation source in the desktop shell.
- Kept the Step 51 boundary split explicit. `packages/shared-query` still owns query grammar, validation, normalization, and serialization; `crates/core-domain` stores `SmartFolder.query_definition` / `sort_definition` durably; `apps/desktop` consumes those saved definitions instead of inventing a second smart-folder filter DSL.
- Added a dedicated `SmartFolderStore` in `crates/core-domain` so saved-query persistence does not leak into `FeedStore` or `RuleAuditStore`. Smart-folder insert/update and listing now have their own SQLite boundary and unit coverage.
- Extended the desktop mock reader shell to expose a `Smart folders` section beside quick views and the regular subscription tree, proving that left-pane navigation can consume durable saved-query definitions without flattening folder/feed semantics.
- Updated desktop article-query composition so selecting a smart folder parses its persisted `queryDefinition` through `parseQueryDefinitionJson`, then combines that saved root with shell-owned status filters and queue text filters through the same normalized query contract.
- Extended shared DTOs with smart-folder counts (`unreadCount`, `articleCount`) so the desktop shell can render lightweight saved-query summaries without coupling itself to a shell-only counting model.
- Added desktop test coverage for smart-folder rendering and route-backed query execution, plus Rust unit coverage for smart-folder save/list persistence.

### Step 51 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `cargo test -p freelyrss-core-domain smart_folder_store`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Next Step (ASCII update)

- Next planned implementation step is `implementation-plan.md` Stage 6 Step 52: full-text search and filtered search.
- Preserve the current boundary split:
- `packages/shared-query` continues to own the unified query contract that now drives rules, shell filters, and smart folders.
- `crates/core-domain` and SQLite now own durable smart-folder persistence, but they still do not execute search ranking or search-hit highlighting semantics.
- `apps/desktop` now consumes saved-query smart folders as navigation sources; Step 52 should extend article retrieval with real full-text search while reusing the same query contract rather than adding a separate search-only filter language.

## 2026-04-24 ASCII Addendum XI

### Stage 6 Step 52 Completed: SQLite-backed full-text search store foundation

- Implemented the first durable execution slice of Stage 6 Step 52 inside `crates/core-domain` instead of extending the desktop shell's in-memory article filtering again.
- Kept Step 52 inside the SQLite search boundary for this iteration. `apps/desktop` still uses mock reader-shell data, but the local database now exposes a dedicated API that can execute full-text article lookups and return search snippets for later desktop integration.
- Added `ArticleSearchStore` as a dedicated storage boundary beside `FeedStore`, `RuleAuditStore`, and `SmartFolderStore`, so full-text retrieval does not leak into feed-ingest persistence, smart-folder persistence, or rule-audit history concerns.
- Reused the existing `ArticleSearch` FTS5 table from schema `v4` instead of introducing another article-search representation. Search execution now depends on the durable index already maintained by the trigger-based `ArticleSearchSource` pipeline.
- Added two explicit retrieval flows: `search_article_ids()` for filtered article-id lookup and `search_with_snippets()` for UI-facing preview text generated by SQLite `snippet(...)` over indexed content columns.
- Added feed-scope filtering at the storage boundary so later folder-scoped searches and feed-scoped queue retrieval can narrow the FTS result set without inventing a second search table.
- Added Rust unit coverage for ranked FTS lookup, snippet generation, and feed-scoped filtering to keep Step 52 verification inside the durable boundary before desktop wiring proceeds.

### Step 52 Verification

- Passed `cargo test -p freelyrss-core-domain article_search_store`
- Passed `cargo fmt --all`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`
- Passed `cargo test -p freelyrss-core-domain`

### Next Step (ASCII update)

- Continue `implementation-plan.md` Stage 6 Step 52 by wiring the new SQLite-backed search boundary into article retrieval and then into the desktop reader shell.
- Preserve the current boundary split:
- `packages/shared-query` still owns the unified query contract and text-filter grammar; Step 52 does not introduce a search-only DSL.
- `crates/core-domain` and SQLite now own executable FTS lookup plus snippet generation, but they still do not expose a full saved-query article listing API yet.
- `apps/desktop` still uses mock shell data; the next increment should consume the durable search boundary rather than deepening shell-only filtering.

## 2026-04-24 ASCII Addendum XII

### Stage 6 Step 52 Continued: SQLite article-list retrieval on top of FTS

- Extended the Stage 6 Step 52 storage boundary beyond raw FTS hits. `ArticleSearchStore` can now return full article-list records instead of only ids and snippets.
- Added `list_articles()` so SQLite now supports one combined retrieval path for full-text query text, feed-scope filtering, reader status filtering, and published-date sorting.
- Kept this work inside `crates/core-domain` / SQLite instead of moving query intersection into the desktop shell. Search narrowing now happens where the durable article rows and user-state rows already live.
- Added explicit search-layer enums for reader-oriented filtering and sort semantics: `ArticleSearchReadFilter` and `ArticleSearchSort`.
- The combined listing path now joins `Feed` and `UserState`, applies default unread/normal/false fallbacks, and returns the presentation-critical feed display title plus attachment counts needed by later queue rendering.
- Preserved separation between retrieval shapes: `search_article_ids()` and `search_with_snippets()` still exist for narrow consumers, while `list_articles()` becomes the broader queue-oriented retrieval contract.
- Added unit coverage proving that the new retrieval path respects full-text matching, read-state filtering, state fallbacks, and sort-ready article hydration.

### Step 52 Verification (continued)

- Passed `cargo test -p freelyrss-core-domain article_search_store`
- Passed `cargo fmt --all`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`
- Passed `cargo test -p freelyrss-core-domain`

### Next Step (ASCII update)

- Continue `implementation-plan.md` Stage 6 Step 52 by wiring `ArticleSearchStore::list_articles()` into the desktop-side article retrieval path.
- Preserve the current boundary split:
- `crates/core-domain` now owns both FTS lookup and queue-oriented SQLite article retrieval, so the next increment should consume this boundary rather than duplicating search logic in `apps/desktop`.
- `apps/desktop` still relies on mock snapshots; the next change should adapt shell data loading toward the durable article-list contract while keeping shared-query semantics intact.

## 2026-04-24 ASCII Addendum XIII

### Stage 6 Step 52 Continued: desktop query planning split before durable wiring

- Split the desktop reader-shell article-query flow into two explicit phases: query planning and query execution.
- Added `planReaderArticleQuery()` in `apps/desktop/src/features/reader-shell/article-query.ts` so the desktop shell can now compute the shared-query definition and user-facing summary independently from the in-memory executor.
- Kept the current reader shell behavior unchanged for now by preserving the existing in-memory execution path and labeling the returned query result as `executionMode: "memory"`.
- This refactor is the prerequisite for durable Step 52 wiring: the next increment can route the planned query into SQLite-backed article retrieval without recomputing route scope, smart-folder scope, shell filters, parser messages, and summary text in two places.
- Extended `ReaderArticleQuery` with an explicit `executionMode` field so later durable search/list integration can expose whether the queue came from in-memory mock execution or SQLite-backed retrieval.
- Verified that this boundary refactor does not change current shell behavior by re-running reader-shell tests and desktop build output before moving on.

### Step 52 Verification (desktop planning split)

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`

### Next Step (ASCII update)

- Continue `implementation-plan.md` Stage 6 Step 52 by attaching the new desktop query-planning boundary to a real SQLite-backed article retrieval bridge.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/article-query.ts` now owns planning plus fallback memory execution, so the next increment should swap only the execution side when durable data is available.
- `crates/core-domain` already owns the durable search/list executor; the remaining work is the bridge between desktop query planning and SQLite-backed loading.

## 2026-04-24 ASCII Addendum XIV

### Stage 6 Step 52 Continued: desktop durable-queue bridge scaffold without UI cutover

- Stayed within Stage 6 Step 52 and deliberately did not move into Step 53. This increment adds a desktop-side durable retrieval bridge scaffold, but it does not render search-hit highlighting or snippet markup in the UI.
- Added `apps/desktop/src/features/reader-shell/desktop-bridge.ts` as the first reader-shell bridge module for durable queue loading. The bridge can attempt a Tauri `invoke` call for `load_reader_queue_articles` and cleanly fall back to `null` when the runtime or command is unavailable.
- Added the frontend dependency on `@tauri-apps/api` and synced the workspace so the desktop shell can host future durable queue commands without hidden environment assumptions.
- Intentionally did not switch `reader-shell-route.tsx` to consume the bridge yet. A first cut was reverted after validation showed it changed queue-loading behavior too early. The bridge now exists as a validated scaffold while the route remains on the proven in-memory execution path.
- This keeps the repository green while still advancing Step 52: the codebase now has an explicit bridge seam between desktop query planning and future SQLite-backed article retrieval, but no user-visible behavior has crossed over yet.

### Step 52 Verification (bridge scaffold)

- Passed `corepack pnpm install`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`

### Next Step (ASCII update)

- Continue `implementation-plan.md` Stage 6 Step 52 by implementing the Tauri backend command and then performing a controlled route cutover to the durable queue bridge.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts` now owns the frontend bridge contract, but `reader-shell-route.tsx` still executes through the memory path until the backend contract is ready.
- The next Step 52 increment should cut over queue retrieval only after the Tauri command exists and the route can preserve current source-scope semantics without regressions.

## 2026-04-24 ASCII Addendum XV

### Stage 6 Step 52 Continued: Tauri backend queue command for durable retrieval

- Stayed inside Stage 6 Step 52. This increment adds the Tauri backend command for durable queue retrieval, but it still does not render search-hit highlights, snippets, or any Step 53 UI treatment.
- Added `apps/desktop/src-tauri/src/reader_queue.rs` with a new Tauri command: `load_reader_queue_articles`.
- The command maps Step 52 shell-level queue inputs (`feedIds`, `searchText`, `sortMode`, `statusFilter`) into the durable SQLite retrieval boundary provided by `ArticleSearchStore::list_articles()`.
- Returned a minimal queue-oriented DTO shape that matches the existing desktop queue surface: article identity, feed display title, title/summary/author/published date, estimated reading minutes, lightweight state, tag ids, and attachment count.
- Preserved Step 52 scope by avoiding snippet transport and match-markup transport. The backend command intentionally returns queue rows only, not hit-highlighting payloads.
- Registered the command in `apps/desktop/src-tauri/src/lib.rs` and added the Rust-side dependencies needed for the command module.
- Updated the storage-layout test in `apps/desktop/src-tauri/src/storage.rs` so it tracks the current embedded schema version dynamically instead of pinning old migration counts.
- Kept the desktop route on the proven in-memory path after verification. The backend command is now ready, but the UI cutover remains a separate controlled Step 52 change.

### Step 52 Verification (Tauri backend command)

- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`

### Next Step (ASCII update)

- Continue `implementation-plan.md` Stage 6 Step 52 by switching the reader-shell queue execution path to the now-available Tauri backend command in a controlled way.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/article-query.ts` still owns query planning and the fallback in-memory executor.
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts` now has a real backend command to call.
- `apps/desktop/src-tauri/src/reader_queue.rs` owns the Step 52 backend transport-to-SQLite mapping.
- The next change should cut over queue retrieval without introducing Step 53 hit-highlighting behavior.

## 2026-04-24 ASCII Addendum XVI

### Stage 6 Step 52 Completed: controlled desktop queue cutover to durable retrieval

- Completed the final Step 52 cutover without entering Step 53. The desktop reader-shell queue now prefers the durable Tauri/SQLite retrieval path when the desktop runtime is available, but it still falls back to the existing in-memory path in test and non-Tauri environments.
- Added `resolveFeedIdsForSource()` in `apps/desktop/src/features/reader-shell/selectors.ts` so the route can map feed and folder scopes into the durable queue bridge without duplicating subscription-tree traversal logic inside the route.
- Updated `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` to load durable queue articles through `desktop-bridge.ts` in an effect, preserve cancellation safety, and use the durable rows only when the bridge returns a result.
- Kept the fallback path intact. If the Tauri runtime or backend command is unavailable, the route still uses `buildReaderArticleQuery(...).visibleArticles`, which keeps browser tests and mock-shell workflows unchanged.
- Verified that the cutover does not alter current tests in the mock/browser environment while making the durable execution path live for the desktop runtime.
- Still did not introduce Step 53 behavior: no snippet payload is rendered, no match markup is shown in the queue, and no highlighted search-hit presentation was added to the UI.

### Step 52 Verification (queue cutover)

- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `cargo clippy -p freelyrss-core-domain --all-targets -- -D warnings`

### Next Step (ASCII update)

- Stage 6 Step 52 is now complete.
- The next implementation step in `implementation-plan.md` is Stage 6 Step 53: search-hit highlighting.
- Preserve the new boundary split:
- `apps/desktop/src/features/reader-shell/article-query.ts` still owns query planning and fallback memory execution.
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts` owns frontend transport to durable queue loading.
- `apps/desktop/src-tauri/src/reader_queue.rs` owns backend queue retrieval mapping to SQLite.
- `crates/core-domain/src/sqlite/article_search_store.rs` owns the durable FTS/list execution boundary.

## 2026-04-25 ASCII Addendum XVII

### Stage 6 Step 53 Completed: queue snippets and reader-side search-hit highlighting

- Completed `implementation-plan.md` Stage 6 Step 53 without reopening the Step 52 transport boundary. Search-hit presentation now sits on top of the existing hybrid queue pipeline instead of changing how queue rows are loaded.
- Added a desktop-local search presentation helper in `apps/desktop/src/features/reader-shell/search-highlighting.tsx`. This module extracts positive content-search terms from the shared-query text AST, builds mock-memory snippets for browser/test execution, exposes plain-text highlight ranges for the reader, and renders marked queue snippet text without unsafe HTML injection.
- Kept query meaning and presentation meaning separate. `apps/desktop/src/features/reader-shell/article-query.ts` still owns route-aware query planning plus fallback memory execution, but it now also derives `searchHighlightTerms` from the parsed shell search text and decorates memory queue rows with `searchSnippet` values.
- Extended the shared queue DTO shape with nullable `searchSnippet` support in `packages/shared-types/src/article.ts`, then widened `packages/ui/src/components/list.tsx` so queue summaries can render rich React content. This keeps snippet display inside the existing queue-row component path instead of forcing a shell-only row fork.
- Upgraded the durable search boundary in `crates/core-domain/src/sqlite/article_search_store.rs` so `list_articles()` now returns best-column FTS snippets alongside article rows. This keeps snippet generation inside SQLite when durable retrieval is available.
- Updated `apps/desktop/src-tauri/src/reader_queue.rs` so the existing `load_reader_queue_articles` command forwards durable `search_snippet` values through the same queue DTO contract already used by the desktop shell.
- Updated `apps/desktop/src/features/reader-shell/components/queue-pane.tsx` to prefer `searchSnippet` over the plain summary when present, and updated `apps/desktop/src/features/reader-shell/components/reader-pane.tsx` to highlight active body matches while preserving existing annotation replay and selection behavior.
- Added browser-side regression coverage proving that a word found only in article body text produces both a queue snippet and a reader highlight, and added Rust-side coverage for durable snippet generation and Tauri DTO propagation.

### Step 53 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `cargo test -p freelyrss-core-domain article_search_store`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- Passed `corepack pnpm run format`
- Passed `cargo fmt --all`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 54: cache policy configuration.
- Preserve the current boundary split:
- `packages/shared-query` still owns search/filter semantics; Step 53 only consumes the parsed query to derive presentation-safe highlight terms.
- `crates/core-domain/src/sqlite/article_search_store.rs` now owns durable snippet generation in addition to ranked search/list retrieval.
- `apps/desktop/src/features/reader-shell/search-highlighting.tsx` owns browser/mock fallback snippet building and reader highlight range derivation, not durable queue loading.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx` and `components/reader-pane.tsx` now own Step 53 presentation only; they still do not define search semantics or storage behavior.

## 2026-04-27 ASCII Addendum XVIII

### Stage 7 Step 54 Completed: cache policy configuration

- Completed `implementation-plan.md` Stage 7 Step 54 by separating cache configuration into two explicit contracts: desktop-wide runtime defaults and per-feed durable cache policy metadata.
- Finished the runtime-wide configuration boundary in `packages/shared-config` by adding cache defaults, environment parsing, validation, and documentation for `cache.maxBytes` plus `cache.defaultPolicy`.
- Finished the shared feed contract by adding the `CachePolicy` enum and `FeedDto.cachePolicy` in `packages/shared-types`, then carrying the same field through `crates/core-domain` and SQLite migration `008_feed_cache_policy.sql`.
- Kept the per-feed policy durable while keeping the desktop-wide cache budget non-SQLite. This is the key boundary decision in Step 54: feed-level cache behavior belongs to feed metadata, but the global byte budget and default policy still belong to runtime configuration rather than a new business table.
- Added `apps/desktop/src/features/reader-shell/cache-policy.ts` as a small desktop helper boundary for human-readable policy labels and MB/bytes conversion so multiple components do not duplicate cache-policy wording or unit math.
- Added `apps/desktop/src/features/reader-shell/components/cache-settings-card.tsx` so the source pane now has an explicit desktop-wide cache settings surface, separate from feed metadata editing.
- Extended `apps/desktop/src/features/reader-shell/components/feed-editor-card.tsx` so source metadata editing now includes a per-feed cache policy choice without mixing that concern into queue filtering, reader presentation, or OPML UI.
- Updated `apps/desktop/src/features/reader-shell/mock-data.ts` so shell snapshots now carry `cacheSettings`, feed edits persist `cachePolicy`, and imported feeds inherit the current desktop default policy. This keeps new-source creation aligned with the cache-settings contract instead of inventing an import-only fallback.
- Added browser-side regression coverage proving that per-feed cache policy survives shell reopen and that changing the global default policy changes the default assigned to newly imported feeds.

### Step 54 Verification

- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm run test:config`
- Passed `cargo test -p freelyrss-core-domain`
- Passed `corepack pnpm run format`
- Passed `cargo fmt --all`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 55: cache eviction strategy.
- Preserve the current boundary split:
- `packages/shared-config` owns the desktop-wide cache limit and default cache policy contract.
- `packages/shared-types` plus `crates/core-domain` own the shared `CachePolicy` enum and durable feed DTO/domain field.
- `crates/core-domain/src/sqlite/store.rs` writes `cache_policy` on feed creation but intentionally does not overwrite user-managed feed policy during ordinary ingest updates.
- `apps/desktop/src/features/reader-shell` now edits both global defaults and per-feed policy, but it still does not implement eviction or attachment/content download behavior itself.
- Step 55 should consume these settings as inputs to eviction logic rather than redefining cache policy state in a second place.

## 2026-04-27 ASCII Addendum XIX

### Stage 7 Step 55 Completed: cache cleanup planning and protected LRU eviction

- Completed `implementation-plan.md` Stage 7 Step 55 by adding an explicit cleanup-planning layer on top of the cache settings introduced in Step 54.
- Added `apps/desktop/src/features/reader-shell/cache-maintenance.ts` as a pure planning boundary. It now summarizes cache pressure, identifies policy-mismatch entries, and plans cleanup in two phases: reclaim policy-violating cache first, then apply LRU eviction across non-protected articles.
- Kept cleanup execution out of the React route. `apps/desktop/src/features/reader-shell/mock-data.ts` now owns the application of a cleanup plan to shell state, while `reader-shell-route.tsx` only triggers the mutation and renders the resulting snapshot.
- Added desktop-local cache status contracts to `types.ts`, making cache pressure, cleanup candidates, and latest cleanup results explicit shell data instead of ad hoc component state.
- Added `components/cache-maintenance-card.tsx` to surface budget status, protected cache, ordered cleanup candidates, and the latest cleanup result inside the left pane without mixing cleanup rules into source editing or feed metadata forms.
- Seeded the mock shell with cache inventory data and verified the intended protection rule: starred articles, read-later articles, and articles with note annotations are excluded from LRU cleanup pressure unless a per-feed policy mismatch forces reclamation first.
- Added a focused unit test for the pure cleanup planner plus an integration test for the desktop shell flow that lowers the cache budget, runs cleanup, and confirms protected podcast media stays cached.

### Step 55 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 56: Markdown export.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/cache-maintenance.ts` now owns cleanup planning only; it does not mutate shell state, fetch durable storage, or render UI.
- `apps/desktop/src/features/reader-shell/mock-data.ts` owns the mock cache inventory and applies planned cleanup results to the shell snapshot.
- `apps/desktop/src/features/reader-shell/components/cache-maintenance-card.tsx` owns cache-maintenance presentation only; it does not define cleanup rules.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` remains a mutation trigger and composition boundary, not a cleanup executor.
- Stage 7 Step 56 should build an export boundary that consumes article detail, annotations, and cache-neutral reader data rather than embedding Markdown serialization inside reader components.

## 2026-04-29 ASCII Addendum XX

### Stage 7 Step 56 Completed: Markdown export boundary

- Completed `implementation-plan.md` Stage 7 Step 56 by adding a reusable Markdown export boundary for both the selected article and the current visible article queue.
- Added `apps/desktop/src/features/reader-shell/markdown-export.ts` as the pure serialization module. It accepts resolved `ArticleDetailDto` records and produces Markdown that preserves article metadata, summary, readable body content, annotations, annotation anchors, attachment references, generated file name, and export report facts.
- Kept export selection and shell snapshot access in `apps/desktop/src/features/reader-shell/mock-data.ts`. The mock repository now maps requested article ids to article details and delegates formatting to `markdown-export.ts` instead of assembling Markdown inline.
- Added `apps/desktop/src/features/reader-shell/components/markdown-export-card.tsx` as a presentation-only reader surface for generated Markdown, export summary facts, and single/batch export commands.
- Updated `apps/desktop/src/features/reader-shell/components/reader-pane.tsx` so the right pane can present Markdown export without owning serialization logic.
- Updated `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` so route composition triggers selected-article and visible-queue export mutations while leaving formatting in the export module.
- Added focused unit coverage in `markdown-export.test.ts` and user-visible flow coverage in `reader-shell.test.tsx` for metadata, body, annotation, attachment, selected-article export, and visible-queue export.

### Step 56 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run markdown-export.test.ts reader-shell.test.tsx`
- Passed `corepack pnpm run format`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 57: HTML and PDF export.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/markdown-export.ts` owns Markdown serialization only; it should not become a generic file writer, HTML renderer, PDF printer, or route mutation layer.
- `apps/desktop/src/features/reader-shell/mock-data.ts` owns mock article selection for export and can be reused by future format-specific exporters.
- `apps/desktop/src/features/reader-shell/components/markdown-export-card.tsx` owns Markdown export presentation only; it does not know how Markdown is assembled.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` remains the command trigger and composition boundary for export mutations.
- Stage 7 Step 57 should introduce a separate HTML/PDF serialization boundary that consumes the same resolved article detail inputs instead of modifying the Markdown-specific formatter.

## 2026-04-29 ASCII Addendum XXI

### Stage 7 Step 57 Completed: HTML and PDF document export boundary

- Completed `implementation-plan.md` Stage 7 Step 57 by adding HTML and PDF document export beside the existing Markdown exporter.
- Added `apps/desktop/src/features/reader-shell/html-pdf-export.ts` as the new pure document formatter. It consumes resolved `ArticleDetailDto` records plus the current reader presentation settings and emits either a standalone HTML document or a PDF print-source document.
- Added `apps/desktop/src/features/reader-shell/document-export-styles.ts` so standalone document CSS and print CSS stay separate from article serialization logic.
- Kept the PDF path intentionally print-oriented. The formatter returns a `.pdf` target file name and print-ready HTML with `@page` rules, but it does not create a binary PDF, write files, or invoke native printing in this step.
- Preserved Markdown boundaries. `markdown-export.ts` remains Markdown-only, and the new document formatter does not call into or mutate Markdown serialization.
- Added `components/document-export-card.tsx` so the reader panel can present HTML/PDF output, format facts, target filename, reader-view summary, and selected/visible-queue commands without knowing how documents are serialized.
- Updated `reader-shell-route.tsx` so route composition captures current reader presentation settings (`contentMode`, theme, font, scale, leading, margins) and passes them into the mock repository as export input.
- Updated `mock-data.ts` so mock export selection now has two delegated formatters: Markdown goes to `markdown-export.ts`, and HTML/PDF goes to `html-pdf-export.ts`.
- Added unit coverage in `html-pdf-export.test.ts` and user-visible shell coverage in `reader-shell.test.tsx` for selected HTML export, queue PDF print-source generation, raw/extracted content mode handling, metadata, annotations, attachments, file names, and print CSS.

### Step 57 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run html-pdf-export.test.ts markdown-export.test.ts reader-shell.test.tsx`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run format`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 58: batch operations.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/html-pdf-export.ts` owns document serialization only; it should not become a file writer, selection store, batch-operation executor, or native print adapter.
- `apps/desktop/src/features/reader-shell/markdown-export.ts` remains Markdown-only and should not absorb HTML/PDF rules.
- `apps/desktop/src/features/reader-shell/mock-data.ts` owns mock article-detail resolution for export and should own or delegate future mock batch mutations through explicit functions.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` remains the command trigger and composition boundary. Step 58 should add batch operation wiring without turning the route into the batch executor.
- Step 58 should add a separate batch-action contract for selected/visible article ids, status updates, tag changes, read-later changes, and cache deletion instead of reusing export result state as a generic multi-select model.

## 2026-04-30 ASCII Addendum XXII

### Stage 7 Step 58 Completed: visible-queue batch operations

- Completed `implementation-plan.md` Stage 7 Step 58 by adding a dedicated batch-operation path for the current visible queue selection.
- Added `apps/desktop/src/features/reader-shell/batch-operations.ts` as the pure execution boundary. It accepts selected article ids and a batch command, validates ids, deduplicates selection, updates article list rows plus article detail state, applies article tags, and removes selected cache entries without touching unselected articles.
- Added `components/batch-operations-card.tsx` and extended `components/queue-pane.tsx` so the queue can select individual visible rows, select all visible rows, clear selection, run state/tag/cache commands, and display the latest batch report.
- Extended `state.ts` with local queue-selection helpers. Selection is intentionally a shell UI concern, not a repository snapshot field or export result.
- Updated `reader-shell-route.tsx` to prune selections when the visible queue changes and to delegate execution through `runMockBatchOperation` instead of mutating queue state inline.
- Updated `mock-data.ts` so the mock repository applies batch operation results to its shell snapshot, including article details, list rows, and cache inventory.
- Added focused unit coverage in `batch-operations.test.ts` and user-visible shell coverage in `reader-shell.test.tsx` proving that selected articles are updated and unselected articles remain unchanged.

### Step 58 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run batch-operations.test.ts reader-shell.test.tsx`
- Passed `corepack pnpm run format`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 7 Step 59: error prompts and task status panel.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/batch-operations.ts` owns pure batch mutation rules only; it should not become a task-status registry, durable backend executor, or UI component.
- `apps/desktop/src/features/reader-shell/state.ts` owns local queue selection only; it should not persist batch execution results or cache inventory.
- `apps/desktop/src/features/reader-shell/mock-data.ts` owns mock batch execution against the shell snapshot until a durable backend path exists.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx` remains the mutation wiring and composition layer, not the batch executor.
- Step 59 should introduce a task/status boundary that can observe failures from batch operations, exports, cache cleanup, and feed work without moving those feature-specific rules into a single monolithic component.

## 2026-04-30 ASCII Addendum XXIII

### Stage 7 Step 59 Completed: task status panel and recoverable error prompts

- Completed `implementation-plan.md` Stage 7 Step 59 by adding a dedicated task-status observation boundary for the desktop reader shell.
- Added `apps/desktop/src/features/reader-shell/task-status.ts` as the pure status summarizer. It converts feature mutation inputs into normalized task entries with `idle`, `running`, `completed`, and `failed` states, and computes the task monitor headline/counts without owning any feature execution rules.
- Added `components/task-status-panel.tsx` so the shell header can show source refresh, OPML import/export, Markdown export, HTML/PDF export, cache cleanup, and batch-operation status from one visible surface. Failed tasks include error details, recovery guidance, and a retry button only when the route has enough context to safely retry.
- Updated `reader-shell-route.tsx` to compose task observations from existing React Query mutations and feature results while keeping refresh, export, cleanup, and batch execution inside their existing mutation/repository paths.
- Updated `mock-data.ts` with a deliberate failure path for the empty archive feed refresh, allowing Step 59 to verify task failure, recovery text, and retry entry without weakening successful refresh behavior for normal feeds.
- Added pure unit coverage in `task-status.test.ts` and user-visible shell coverage in `reader-shell.test.tsx` for task completion, task failure details, recovery text, and retry behavior.

### Step 59 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run task-status.test.ts reader-shell.test.tsx`
- Passed `corepack pnpm run format`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 60: define synchronization entities and event boundaries.
- Preserve the current boundary split:
- `apps/desktop/src/features/reader-shell/task-status.ts` owns task observation and summary normalization only; it is not a sync log, persistent job queue, mutation executor, or durable backend task registry.
- `components/task-status-panel.tsx` owns the visible task monitor only; it does not decide how refresh, export, cleanup, or batch rules execute.
- `reader-shell-route.tsx` remains the shell composition layer. It may pass current mutation state into the status panel, but it should not absorb feature-specific execution rules.
- `mock-data.ts` remains a mock repository and failure-fixture owner for shell validation. Durable Step 60 work should define real sync-event semantics in the domain/storage boundary rather than reusing mock task states.
- Step 60 should start from the architecture-level sync model (`SyncEvent`, local-only fields, lazy-loaded content, and service-side minimal entities), not from React Query mutation status or the Step 59 panel UI.

## 2026-04-30 ASCII Addendum XXIV

### Stage 8 Step 60 Completed: synchronization entities and event boundaries

- Completed `implementation-plan.md` Stage 8 Step 60 by adding a shared synchronization contract and a pure Rust boundary classifier.
- Added `packages/shared-types/src/sync.ts` so cross-platform code now has typed `SyncEvent` entity kinds, change kinds, payload shape, field-boundary labels, encrypted blob kinds, and service-side minimal DTOs for `User`, `Device`, `SyncEvent`, `EncryptedBlob`, and `UserSettings`.
- Updated `packages/shared-types/src/ids.ts` and `packages/shared-types/src/index.ts` so `UserId`, `EncryptedBlobId`, sync DTOs, sync constants, and boundary types are exported from the shared type package.
- Moved `SyncEventDto` out of the broad automation DTO file. `automation.ts` still owns rules, smart folders, and AI artifacts; synchronization now has its own shared file because Step 60 starts the sync phase.
- Replaced the placeholder `crates/sync-engine/src/lib.rs` with a pure classifier for `SyncEvent`, local-only, and lazy encrypted blob boundaries. It currently classifies user-state updates, annotation changes, article-tag relationship changes, article content blob updates, local article body cache materialization/eviction, and local feed diagnostics.
- Verified the Step 60 acceptance cases directly: article state changes become `user-state` sync events, annotation changes become `annotation` sync events, and body cache materialization stays device-local while actual body bytes are represented as lazy encrypted blobs.

### Step 60 Verification

- Passed `corepack pnpm --filter @freelyrss/shared-types check`
- Passed `cargo test -p freelyrss-sync-engine`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 61: generate local sync events.
- Preserve the current boundary split:
- `packages/shared-types/src/sync.ts` owns cross-platform sync DTO names, field-boundary constants, and service-side minimal entity contracts; it does not generate events or implement transport.
- `crates/sync-engine/src/lib.rs` owns sync classification rules only; it does not read SQLite, write `SyncEvent`, call a server, or replay remote batches yet.
- `crates/core-domain/src/model/automation.rs` still owns the durable local `SyncEvent` domain shape that maps to SQLite; Step 60 did not change the local database schema.
- `Feed.health_status`, fetch validators, fetch errors, `Attachment.local_cache_path`, FTS/search rows, rule audit details, and Step 59 task-status rows remain local-only facts.
- `Article.content_raw`, `Article.content_extracted`, and attachment bytes must not be inlined into ordinary event payloads; future sync should reference encrypted blob records and lazy-load content when needed.
- Step 61 should consume the classifier when wiring state/tag/annotation/subscription writes to local event-log creation, instead of deriving event semantics from React Query mutation state or reader-shell task rows.

## 2026-05-09 ASCII Addendum XXV

### Stage 8 Step 61 Completed: local sync-event generation

- Completed `implementation-plan.md` Stage 8 Step 61 by wiring local mutation paths to durable `SyncEvent` rows without starting remote transport or event replay.
- Extended `crates/sync-engine/src/lib.rs` so the Step 60 classifier now covers `Feed.folder_id` updates and FeedTag attach/detach events in addition to user-state, annotation, ArticleTag, lazy blob, and local-only decisions.
- Added `crates/core-domain/src/sqlite/sync_event_store.rs` as the local event-log write boundary. It updates `UserState`, inserts `Annotation`, moves `Feed.folder_id`, attaches article/feed tags, and inserts the corresponding `SyncEvent` in the same SQLite transaction.
- Kept event payloads aligned with the shared sync DTO shape by writing `changedFields` and `value` JSON payloads while still using the local schema's snake_case field vocabulary.
- Added a focused Step 61 regression that executes one mark-read write, one note creation, and one feed move, then verifies the event log contains `user-state/update`, `annotation/create`, and `feed/update` records with the expected payloads.
- Updated the Cargo lockfiles so the new `freelyrss-core-domain -> freelyrss-sync-engine` dependency is reflected both in the root Rust workspace and the desktop Tauri workspace.
- Fixed a Rust 1.95 Clippy-only issue in `crates/feed-engine/src/parser/rss.rs` by collapsing a guarded `thumbnail` branch; this preserves parser behavior and keeps the full repository verification chain green.

### Step 61 Verification

- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo test -p freelyrss-core-domain sync_event`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Environment Notes

- `corepack pnpm install` had to be rerun because `node_modules` was missing `@biomejs/biome`; hook installation still cannot run because `git` is not available in PATH, so the successful dependency sync used `corepack pnpm install --ignore-scripts`.
- Cargo validation used a temporary `CARGO_HOME` under `target/codex-cargo-home` with an rsproxy sparse registry override. No repository Cargo config was written.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 62: sync engine foundation.
- Preserve the current boundary split:
- `crates/sync-engine/src/lib.rs` owns classification rules and should next add batch/replay abstractions on top of already-generated events, not duplicate SQLite write semantics.
- `crates/core-domain/src/sqlite/sync_event_store.rs` owns atomic local mutation plus event-log insertion. It should not call remote services, manage cursors, encrypt blobs, or replay remote batches.
- `crates/core-domain/src/model/automation.rs` still owns the durable local `SyncEvent` shape, and no schema migration was required for Step 61.
- `Feed.health_status`, fetch validators, fetch errors, FTS rows, rule audit internals, local cache paths, and Step 59 task-status rows remain local-only facts.
- Step 62 should consume `SyncEvent` rows for event batches, cursors, retry handling, and local replay while keeping sync transport and service APIs for later steps.

## 2026-05-10 ASCII Addendum XXVI

### Stage 8 Step 62 Completed: sync engine foundation

- Completed `implementation-plan.md` Stage 8 Step 62 by adding pure sync-engine primitives for event batch packaging, cursor tracking, retry state, and local replay.
- Added `crates/sync-engine/src/batch.rs` with `SyncEventEnvelope`, `SyncCursor`, `SyncEventKey`, `SyncEventBatch`, and `package_event_batch`. Batches are sorted by `created_at + id`, advance cursors deterministically, and report `has_more` without owning storage.
- Added `crates/sync-engine/src/replay.rs` with `SyncReplayState` and `replay_event_batch`. Replay applies create/update/snapshot/delete events for sync-owned entities, attach/detach events for relationship tables, skips duplicate event ids, and updates an in-memory replay cursor.
- Added `crates/sync-engine/src/retry.rs` with `RetryPolicy`, `RetryState`, and failure/success helpers for bounded retry decisions.
- Added `crates/sync-engine/src/error.rs` so batch, replay, and retry callers share one explicit error vocabulary instead of stringly typed failures.
- Updated `crates/sync-engine/src/lib.rs` to expose the new modules while keeping the existing Step 60/61 classifier API stable.
- Updated `crates/core-domain/src/sqlite/sync_event_store.rs` tests so Step 61-generated SQLite `SyncEvent` rows are converted to `SyncEventEnvelope`, packaged, and replayed into an empty sync replica state. This proves the local event writer can feed Step 62 without changing the stored payload contract.
- Added `serde_json` as an explicit `freelyrss-sync-engine` dependency because replay needs to inspect `SyncEvent.payload` values directly.
- No database schema migration was required. Step 62 consumes the existing `SyncEvent` table and does not add durable cursor, retry, or remote task tables.

### Step 62 Verification

- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo test -p freelyrss-core-domain sync_event`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --bins --features tauri/custom-protocol --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'"`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`

### Environment Notes

- Direct `crates.io` access timed out while validating the desktop Tauri host dependency graph, specifically while fetching registry entries such as `cairo-rs`.
- The successful desktop host check and Tauri no-bundle build used a temporary Cargo registry override under `target/codex-cargo-home` pointing to `sparse+https://rsproxy.cn/index/`. No repository Cargo config was written.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 63: sync server skeleton.
- Preserve the current boundary split:
- `crates/sync-engine/src/batch.rs` owns packaging and cursor movement only; it should not query SQLite, call remote APIs, encrypt payloads, or persist retry state.
- `crates/sync-engine/src/replay.rs` owns local replay primitives and idempotence by event id. It is not a conflict resolver and should not silently invent business entities outside the event payload.
- `crates/sync-engine/src/retry.rs` owns bounded retry state transitions only; durable scheduling, backoff timing, and task display belong to later adapters.
- `crates/core-domain/src/sqlite/sync_event_store.rs` remains the local event writer. It should continue producing the Step 61 payload contract and should not absorb server upload/download logic.
- Step 63 should create the remote service skeleton around event upload, event pull, device identity, and encrypted object listing while keeping the service-side model smaller than the client SQLite schema.

## 2026-05-10 ASCII Addendum XXVII

### Stage 8 Step 63 Completed: sync server skeleton

- Completed `implementation-plan.md` Stage 8 Step 63 by adding a minimal Rust/Axum sync server under `apps/sync-server`.
- Added account login, bearer-token authentication, device registration/listing, sync event upload, sync event pull, and encrypted blob metadata listing/registration routes.
- Reused the Step 62 `SyncEventEnvelope`, `SyncCursor`, and `package_event_batch` contract for remote event pull responses instead of inventing a server-only event shape.
- Kept the service-side model intentionally smaller than the local SQLite schema. The server stores only users, devices, sync event envelopes, and encrypted blob metadata in its current in-memory skeleton.
- Added a boundary regression proving the remote API rejects client business entities such as `article` as uploaded sync events. Local `Article`, `Feed`, `Annotation`, and `UserState` tables remain client-side read/write models, not server REST resources.
- Added the sync server as a root Cargo workspace member so `cargo test --workspace`, Clippy, and the repository `verify` chain include it.
- Fixed the root `Cargo.lock` duplicate `dependencies` key left under the `freelyrss-sync-engine` package entry before regenerating the lockfile for the new server dependencies.

### Step 63 Verification

- Passed `cargo test -p freelyrss-sync-server`
- Passed `cargo fmt --all --check`
- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo test -p freelyrss-core-domain sync_event`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --bins --features tauri/custom-protocol --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'"`
- Passed `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --bins --features tauri/custom-protocol --config "source.crates-io.replace-with='rsproxy'" --config "source.rsproxy.registry='sparse+https://rsproxy.cn/index/'"`

### Environment Notes

- `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` was attempted repeatedly and timed out with no stdout after long waits in this environment. The leftover cargo child processes were stopped after each timeout.
- The desktop frontend build and the desktop Tauri host `cargo check` plus `cargo build` both passed, so the actual frontend and Rust host compile/link paths were verified even though the Tauri CLI wrapper did not return.
- Desktop host cargo validation used the same temporary rsproxy registry override style recorded in Step 62. No repository Cargo config was written.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 64: conflict merge rules.
- Preserve the current boundary split:
- `apps/sync-server` is a remote protocol skeleton and should not become a conflict resolver, durable scheduler, local SQLite mirror, or article-reading API.
- `apps/sync-server/src/state.rs` is an in-memory skeleton store only. Step 64 should not hide conflict semantics inside this temporary map-backed storage.
- `crates/sync-engine/src/replay.rs` still provides deterministic replay and duplicate-event skipping, not field-level conflict resolution.
- Step 64 should define conflict merge rules around the sync event contract: field-level timestamps for user state, max valid reading progress, append-only annotations, explicit tag set operations, and subscription ordering events.

## 2026-05-10 ASCII Addendum XXVIII

### Stage 8 Step 64 Completed: conflict merge rules

- Completed `implementation-plan.md` Stage 8 Step 64 by adding an explicit sync-engine conflict merge layer instead of hiding conflict behavior inside the sync server's temporary in-memory store.
- Added `crates/sync-engine/src/merge.rs` with `SyncMergeState`, `MergedEntity`, `SyncMergeOutcome`, and `merge_event_batch`.
- Kept Step 64 separate from Step 62 replay. `replay.rs` remains a deterministic application/idempotence primitive, while `merge.rs` owns conflict semantics for concurrent events.
- Implemented field-level clocks using `SyncEventKey(created_at + event_id)`. Normal entity fields use last-writer-wins by field, while `UserState.reading_progress` validates `0..=1` and keeps the maximum progress even if a lower value arrives later.
- Implemented append-preserving annotation behavior by merging annotations by unique annotation id instead of collapsing multiple notes/highlights for the same article into one record.
- Implemented explicit relationship set operations for `FeedTag` and `ArticleTag`; attach/detach events update relation sets with per-relation event versions, so stale attach events cannot re-add a tag after a newer detach.
- Treated subscription organization as normal sync-owned fields. `Feed.folder_id`, `Feed.sort_order`, and related feed fields merge independently by field clock, so a later reorder does not wipe out an older custom name.
- No database schema migration was required. Step 64 is a pure sync-engine behavior layer and does not add durable conflict tables, encrypted blob storage, key material, or server persistence.

### Step 64 Verification

- Passed `cargo fmt --all --check`
- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. This warning did not fail the build and no Step 64 code changed the desktop bundle path.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 65: end-to-end encryption.
- Preserve the current boundary split:
- `crates/sync-engine/src/merge.rs` owns conflict merge rules only. It should not hold encryption keys, upload blobs, schedule retries, or write SQLite rows.
- `crates/sync-engine/src/replay.rs` remains deterministic replay/idempotence, not a conflict resolver.
- `apps/sync-server` remains a remote protocol skeleton. Step 65 may add ciphertext-oriented boundaries, but it should not expose readable client business tables or plaintext user state.
- Step 65 should make the client key boundary explicit and keep the server limited to ciphertext, necessary indexes, encrypted object metadata, and device-level metadata.

## 2026-05-10 ASCII Addendum XXIX

### Stage 8 Step 65 Completed: end-to-end encryption boundary

- Completed `implementation-plan.md` Stage 8 Step 65 by introducing a client-held encryption boundary for remote sync events.
- Added `crates/sync-engine/src/encryption.rs` with `ClientMasterKey`, `EncryptionNonce`, `EncryptedSyncPayload`, `EncryptedSyncEventEnvelope`, `EncryptedSyncEventBatch`, `MasterKeyRecoveryKit`, `encrypt_sync_event`, `decrypt_sync_event`, `package_encrypted_event_batch`, `export_master_key_recovery_kit`, and `restore_master_key_from_recovery_kit`.
- Event payload encryption uses AES-256-GCM. Event metadata is authenticated as AAD so ciphertext cannot be replayed under a different event id, entity id, device id, or timestamp without decryption failure.
- Master key recovery is modeled as a client-side export/import flow: PBKDF2-HMAC-SHA256 derives a wrapping key from the recovery secret and salt, then wraps the 32-byte client master key. The server never receives the recovery secret or plaintext master key.
- Updated `apps/sync-server` so upload and pull routes now use `encryptedPayload`; the in-memory server store holds `EncryptedSyncEventEnvelope` values and rejects plaintext sync payloads at the remote boundary.
- Updated `packages/shared-types/src/sync.ts` and `packages/shared-types/src/index.ts` with encrypted event DTOs and recovery kit DTOs so future desktop/Web/mobile clients share the same sync API shape.
- No database schema migration was required. Step 65 changes the remote sync API and sync-engine transport boundary, not the local SQLite `SyncEvent` table or merge/replay semantics.

### Step 65 Verification

- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo test -p freelyrss-sync-server`
- Passed `corepack pnpm --filter @freelyrss/shared-types check`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm run desktop:build`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 66: desktop synchronization settings UI.
- Preserve the current boundary split:
- `crates/sync-engine/src/encryption.rs` owns client-side key material, event payload encryption/decryption, encrypted event batching, and recovery kit construction. It does not upload blobs, store keys in the OS keychain, own account settings, or write SQLite rows.
- `crates/sync-engine/src/merge.rs` remains the conflict-merge policy layer. It consumes decrypted `SyncEventEnvelope` values and must not learn about ciphertext, recovery secrets, or server storage.
- `apps/sync-server` remains a ciphertext protocol boundary. It may validate event metadata and encrypted payload envelope shape, but it must not decrypt payloads or expose plaintext `Article`, `Annotation`, or `UserState` resources.
- `packages/shared-types/src/sync.ts` owns cross-platform DTO names only. It should not generate keys or implement encryption.
- Step 66 should build the desktop configuration surface around sync enablement, account/server/device status, and user-visible sync errors without adding WebDAV transport, object-storage upload scheduling, or keychain persistence yet.

## 2026-05-11 ASCII Addendum XXX

### Stage 8 Step 66 Completed: desktop synchronization settings UI

- Completed `implementation-plan.md` Stage 8 Step 66 by adding a dedicated desktop synchronization settings surface to the left pane of the reader shell.
- Added a separate `apps/desktop/src/features/sync-settings` feature slice for the Step 66 UI state and validation rules. The sync settings code models enablement, server URL, account email, device list, last-sync time, and user-visible status only.
- Implemented explicit UI states for `Not configured`, `Syncing`, `Sync failed`, and `Sync successful`. The current mock validation accepts `https://sync.freelyrss.dev` and local `http://localhost` / `http://127.0.0.1` endpoints, and it rejects unsupported remote URLs with a visible recovery message.
- Kept the sync settings surface separate from the Step 59 reader task monitor. The new test confirms the Task Status panel does not absorb sync account/configuration state.
- Kept client key material out of React state. Step 66 does not generate, display, persist, upload, or recover master keys; it only names the boundary where future keychain and transport adapters can connect.
- No database schema migration was required. The implementation is a desktop UI/status step and does not add durable account tables, cursor persistence, upload queues, WebDAV storage, or object-store scheduling.

### Step 66 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 8 Step 67: WebDAV / Nextcloud adapter layer.
- Preserve the current boundary split:
- `apps/desktop/src/features/sync-settings` owns only desktop configuration and status presentation. It should not become a scheduler, keychain adapter, upload worker, or WebDAV client.
- `crates/sync-engine/src/encryption.rs` remains the client-side cryptographic boundary for event payload encryption, decryption, encrypted batching, and recovery-kit construction.
- `apps/sync-server` remains the official ciphertext protocol boundary and should not gain plaintext reader endpoints as part of WebDAV work.
- Step 67 should add an object-storage-style self-hosted transport adapter around encrypted event batches and encrypted blob metadata while keeping the same sync event protocol.

## 2026-05-11 ASCII Addendum XXXI

### Stage 8 Step 67 Completed: WebDAV / Nextcloud adapter layer

- Completed `implementation-plan.md` Stage 8 Step 67 by adding a WebDAV / Nextcloud self-hosted transport boundary in `crates/sync-engine`.
- Added `crates/sync-engine/src/webdav.rs` with `WebDavSyncNamespace`, `WebDavSyncManifest`, `WebDavObject`, `WebDavObjectStore`, `InMemoryWebDavObjectStore`, `WebDavEncryptedBlobMetadata`, `put_webdav_manifest`, `put_webdav_event_objects`, `pull_webdav_event_batch`, `put_webdav_blob_manifests`, and `list_webdav_blob_manifests`.
- The adapter writes encrypted event envelopes as JSON objects under stable relative WebDAV keys and pulls them back through `package_encrypted_event_batch`, so official server pulls and WebDAV pulls share the same cursor semantics.
- Added encrypted blob manifest support for metadata only: blob id, user id, kind, storage key, byte size, checksum, creation time, and optional referenced event id. The adapter does not upload plaintext article bodies, attachment bytes, local cache paths, or SQLite database files.
- Added WebDAV boundary regressions proving that a WebDAV event batch matches the official encrypted batch path and converges to the same replay state after client-side decryption, that blob manifests preserve encrypted-object metadata only, and that business table events or SQLite-like blob paths are rejected.
- Extended `SyncEngineError` with `InvalidWebDavObject` and mapped that error to sync-server bad requests so workspace Clippy remains exhaustive when all sync-engine errors are considered.
- Added `serde` as a direct `freelyrss-sync-engine` dependency for WebDAV object manifest serialization. `Cargo.lock` now records that direct dependency edge.
- No database schema migration was required. Step 67 is a transport adapter boundary and does not add durable account settings, cursor tables, upload queues, WebDAV credentials, or keychain persistence.

### Step 67 Verification

- Passed `cargo test -p freelyrss-sync-engine webdav`
- Passed `cargo test -p freelyrss-sync-engine`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 9 Step 68: integration adapter boundary.
- Preserve the current boundary split:
- `crates/sync-engine/src/webdav.rs` owns object-storage-style self-hosted sync transport mapping only. It should not become an HTTP client scheduler, credential store, keychain adapter, third-party bridge registry, or local SQLite backup system.
- `crates/sync-engine/src/encryption.rs` remains the client-side cryptographic boundary. WebDAV stores ciphertext envelopes and metadata; it must not decrypt payloads or hold master keys.
- `apps/sync-server` remains the official ciphertext sync protocol boundary. WebDAV support does not require adding plaintext reader endpoints or server-side conflict resolution.
- Step 68 should define third-party integration contracts in `crates/integration-engine`, keeping provider-specific bridge, webhook, later-read, and knowledge-base export logic out of reader UI, core-domain schema, and sync transport modules.

## 2026-05-11 ASCII Addendum XXXII

### Stage 9 Step 68 Completed: integration adapter boundary

- Completed `implementation-plan.md` Stage 9 Step 68 by turning `crates/integration-engine` from a placeholder into a tested Rust adapter boundary for external integrations.
- Added a shared `IntegrationAdapter` trait with a manifest and generic `invoke` entry point. The trait is intentionally provider-neutral so the core reader shell can call an adapter without importing RSSHub, Pocket, Notion, Webhook, or other concrete service concepts.
- Added `IntegrationManifest`, `IntegrationKind`, `IntegrationCapability`, request DTOs, response DTOs, and article snapshot DTOs for the four Step 68 integration classes: bridge source conversion, later-read saving, export connectors, and automation event dispatch.
- Added `IntegrationRegistry` so clients can register adapters, list manifests by integration kind, and invoke adapters through a single dispatch path. The registry rejects duplicate adapters, missing adapters, and unsupported operations before provider-specific details leak upward.
- Added `NoopIntegrationAdapter` as the empty implementation adapter required by Step 68. It supports all four integration kinds by default and is useful for shell wiring, tests, and future UI discovery flows without making real network calls.
- Kept the step out of `reader-shell`, `sync-engine`, `sync-server`, WebDAV transport, and SQLite schema. No database migration was required.

### Step 68 Verification

- Passed `cargo test -p freelyrss-integration-engine`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 9 Step 69: outbound Webhook capability.
- Preserve the current boundary split:
- `crates/integration-engine/src/adapter.rs` owns the provider-neutral adapter trait and should remain free of concrete HTTP provider logic.
- `crates/integration-engine/src/model.rs` owns generic Step 68 request/response contracts. Webhook should enter through automation request/response shapes or an adapter-specific implementation behind that boundary.
- `crates/integration-engine/src/registry.rs` owns registration and dispatch. Reader UI should discover/invoke integrations through manifests and requests, not direct provider modules.
- `crates/integration-engine/src/noop.rs` remains a deterministic empty adapter for tests and shell wiring. It should not become a real provider client.
- Step 69 should implement Webhook as an automation adapter behind integration-engine boundaries, not as reader UI HTTP code, sync-engine code, WebDAV object logic, or a local business table.

## 2026-05-12 ASCII Addendum XXXIII

### Stage 9 Step 69 Completed: outbound Webhook capability

- Completed `implementation-plan.md` Stage 9 Step 69 by adding a concrete Webhook automation adapter behind the existing `crates/integration-engine` boundary.
- Added `WebhookAutomationAdapter`, `WebhookEndpoint`, `WebhookPayload`, and `WEBHOOK_AUTOMATION_ADAPTER_ID`.
- Extended `AutomationEventRequest` so automation events can carry `ArticleIntegrationSnapshot` values in addition to article ids and string properties. This lets article share, rule-hit, and export-complete flows send article metadata without exposing SQLite records to providers.
- The Webhook adapter sends an HTTP JSON POST with `eventName`, `articleIds`, `articles`, and `properties`, plus an `X-FreelyRSS-Webhook-Event` header for provider-side routing.
- Added local endpoint regression coverage proving a test Webhook receiver gets article id, title, URL, tags, and trigger metadata, and a failure regression proving non-2xx endpoint status is surfaced as a `WebhookDeliveryFailed` integration error.
- Kept Step 69 out of `reader-shell`, `sync-engine`, `sync-server`, WebDAV transport, and local SQLite schema. No database migration was required.

### Step 69 Verification

- Passed `cargo test -p freelyrss-integration-engine webhook`
- Passed `cargo test -p freelyrss-integration-engine`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy -p freelyrss-integration-engine --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 9 Step 70: basic REST API.
- Preserve the current boundary split:
- `crates/integration-engine/src/webhook.rs` owns outbound Webhook delivery only. It should not become reader UI code, a durable retry scheduler, a delivery-history database, a provider registry, or a local REST API server.
- `crates/integration-engine/src/model.rs` now allows automation events to carry article snapshots for outbound integrations. It should still avoid storage-layer records, sync events, and provider SDK types.
- `crates/integration-engine/src/registry.rs` remains the dispatch point for integrations. Step 70 should not bypass it for Webhook provider logic.
- Step 70 should implement the local desktop REST API with a localhost-only, permissioned boundary and should not reuse the remote sync-server API or expose raw local business tables as an unauthenticated network mirror.

## 2026-05-13 ASCII Addendum XXXIV

### Stage 9 Step 70 Completed: basic local REST API

- Completed `implementation-plan.md` Stage 9 Step 70 by adding a desktop-hosted local REST API in `apps/desktop/src-tauri`.
- Added `apps/desktop/src-tauri/src/local_api.rs` with a loopback-only listener bound to `127.0.0.1:0`, a generated per-process bearer token, local HTTP parsing, JSON responses, and regression tests.
- Exposed the local API status through the Tauri command `get_local_api_status`, returning the base URL, bearer token, and read-only flag to the desktop shell process.
- Implemented read-only `GET /health`, `GET /feeds`, `GET /articles`, `GET /articles/{id}`, `GET /search`, and `GET /exports` routes. Article detail responses materialize approved reader data, tags, annotations, and attachment metadata while excluding local cache paths.
- Mutation-style methods currently return `403 mutationRequiresUserConfirmation`, preserving the Step 70 requirement that marking read/starred or other writes must be gated behind an explicit desktop confirmation flow.
- The API rejects missing/invalid bearer tokens with `401`, refuses non-loopback bind addresses before startup, and checks loopback peers at request time.
- Export routes are entry-point descriptors only. They advertise Markdown, HTML, and PDF export confirmation paths without writing files from the API request.
- Kept Step 70 out of `apps/sync-server`, `crates/integration-engine`, Webhook delivery, WebDAV sync transport, and local SQLite schema migrations. No database schema migration was required.
- Added `getrandom` and `serde_json` as direct `freelyrss-desktop` Tauri host dependencies for token generation and JSON response serialization.

### Step 70 Verification

- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml local_api`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
- Passed `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check`
- Passed `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`

### Environment Notes

- The first `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml local_api` run compiled the desktop Tauri dependency graph and took about 13 minutes in this environment; subsequent desktop Tauri tests and Clippy completed quickly.
- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.
- During verification, stale Cargo processes from earlier timed-out desktop Tauri compile attempts were stopped before rerunning tests to avoid build-lock interference.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 9 Step 71: knowledge-base export connectors.
- Preserve the current boundary split:
- `apps/desktop/src-tauri/src/local_api.rs` owns only the local desktop REST API boundary. It should not become the remote sync API, a Webhook provider, a durable scheduler, a credential store, or an unauthenticated network mirror of SQLite tables.
- `GET /exports` is a read-only discovery surface. Step 71 should implement knowledge-base export connectors behind integration/export boundaries and existing export formatter paths, not by letting REST requests write arbitrary files without desktop confirmation.
- `apps/sync-server` remains the ciphertext sync protocol boundary and should not absorb desktop-local REST routes.
- `crates/integration-engine` remains the provider-neutral integration boundary. Knowledge-base connectors should enter through export connector contracts rather than direct reader UI provider code.

## 2026-05-14 ASCII Addendum XXXV

### Stage 9 Step 71 Completed: knowledge-base export connectors

- Completed `implementation-plan.md` Stage 9 Step 71 by adding a concrete knowledge-base export adapter behind the existing `crates/integration-engine` export connector boundary.
- Added `KnowledgeBaseExportAdapter`, `KnowledgeBaseExportTarget`, `KnowledgeBaseExportProfile`, and `KNOWLEDGE_BASE_EXPORT_ADAPTER_ID`.
- Added export-specific article and annotation snapshots: `ExportArticleSnapshot`, `ExportAnnotationSnapshot`, and `ExportAnnotationType`. These carry content, tags, source metadata, and notes for export connectors without expanding the lighter Webhook/read-later article snapshot.
- The adapter writes a Markdown directory under a caller-configured root directory. It generates an export index, article pages, and tag pages using relative paths and sanitized filenames.
- Profile mappings now cover generic Markdown directories, Obsidian vault-style Markdown, Logseq pages, and Notion Markdown import folders. The mappings are file-format/layout mappings only; no provider API credentials, remote Notion API calls, background scheduling, or local REST route writes were added.
- Added regression coverage proving a tagged/note-bearing article exports to the expected Markdown structure, Obsidian and Logseq profiles produce their profile-specific paths/metadata, and profile mismatches fail before writing files.
- Kept Step 71 out of `reader-shell`, `apps/desktop/src-tauri/src/local_api.rs`, `apps/sync-server`, Webhook delivery, WebDAV transport, and local SQLite schema migrations. No database schema migration was required.

### Step 71 Verification

- Passed `cargo test -p freelyrss-integration-engine knowledge_base`
- Passed `cargo test -p freelyrss-integration-engine`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy -p freelyrss-integration-engine --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `corepack pnpm run desktop:build`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 10 Step 72: AI Provider abstraction.
- Preserve the current boundary split:
- `crates/integration-engine/src/knowledge_base/` owns only knowledge-base Markdown export layout and file writing under a configured root. It should not become a Notion API client, a credential store, a background export scheduler, a local REST API route, or a reader UI component.
- `crates/integration-engine/src/model.rs` now separates export-rich article snapshots from lighter automation/read-later snapshots. Future connectors should keep provider payloads and storage-layer records out of generic request DTOs.
- `apps/desktop/src-tauri/src/local_api.rs` remains a read-mostly local API boundary. Knowledge-base export should continue to require desktop-side confirmation/orchestration before writing files.
- Step 72 should introduce AI provider contracts as a separate optional intelligence boundary, not by adding AI calls to reader UI, sync-engine, Webhook delivery, knowledge-base export formatting, WebDAV transport, or local business schema.

## 2026-05-15 ASCII Addendum XXXVI

### Stage 10 Step 72 Completed: AI Provider abstraction

- Completed `implementation-plan.md` Stage 10 Step 72 by adding `crates/ai-adapter` as the optional intelligence-layer boundary for local and remote model providers.
- Added a provider-neutral `AiProvider` trait, `AiProviderManifest`, `AiProviderCapability`, task request/response DTOs, `AiProviderRegistry`, and explicit `AiAdapterError` variants.
- Added `AiTaskSubmission` as the single task submission envelope for summaries, keyword extraction, translation, and limited-context question answering. This is only a submission contract; it is not a background queue.
- Added `AiExecutionPolicy` and `AiRetryPolicy` to carry timeout and retry rules at the provider boundary. The current step validates these rules but does not add durable scheduling, retry workers, or task history.
- Added deterministic `MockLocalAiProvider` and `MockRemoteAiProvider` implementations. Regression tests prove both provider kinds can execute through the same `AiProviderRegistry::submit` entry point.
- Kept Step 72 out of reader UI, `crates/integration-engine`, `crates/sync-engine`, WebDAV transport, the local REST API, and local SQLite schema migrations. No database schema migration was required.

### Step 72 Verification

- Passed `cargo test -p freelyrss-ai-adapter`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy -p freelyrss-ai-adapter --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 10 Step 73: AI task queue and cache.
- Preserve the current boundary split:
- `crates/ai-adapter` owns provider contracts, task submission DTOs, timeout/retry policy, registration, and deterministic mock providers. It should not become a worker queue, a cache store, an `AIArtifact` repository, a real provider SDK wrapper, or a reader UI feature.
- `crates/core-domain` already owns the local `AIArtifact` schema/model boundary. Step 73 should persist completed AI results through that domain boundary rather than inventing a separate AI result table.
- `crates/integration-engine` remains the third-party integration/export boundary. AI output should only enrich Webhook or knowledge-base export if a later explicit workflow supplies approved derived artifacts.
- Reader UI, sync-engine, WebDAV transport, and local REST API should not call model providers directly as part of Step 73.

## 2026-05-16 ASCII Addendum XXXVII

### Stage 10 Step 73 Completed: AI task queue and cache

- Completed `implementation-plan.md` Stage 10 Step 73 by adding queue/cache orchestration around the existing `crates/ai-adapter` provider boundary.
- Added `AiTaskQueue`, `AiQueueTask`, `AiQueueRunOutcome`, and `AiQueueReport`.
- The queue accepts explicit tasks, validates provider submissions plus artifact target metadata, runs one queued task through `AiProviderRegistry`, and maps completed provider responses into `core-domain::AIArtifact`.
- Added stable input hashing and an in-memory cache keyed by provider, article target, task capability, and task input. Equivalent queued tasks now return a cached `AIArtifact` instead of invoking the provider again.
- Added JSON result mapping for summary, keywords, translation, and question-answer outputs so completed AI results can flow into the existing `AIArtifact.result` domain shape without adding another AI result table.
- Added explicit queue/artifact mapping errors. Provider errors remain separate from queue validation and artifact conversion failures.
- Kept Step 73 out of reader UI, `crates/integration-engine`, `crates/sync-engine`, WebDAV transport, local REST API, sync-server routes, and SQLite migrations. No database schema migration was required.

### Step 73 Verification

- Passed `cargo test -p freelyrss-ai-adapter`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy -p freelyrss-ai-adapter --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm run desktop:build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 10 Step 74: summary and keyword extraction.
- Preserve the current boundary split:
- `crates/ai-adapter` now owns provider contracts plus queue/cache orchestration. It should still not become reader UI, a real provider SDK wrapper, a credential store, a local REST API route, or a sync transport.
- `AiTaskQueue` is an orchestration primitive, not a durable scheduler. Durable task tables, cancellation, user-visible progress history, retry workers, and persisted queue state remain later work unless Step 74 explicitly needs a minimal storage boundary.
- Completed results should continue to map into `core-domain::AIArtifact`; do not add a second AI result schema for summaries or keywords.
- Step 74 should implement summary and keyword extraction on top of the existing provider/queue/cache contracts, not by having reader UI call providers directly.

## 2026-05-16 ASCII Addendum XXXVIII

### Stage 10 Step 74 Completed: summary and keyword extraction

- Completed `implementation-plan.md` Stage 10 Step 74 by adding an explicit article-insight workflow for summary and keyword extraction.
- Added `AiArticleInsightWorkflow`, `AiArticleInsightRequest`, article snapshots, run reports, and cache seeding in `crates/ai-adapter`. The workflow builds summary and keyword queue tasks and executes them through `AiTaskQueue` plus `AiProviderRegistry`; it does not let reader UI call providers directly.
- Added `AIArtifactStore` in `crates/core-domain` so completed summary and keyword artifacts can be upserted and listed through the existing `AIArtifact` table. No database migration or second AI result schema was added.
- Added the desktop Tauri command `generate_article_insights`, which loads the selected article from SQLite, seeds the workflow cache from existing summary/keyword artifacts, runs the deterministic local mock provider, persists returned artifacts, and returns DTOs to the shell.
- Extended `ArticleDetailDto` with `aiArtifacts` and wired the desktop reader shell so the user explicitly clicks `Generate insights`; the reader panel then renders stored summary and keyword artifacts, provider metadata, cache-aware task status, and a mock fallback for browser-only development.
- Added regression coverage for the adapter workflow, SQLite artifact store, Tauri persistence/cache reuse, and reader UI generation/reopen behavior.

### Step 74 Verification

- Passed `cargo test -p freelyrss-ai-adapter`
- Passed `cargo test -p freelyrss-core-domain ai_artifact_store`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml ai_insights`
- Passed `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm --filter @freelyrss/shared-types check`
- Passed `corepack pnpm run desktop:build`
- Passed `corepack pnpm run verify`
- Passed `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`
- Browser-checked `http://localhost:1420/`: the AI panel rendered, `Generate insights` produced 2 artifacts, and summary/keywords/provider metadata appeared correctly.

### Environment Notes

- `corepack pnpm run desktop:build` and the Tauri no-bundle build completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.
- The browser check showed only the existing missing `favicon.ico` 404 in the dev server console; it is unrelated to Step 74.
- The desktop Tauri command now formats `createdAt` as a real UTC ISO timestamp using `chrono`, matching the rest of the Rust timestamp style.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 10 Step 75: translation and limited-context question answering.
- Preserve the current boundary split:
- `crates/ai-adapter/src/article_insights.rs` owns article summary/keyword workflow assembly and should remain a provider/queue orchestration layer, not a SQLite repository, credential store, UI feature, or durable scheduler.
- `crates/core-domain/src/sqlite/ai_artifact_store.rs` owns persistence for completed `AIArtifact` rows. Future persistent AI cache hydration should reuse this table rather than adding translation, Q&A, summary, or keyword-specific result tables.
- `apps/desktop/src-tauri/src/ai_insights.rs` owns the desktop host command boundary for article insight generation. It should continue loading authorized article data and persisting artifacts, while real provider credentials and model selection remain later work.
- Reader UI should keep AI optional and explicit. Step 75 should add translation and limited-context Q&A by consuming `AIArtifact` DTOs and Tauri/adapter workflows, not by importing provider SDKs or queue internals into React components.

## 2026-05-17 ASCII Addendum XXXIX

### Stage 10 Step 75 Completed: translation and limited-context question answering

- Completed `implementation-plan.md` Stage 10 Step 75 by adding explicit article translation and limited-context question workflows on top of the existing AI provider, queue, cache, and `AIArtifact` boundaries.
- Added `AiArticleActionWorkflow`, `AiArticleTranslationRequest`, `AiArticleQuestionRequest`, `AiArticleActionRun`, `AiArticleActionReport`, and `AiTranslationMode` in `crates/ai-adapter`.
- Translation supports full-article and selected-text modes. Question answering requires an allowed context scope and rejects mixed-scope contexts before provider invocation.
- Extended AI queue input hashing to include task properties, so metadata such as translation mode, target language, and question context scope participates in cache identity.
- Added desktop Tauri commands `generate_article_translation` and `answer_article_question`. They load authorized local article data, seed cache from existing `AIArtifact` rows, run the deterministic local mock provider, persist returned `translation` / `question-answer` artifacts, and expose DTOs to the shell.
- Wired the reader UI to expose explicit translation and question controls. The panel renders latest translation and answer artifacts, shows cited context ids, tracks AI translation/question task status separately from summary/keyword generation, and keeps browser-only mock fallback behavior for non-Tauri development.
- Added regression coverage proving selected text translation persists/reuses cache, and current-article Q&A cites only the current article even when other article ids are supplied.
- Kept Step 75 out of sync-engine, sync-server routes, WebDAV transport, integration-engine Webhook/knowledge-base export, local REST API routes, real provider SDKs, and SQLite migrations. No new AI result table was added.

### Step 75 Verification

- Passed `cargo test -p freelyrss-ai-adapter`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml ai_`
- Passed `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`
- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `corepack pnpm --filter @freelyrss/shared-types check`
- Passed `corepack pnpm --filter @freelyrss/desktop build`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy -p freelyrss-ai-adapter --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run format:check`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm --filter @freelyrss/desktop build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.
- Browser automation could not be run in this session because the required Node/browser control tool was not exposed, but the reader interaction path is covered by Testing Library regression tests and production build/type-checking.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 10 Step 76: AI privacy and enablement controls.
- Preserve the current boundary split:
- `crates/ai-adapter/src/article_actions.rs` owns translation and question workflow assembly only. It should not open SQLite, persist artifacts, manage credentials, call UI code, or start background workers.
- `apps/desktop/src-tauri/src/ai_actions.rs` owns desktop host authorization/orchestration for translation and Q&A. It may load approved local article context and persist completed artifacts, but should not become a real provider SDK wrapper or privacy settings store.
- Reader UI should keep AI optional and explicit. Step 76 should add privacy toggles, provider/scope disclosure, cache deletion, and regeneration controls without triggering AI on article open, route reconciliation, sync, Webhook, knowledge-base export, or local REST routes.
- Continue to use `AIArtifact` for persisted derived results; do not add translation-specific or Q&A-specific result tables unless a later storage design explicitly requires it.

## 2026-05-17 ASCII Addendum XL

### Stage 10 Step 76 Completed: AI privacy and enablement controls

- Completed `implementation-plan.md` Stage 10 Step 76 by adding explicit reader AI enablement and privacy controls around the existing insight, translation, and Q&A workflows.
- Added a reader-local `readerAiEnabled` setting that defaults to disabled and persists only as a UI preference. Opening the reader or switching articles now leaves all AI generation buttons disabled until the user explicitly enables AI.
- The reader panel now discloses the current provider id (`freelyrss.ai.mock.local`) and that current article text is sent only after an explicit AI button press. Cached AI artifacts remain visible while AI is disabled.
- Added article-level AI cache deletion. The desktop host exposes `delete_article_ai_cache`, and `AIArtifactStore` deletes all `AIArtifact` rows for the selected article without adding new AI result tables or schema migrations.
- Regeneration remains explicit. Existing summary/keyword, translation, and question controls still call the same host/adapter workflows, but route reconciliation, article open, sync, Webhook, knowledge-base export, and local REST routes do not trigger AI.
- Browser-only mock data now mirrors durable cache deletion so non-Tauri development uses the same reader flow.
- Kept Step 76 out of real provider SDKs, credential storage, sync-engine, sync-server routes, WebDAV transport, integration-engine Webhook/knowledge-base export, local REST API routes, and SQLite migrations. No database schema migration was required.

### Step 76 Verification

- Passed `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`
- Passed `cargo test -p freelyrss-core-domain ai_artifact_store`
- Passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml ai_`
- Passed `corepack pnpm --filter @freelyrss/shared-types check`
- Passed `corepack pnpm --filter @freelyrss/desktop build`
- Passed `cargo fmt --all --check`
- Passed `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`
- Passed `cargo clippy --workspace --all-targets -- -D warnings`
- Passed `cargo test --workspace`
- Passed `corepack pnpm run format:check`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm --filter @freelyrss/desktop build` completed successfully and emitted the existing Vite chunk-size warning for the generated desktop bundle. The warning did not fail the build.
- Browser automation was not run for this step; the default-disabled AI interaction path, explicit enablement, generation, and cache deletion are covered by Testing Library regression tests plus production build/type-checking.

### Next Step (ASCII update)

- The next implementation step in `implementation-plan.md` is Stage 11 Step 77: build the Web read-only entry.
- Preserve the current boundary split:
- Reader AI enablement is a local UI preference and privacy gate, not a provider credential store, durable scheduler, sync setting, or backend authorization model.
- `delete_article_ai_cache` deletes completed derived artifacts for one selected article through the `AIArtifact` table. It should not delete original article content, annotations, search indexes, WebDAV blobs, sync events, or knowledge-base export files.
- `AIArtifactStore` remains the completed-artifact repository. Future provider configuration, persistent privacy settings, and real model credentials should enter through explicit settings/storage boundaries rather than the reader pane or adapter workflows.
- Step 77 should build `apps/web` as a remote read-only access entry using synchronized data boundaries. It should not reuse desktop-local SQLite commands, desktop Tauri-only AI controls, local REST routes, or feed-fetching pipelines as if the Web app were the local-first desktop host.

## 2026-05-18 ASCII Addendum XLI

### Stage 11 Step 77 Completed: Web read-only entry

- Completed `implementation-plan.md` Stage 11 Step 77 by building `apps/web` as a standalone React + Vite read-only entry over synchronized article data.
- Added a Web workspace app with its own `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, React entrypoint, local stylesheet, and Vitest coverage.
- Added a remote-client mock layer that returns a session snapshot, feed summaries, article lists, and article detail snapshots. The Web app only reads these synchronized snapshots; it does not call Tauri commands, desktop-local SQLite, feed fetchers, or AI workflows.
- The Web UI now renders a signed-in remote session banner, source filters, a remote article queue, and a read-only article detail pane. It filters and opens synchronized articles from the remote snapshot while keeping state changes local to the browser shell.
- Added root workspace scripts for `web:dev`, `web:build`, and `test:web`, and extended `verify` so the Web entry is part of the full repository validation chain.
- Browser verification confirmed the page rendered correctly at `http://127.0.0.1:5174/`, default article details loaded, and filtering to `podcast` surfaced the expected remote article. The only console error was the existing `favicon.ico` 404 from the dev server.

### Step 77 Verification

- Passed `corepack pnpm install`
- Passed `corepack pnpm --filter @freelyrss/web build`
- Passed `corepack pnpm --filter @freelyrss/web test`
- Passed `corepack pnpm run format:check`
- Passed `corepack pnpm run lint`
- Passed `corepack pnpm run format`
- Passed `corepack pnpm run verify`
- Passed browser checks against `http://127.0.0.1:5174/`

### Environment Notes

- `corepack pnpm run verify` now includes `test:web` and `web:build`, so the Web entry is covered by the repository-wide validation chain.
- The browser dev server only reported the existing `favicon.ico` 404. No app-level runtime errors appeared during the Web verification flow.

### Step 77 File Responsibilities

- `apps/web/package.json`: declares the Web app package, its scripts, and its local React/Vite/testing dependencies.
- `apps/web/tsconfig.json`: owns the Web app TypeScript compiler settings.
- `apps/web/vite.config.ts`: owns the Web dev server and Vitest environment configuration.
- `apps/web/index.html`: provides the Web app HTML shell and root mount point.
- `apps/web/src/main.tsx`: bootstraps the React application into `#root`.
- `apps/web/src/web-app.tsx`: owns the read-only Web UI composition, including session summary, source filters, article queue, and detail pane.
- `apps/web/src/remote-client.ts`: owns the local remote snapshot mock used by the Web shell. It models synchronized read data and does not mutate local storage or invoke desktop-only commands.
- `apps/web/src/styles.css`: owns the Web-specific layout and responsive styling layered on top of the shared UI theme.
- `apps/web/src/web-app.test.tsx`: protects the read-only rendering and search filtering behavior.
- `apps/web/src/vite-env.d.ts`: provides Vite type declarations for the Web app.
- `package.json`: adds workspace scripts for Web development, build, test, and verification.
- `pnpm-lock.yaml`: records the workspace dependency graph after adding the Web app package.
- `memory-bank/progress.md`: records the completed Step 77 milestone, verification commands, browser check, and the Step 78 handoff.
- `memory-bank/architecture.md`: records the Step 77 Web entry architecture, file responsibilities, and boundary notes.

### Step 77 Boundary Notes

- `apps/web` is a remote read-only access surface. It should continue to consume synchronized snapshots and should not gain desktop-local SQLite commands, Tauri invocations, feed-fetching logic, or AI controls.
- The remote client mock is a shell boundary, not a durable sync implementation. Real API wiring can replace it later, but the Web app should keep a read-only contract.
- Future write-capable Web workflows, if any, should enter through an explicit remote API and sync boundary rather than being borrowed from desktop-only host commands.
- Step 78 should continue expanding the Web surface only within the remote/synchronized-data contract defined here.

## 2026-05-20 ASCII Addendum XLII

### Stage 11 Step 78 Completed: Web scope boundary contract

- Completed `implementation-plan.md` Stage 11 Step 78 by turning the Web boundary from a prose-only rule into an explicit TypeScript contract and regression-tested requirement list.
- Added `apps/web/src/web-scope.ts`, which defines allowed Web operations, deferred desktop/out-of-scope operations, requirement records, and `summarizeWebScopeRequirements`.
- The remote snapshot now includes the Web scope contract and summary so the Web shell can detect scope violations before rendering the normal reader surface.
- The Web reader now loads article details through `fetchRemoteArticleDetail` instead of directly importing the detail map, keeping the UI on the same remote-client facade that later API wiring can replace.
- Added DOM-level scope signals (`data-scope-mode` and `data-scope-blockers`) to make the current Web mode and blocking requirement count testable without adding visible in-app feature text.
- Added tests proving the initial Web requirement list has no blockers or scope violations, desktop-only capabilities are explicitly deferred, the remote client only exports read functions, and the UI does not render desktop-only actions.
- Kept Step 78 out of desktop Tauri commands, local SQLite stores, feed-engine fetchers, AI workflows, Webhook dispatch, knowledge-base export, local REST API routes, Rust crates, and database migrations. No schema migration was required.

### Step 78 Verification

- Passed `corepack pnpm --filter @freelyrss/web test`
- Passed `corepack pnpm --filter @freelyrss/web build`
- Passed `corepack pnpm run format:check`
- Passed `corepack pnpm run lint`
- Passed `corepack pnpm run verify`

### Environment Notes

- `corepack pnpm --filter @freelyrss/web build` completed successfully. No browser automation pass was run for Step 78 because the change is a contract/test boundary and the full Web build plus Testing Library coverage exercised the visible shell path.

### Step 78 File Responsibilities

- `apps/web/src/web-scope.ts`: owns the initial Web scope contract. It lists allowed remote-read operations, deferred desktop/out-of-scope operations, requirement records, and the summary function used to detect blockers or scope violations.
- `apps/web/src/remote-client.ts`: now returns the Web scope contract and scope summary with the remote snapshot, while remaining a read-only synchronized data facade.
- `apps/web/src/web-app.tsx`: now consumes article detail through `fetchRemoteArticleDetail`, rejects scope violations before normal rendering, and exposes non-visual scope mode/blocker attributes for tests and diagnostics.
- `apps/web/src/web-scope.test.ts`: protects the Step 78 requirement boundary by asserting that deferred capabilities stay deferred, initial Web requirements have no blockers, and the remote client exposes only read functions.
- `apps/web/src/web-app.test.tsx`: now verifies the rendered Web shell advertises remote-sync mode with zero blockers and does not expose desktop-only controls.
- `memory-bank/progress.md`: records the completed Step 78 milestone, verification commands, current status snapshot, and Step 79 handoff.
- `memory-bank/architecture.md`: records the Step 78 architecture insights, file responsibilities, and boundary notes.

### Step 78 Boundary Notes

- `WEB_SCOPE_CONTRACT` is a product/architecture guard, not an authorization system. Real Web API permissions, auth, and server policy must still be implemented at the remote API boundary when write-capable Web workflows are introduced.
- The Web scope summary should stay conservative: a deferred operation becoming `in-scope` should fail tests until a later implementation step explicitly expands the Web contract.
- The Web app may keep displaying synchronized state, annotations, attachments, and future derived artifact metadata, but generation, mutation, export, and deep system integration must enter through later explicit remote API designs.
- Step 79 should begin the mobile reading-priority shell and preserve the same discipline: mobile first covers login/sync, reading, search, notes, and podcast consumption without importing desktop-only local host responsibilities.

## 2026-05-20 ASCII Addendum XLIII

### Stage 11 Step 79 Completed: mobile reading-priority shell

- Completed `implementation-plan.md` Stage 11 Step 79 by turning `apps/mobile` from a placeholder package into a React Native + Expo shell focused on mobile reading workflows.
- Added Expo app metadata, TypeScript configuration, Vitest configuration, and package scripts for `start`, platform dev entrypoints, `check`, and `test`.
- Added `apps/mobile/src/mobile-scope.ts`, which defines the first mobile scope contract, allowed operations, deferred desktop/out-of-scope operations, requirement records, and `summarizeMobileScopeRequirements`.
- Added `apps/mobile/src/mobile-client.ts`, a synchronized mobile snapshot facade that returns account/session metadata, feeds, article queue rows, article details, synchronized note metadata, and podcast enclosure metadata. It only exports read functions.
- Added `apps/mobile/src/mobile-selectors.ts`, which keeps search, tab filtering, active-article selection, note extraction, and audio attachment selection testable outside the React Native view.
- Added `apps/mobile/App.tsx`, a compact mobile reader shell that shows sign-in/sync state, unread/note/audio metrics, tabbed reading/search/notes/podcast views, a synchronized article queue, a focused article page, a note draft field, and a podcast episode card.
- Added mobile regression tests proving the first mobile requirement list has no blockers or scope violations, desktop-only capabilities stay deferred, the client exposes only read functions, search reads synchronized snapshots, and note/podcast selectors surface the expected metadata.
- Added root scripts for `mobile:dev`, `mobile:check`, and `test:mobile`, and extended `verify` so mobile tests and type-checking are part of the repository validation chain.
- Kept Step 79 out of desktop Tauri commands, desktop SQLite stores, feed-engine fetchers, local REST routes, AI workflows, Webhook dispatch, knowledge-base export, complex rule administration, Rust crates, and database migrations. No schema migration was required.

### Step 79 Verification

- Passed `corepack pnpm install`
- Passed `corepack pnpm --filter @freelyrss/mobile test`
- Passed `corepack pnpm --filter @freelyrss/mobile check`
- Passed `corepack pnpm run format:check`
- Passed `corepack pnpm run lint`
- Passed `corepack pnpm --filter @freelyrss/mobile exec expo export --platform ios --output-dir dist-mobile-check`
- Passed `corepack pnpm run verify`

### Environment Notes

- `expo export --platform ios` generated a temporary `apps/mobile/dist-mobile-check` bundle for validation. The directory was deleted after the export passed.
- Expo SDK 55 recommends `react-native` `0.83.6` and `react` `19.2.0`. The first attempt with the newer npm `react-native` `0.85.3` failed Metro bundling, so `apps/mobile/package.json` now follows the Expo bundled native module map.

### Step 79 File Responsibilities

- `apps/mobile/package.json`: declares the mobile workspace app, Expo entrypoint, dev/test/type-check scripts, SDK 55 aligned runtime dependencies, and local test dependencies.
- `apps/mobile/app.json`: owns Expo app metadata for the initial FreelyRSS Mobile shell, including app name, slug, orientation, UI style, and basic platform metadata.
- `apps/mobile/tsconfig.json`: owns mobile TypeScript checking through Expo's base configuration with strict project-local compilation.
- `apps/mobile/vitest.config.ts`: owns the mobile unit-test configuration. Tests run in Node and focus on contracts/selectors rather than requiring a simulator.
- `apps/mobile/App.tsx`: owns the Step 79 React Native presentation shell. It composes the synchronized snapshot, mobile tabs, search box, article queue, reader content, note draft field, and podcast card without importing desktop reader-shell internals.
- `apps/mobile/src/mobile-scope.ts`: owns the mobile reading-priority scope contract. It lists allowed mobile operations, deferred desktop/out-of-scope operations, requirement records, and the scope summary function.
- `apps/mobile/src/mobile-client.ts`: owns the deterministic synchronized mobile snapshot facade. It models login/sync state, feeds, articles, article details, annotations, and audio attachments while exposing only read functions.
- `apps/mobile/src/mobile-selectors.ts`: owns pure mobile view derivation for search, tab filtering, active article fallback, unread/note/podcast counts, synchronized note text, and primary audio attachment selection.
- `apps/mobile/src/mobile-scope.test.ts`: protects the mobile scope boundary by asserting zero blockers, deferred desktop capabilities, and read-only mobile client exports.
- `apps/mobile/src/mobile-selectors.test.ts`: protects mobile reading/search/notes/podcast behavior against the synchronized snapshot facade.
- `package.json`: adds root mobile scripts and extends the repository `verify` chain with mobile tests and mobile type-checking.
- `pnpm-lock.yaml`: records the Expo SDK 55, React Native, React, TypeScript, and Vitest dependency graph for the mobile workspace package.
- `memory-bank/progress.md`: records the completed Step 79 milestone, verification commands, environment notes, and Step 80 handoff.
- `memory-bank/architecture.md`: records the Step 79 mobile architecture insights, file responsibilities, and boundary notes.

### Step 79 Boundary Notes

- `apps/mobile` is a mobile reading-priority client over synchronized data. It should not import from `apps/desktop/src/features/reader-shell`, `apps/desktop/src-tauri`, `crates/feed-engine`, local SQLite stores, local REST routes, or desktop AI workflows.
- The mobile snapshot facade is not a sync engine, auth system, durable cache, or persistence layer. Real API wiring should replace it at a remote sync/API boundary without expanding the mobile shell into a desktop host.
- The note draft field is a UI shell for Step 79. Durable note mutation and sync-event emission should enter through later explicit mobile API/sync work, not local SQLite writes.
- The podcast card exposes synchronized audio metadata only. Step 80 should add real mobile cache/media behavior through mobile platform boundaries while keeping complex rule editing, OPML administration, Webhook dispatch, AI generation, and knowledge-base export deferred.
