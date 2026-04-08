# FreelyRSS 架构基线

## 1. 文档定位

本文档是 FreelyRSS 的架构基线，用于把产品设计、技术选型与实施计划收敛为一个可执行的系统蓝图。

它回答以下问题：

- FreelyRSS 的系统目标是什么
- 架构按什么层次拆分
- 各核心模块分别负责什么，不负责什么
- 为什么桌面端是首个完整交付平台
- 各平台和各阶段应该如何演进

当前文档聚焦架构基线，不替代详细产品设计文档，也不替代后续更细粒度的模块设计与实现说明。

## 2. 系统目标

FreelyRSS 的目标不是做一个依赖在线服务才能成立的 RSS 客户端，而是构建一个“本地优先、离线优先、桌面优先”的阅读工作台。

架构目标如下：

- 在无账号、无云同步、无 AI 的情况下，核心阅读链路仍然完整可用
- 围绕“订阅、抓取、筛选、阅读、标注、导出”建立稳定的本地工作流
- 通过清晰的模块边界支持后续同步、AI、第三方桥接和开放接口
- 让桌面端先承载完整能力，再向 Web 与移动端扩展
- 保持数据模型统一，避免未来多端演进时语义分裂

非目标如下：

- 不把社交推荐、内容分发或团队协作作为核心架构前提
- 不让远程服务控制本地业务主模型
- 不为了“全平台同构”牺牲桌面端的能力完整性

## 3. 架构原则

- 本地优先：核心数据默认落地本地，离线可读、可搜、可导出
- 能力分层：离线核心、在线增强、智能增强必须边界清晰
- 模块解耦：抓取、规则、搜索、同步、AI、桥接都通过明确接口衔接
- 桌面优先：首个完整交付平台是桌面端，Web 和移动端按边界扩展
- 数据统一：领域模型、状态语义、同步协议优先统一，UI 可按平台差异化

## 4. 分层架构

FreelyRSS 采用三层架构：

- 核心离线层
- 可选在线层
- 可选智能层

### 4.1 核心离线层

核心离线层是产品成立的基础，即使关闭网络能力也必须独立运行。

包含能力：

- 订阅源管理
- Feed 抓取与解析
- 正文提取与内容清洗
- 文章存储、阅读状态与标注管理
- 全文搜索与过滤
- 规则引擎与智能组织基础
- 本地缓存与导出
- 阅读器界面、主题与可访问性

这一层的约束：

- 不依赖远程账号或远程 API
- 不依赖 AI 结果才能完成核心阅读
- 本地数据库是唯一业务事实来源
- 所有状态变化先写本地，再考虑是否同步或扩展

### 4.2 可选在线层

可选在线层是对本地阅读器的增强，而不是对核心能力的替代。

包含能力：

- 官方同步服务
- WebDAV / Nextcloud 等自托管同步
- RSS 桥接服务
- 稍后读、笔记工具、自动化平台集成
- Webhook 与对外 API

这一层的约束：

- 不直接篡改核心离线层的数据语义
- 与核心业务通过适配器连接，而不是让 UI 直连第三方服务
- 同步的是实体变更与事件，不是整个 SQLite 文件
- 任一在线能力失效时，阅读器主体仍可使用

### 4.3 可选智能层

可选智能层负责摘要、翻译、问答、聚类与推荐等增强能力。

包含能力：

- 摘要
- 关键词提取
- 主题聚类
- 翻译
- 问答
- 推荐

这一层的约束：

- 默认可关闭
- 结果是派生数据，不覆盖原始文章
- 失败不影响订阅、阅读、搜索、导出等主流程
- 本地模型与远程模型通过统一 Provider 边界接入

## 5. 核心模块边界

### 5.1 Feed Engine

职责：

- 拉取 RSS、Atom、JSON Feed
- 处理缓存头、增量更新、失败重试
- 将源数据标准化为统一 Feed / Article 输入

不负责：

- UI 展示
- 阅读状态管理
- 第三方同步逻辑

### 5.2 Source Management

职责：

- 订阅源、文件夹、标签、分组和排序管理
- OPML 导入导出
- 订阅源元数据编辑

不负责：

- 抓取实现细节
- 正文提取

### 5.3 Content Pipeline

职责：

- HTML 清洗
- 正文提取
- 缩略图与附件识别
- 内容标准化与去重辅助

不负责：

- 订阅树管理
- 同步协议

### 5.4 Library & State

职责：

- 文章存储
- 已读、星标、稍后读、喜欢、重要程度、阅读进度等用户状态
- 高亮、笔记、批注与附件关联

不负责：

- 远程同步编排
- AI 推断

### 5.5 Rule Engine

职责：

- 基于统一查询表达式评估规则
- 执行自动标记、分组、加标签和清理动作
- 产生命中审计记录

不负责：

- 独立维护另一套查询语法

### 5.6 Search Engine

职责：

- 基于 SQLite FTS5 提供全文搜索
- 支持来源、标签、日期、状态等过滤
- 输出命中片段与高亮信息

不负责：

- 规则动作执行
- 远程搜索服务依赖

### 5.7 Reader UI

职责：

- 呈现三栏高密度阅读界面
- 提供文章列表、阅读面板、键盘导航、主题与可访问性
- 消费本地数据与共享查询模型

不负责：

- 直接实现抓取、规则、同步、AI 核心逻辑

### 5.8 Sync Adapter

职责：

- 将本地事件与远程同步协议对接
- 处理设备、游标、冲突合并与加密边界

不负责：

- 充当业务主数据库
- 接管 UI 视图状态

### 5.9 Integration Adapter

职责：

- 接入桥接服务、自动化平台、知识库导出与 Webhook

不负责：

- 污染本地核心模型

### 5.10 AI Adapter

职责：

- 统一接入本地模型和远程模型
- 将结果写入派生数据层

不负责：

- 改写原始文章数据
- 要求核心功能依赖 AI 才能运行

## 6. 数据与控制流原则

FreelyRSS 的主数据流遵循以下顺序：

1. Feed Engine 抓取并标准化源数据
2. Content Pipeline 清洗与提取内容
3. Library & State 将文章、附件与用户状态写入本地数据库
4. Search Engine 更新本地索引
5. Reader UI 从本地数据库和索引层读取数据并渲染
6. 可选在线层与可选智能层在此基础上读取、补充和同步

关键原则：

- 本地数据库优先于所有远程状态
- UI 不直接依赖远程服务返回作为主数据源
- 在线层与智能层只消费或扩展本地模型，不反向定义核心模型

## 7. 平台策略

### 7.1 桌面端

桌面端是首个完整交付平台，也是 FreelyRSS 的主平台。

桌面端承载：

- 完整订阅与抓取能力
- 完整阅读与标注能力
- 本地数据库、全文搜索与缓存
- 规则引擎
- 导入导出
- 同步配置、AI 配置与扩展入口

选择桌面端优先的原因：

- 最符合“本地优先、离线优先、重度阅读工作台”的产品定位
- 最容易承载本地数据库、缓存、导出、键盘工作流和高密度界面
- 可先把复杂能力做扎实，再向其他平台下放

### 7.2 Web 端

Web 端定位为同步数据的远程访问入口，而不是首期完整阅读器。

Web 端优先承载：

- 阅读
- 搜索
- 轻量状态修改
- 基础管理

Web 端首期不承担：

- 本地抓取
- 完整离线缓存
- 深度系统集成
- 复杂规则编辑

### 7.3 移动端

移动端定位为阅读优先平台。

移动端优先承载：

- 阅读
- 搜索
- 笔记
- 同步
- 缓存
- 播客消费

移动端弱化：

- 复杂批处理
- 重配置能力
- 大量订阅源管理操作

## 8. 技术落地策略

当前推荐的落地主栈如下：

- 桌面端：Tauri v2 + React + TypeScript + Vite
- 核心逻辑：Rust
- 本地存储：SQLite + FTS5
- Web 端：React + TypeScript + Vite
- 同步服务：Rust + Axum + PostgreSQL + S3 兼容对象存储
- 移动端：React Native + Expo

仓库形态采用 monorepo，并按以下层次组织：

- `apps/`：桌面端、Web、移动端、同步服务
- `packages/`：共享 UI、共享类型、共享查询表达式、共享配置
- `crates/`：Rust 领域模型与核心引擎模块

## 9. 阶段路线图

### 阶段 0：文档基线

- 固化架构文档
- 固化数据库 schema
- 固化 Release 1 边界
- 建立进度记录机制

### 阶段 1：仓库与工程骨架

- 建立 monorepo 目录
- 初始化 pnpm workspace 与 Cargo workspace
- 建立 lint、format、CI 与版本管理基础设施

### 阶段 2：桌面壳与共享基础

- 初始化桌面应用壳
- 建立共享 UI、共享类型、共享查询表达式
- 搭建三栏主布局与基础导航

### 阶段 3：本地数据层与领域模型

- 建立 SQLite 迁移机制
- 建立核心业务表与索引
- 建立本地缓存目录
- 建立 Rust 领域模型

### 阶段 4：订阅抓取与源管理

- 实现 Feed 抓取、解析、持久化与去重
- 建立订阅树、源管理与 OPML 导入导出

### 阶段 5：阅读体验与文章状态

- 打通文章列表与阅读面板
- 实现正文提取、阅读状态、快捷键与批注

### 阶段 6：规则、智能文件夹与搜索

- 建立统一查询表达式
- 实现规则引擎、智能文件夹和全文搜索

### 阶段 7：离线缓存、导出与批处理

- 实现缓存策略、逐出策略、Markdown/HTML/PDF 导出与批量操作

### 阶段 8：同步基础能力

- 实现本地事件日志、同步引擎、同步服务骨架与冲突合并

### 阶段 9：集成与开放能力

- 建立 Webhook、REST API 与知识库导出连接器

### 阶段 10：AI 能力

- 实现 AI Provider、任务队列、摘要、翻译与问答

### 阶段 11：Web 与移动端

- 构建 Web 端远程访问入口
- 构建移动端阅读优先壳

### 阶段 12：稳定性、发布与收尾

- 补齐回归测试、端到端测试、性能基线与发布文档

## 10. 当前阶段结论

FreelyRSS 当前应先把桌面端作为首个完整交付平台完成落地，再把同步、Web、移动端和 AI 作为后续增强能力接入。

因此，当前架构基线的核心判断是：

- 核心离线层先成立
- 可选在线层后接入
- 可选智能层最后增强
- 所有后续实现都不能破坏“本地优先、离线优先、桌面优先”的基本盘

## 11. Release 1 范围基线

### 11.1 Release 1 包含

- 高亮与批注
- PDF 导出
- Markdown / HTML 导出
- 批量导出
- 播客附件识别与播放器入口
- 智能文件夹
- 桌面端完整离线阅读主链路

### 11.2 Release 1 不包含

- 官方同步
- Web 端
- 移动端
- AI 能力
- 本地桌面 API
- 团队协作

### 11.3 范围解释

- 首发版本先把桌面端的本地阅读、组织、搜索、标注与导出链路做完整。
- 所有需要远程账号、远程计算或多端一致性协议的能力，均后移到后续阶段。
- 智能文件夹虽然依赖统一查询表达式，但仍属于离线核心层，因此纳入首发范围。

## 12. 数据库 Schema 基线

本节固化桌面端本地数据库的核心实体与字段命名，作为阶段 3 建表与迁移的直接依据。当前字段名与 [RSS-design-document.md](./RSS-design-document.md) 保持一致。

### 12.1 Feed

- `id`
- `title`
- `site_url`
- `feed_url`
- `format`
- `icon`
- `folder_id`
- `custom_name`
- `sort_order`
- `update_interval`
- `health_status`
- `last_checked_at`
- `last_success_at`
- `etag`
- `last_modified`

约束建议：

- `id` 为主键。
- `feed_url` 全局唯一。
- `folder_id` 指向 `Folder.id`，允许为空。
- `health_status` 采用受控枚举值。

### 12.2 Folder

- `id`
- `name`
- `parent_id`
- `sort_order`
- `kind`

约束建议：

- `id` 为主键。
- `parent_id` 自引用 `Folder.id`，允许为空。
- `kind` 用于区分普通文件夹、系统文件夹和保留分组节点。

### 12.3 Tag

- `id`
- `name`
- `scope`
- `color`
- `created_at`

约束建议：

- `id` 为主键。
- `scope + name` 建议唯一，避免文章标签与订阅源标签语义混淆。

### 12.4 FeedTag

- `feed_id`
- `tag_id`

约束建议：

- 复合主键：`feed_id + tag_id`。
- 分别外键引用 `Feed.id` 与 `Tag.id`。

### 12.5 ArticleTag

- `article_id`
- `tag_id`

约束建议：

- 复合主键：`article_id + tag_id`。
- 分别外键引用 `Article.id` 与 `Tag.id`。

### 12.6 Article

- `id`
- `feed_id`
- `source_guid`
- `title`
- `author`
- `summary`
- `content_raw`
- `content_extracted`
- `canonical_url`
- `original_url`
- `published_at`
- `fetched_at`
- `language`
- `thumbnail`
- `word_count`
- `content_hash`

约束建议：

- `id` 为主键。
- `feed_id` 外键引用 `Feed.id`。
- `source_guid` 不要求全局唯一，但应结合 `feed_id` 建联合索引。
- `canonical_url`、`original_url`、`content_hash` 为去重核心字段。

### 12.7 Attachment

- `id`
- `article_id`
- `type`
- `url`
- `mime_type`
- `duration`
- `size`
- `local_cache_path`

约束建议：

- `id` 为主键。
- `article_id` 外键引用 `Article.id`。
- `type` 区分图片、音频、视频和其他附件。

### 12.8 UserState

- `article_id`
- `read_state`
- `starred`
- `liked`
- `importance`
- `read_later`
- `reading_progress`
- `last_opened_at`

约束建议：

- `article_id` 既是主键也是外键，引用 `Article.id`。
- `read_state`、`importance` 采用受控枚举值。
- `reading_progress` 限制在合法区间内。

### 12.9 Annotation

- `id`
- `article_id`
- `type`
- `selected_text`
- `anchor`
- `note`
- `color`
- `created_at`

约束建议：

- `id` 为主键。
- `article_id` 外键引用 `Article.id`。
- `anchor` 保存可定位到阅读内容的锚点结构。
- `type` 区分高亮、笔记、批注等记录类型。

### 12.10 Rule

- `id`
- `name`
- `enabled`
- `priority`
- `conditions`
- `actions`
- `scope`

约束建议：

- `id` 为主键。
- `conditions` 存储统一查询表达式。
- `actions` 存储命中后的动作定义。
- `priority` 决定规则执行顺序。

### 12.11 SmartFolder

- `id`
- `name`
- `query_definition`
- `sort_definition`

约束建议：

- `id` 为主键。
- `query_definition` 与 `Rule.conditions` 使用同一表达式模型。

### 12.12 AIArtifact

- `id`
- `article_id`
- `kind`
- `provider`
- `input_hash`
- `result`
- `created_at`

约束建议：

- `id` 为主键。
- `article_id` 外键引用 `Article.id`。
- 当前阶段保留表结构，但首发版本不启用相关流程。

### 12.13 SyncEvent

- `id`
- `entity_type`
- `entity_id`
- `change_type`
- `payload`
- `device_id`
- `created_at`

约束建议：

- `id` 为主键。
- `entity_type + entity_id` 用于定位业务实体。
- `payload` 保存实体变更或操作日志。
- 当前阶段保留表结构，但首发版本不启用远程同步。

### 12.14 关系与索引基线

- `Folder` 通过 `parent_id` 形成树结构。
- `Feed` 通过 `folder_id` 归属到订阅树节点。
- `FeedTag`、`ArticleTag` 作为多对多关系表，不承载额外业务状态。
- `Article` 是正文、搜索、状态、批注、附件的中心实体。
- `UserState` 与 `Article` 保持一对一。
- `Annotation`、`Attachment`、`AIArtifact` 与 `Article` 保持一对多。
- `SyncEvent` 是同步日志，不是业务读取主表。
- 阶段 3 应优先为 `feed_url`、`feed_id + source_guid`、`published_at`、`fetched_at`、状态字段和关联表外键补齐索引。

## 13. 当前工程骨架与模块职责

### 13.1 顶层目录职责

- `apps/`：承载可运行应用与服务壳，不放共享逻辑。
- `packages/`：承载 TypeScript 共享模块，供桌面端、Web 端、移动端复用。
- `crates/`：承载 Rust 共享领域与引擎模块，避免把抓取、规则、搜索等能力塞进单一应用。
- `memory-bank/`：承载产品、架构、技术路线、实施计划和进度记录，是当前阶段的主知识库。

### 13.2 当前应用目录职责

- `apps/desktop`：桌面端主应用，当前已承载 Tauri 壳、React 前端入口与最小桌面宿主配置；后续继续在此接入共享 UI、阅读器布局与本地能力入口。
- `apps/web`：Web 端远程访问入口，后续只消费同步后的远程数据。
- `apps/mobile`：移动端阅读优先应用，后续承接同步阅读、搜索、笔记与播客消费。
- `apps/sync-server`：远程同步服务，后续承接账号、设备、事件交换和对象存储清单。

### 13.3 当前共享包职责

- `packages/ui`：已承载共享主题变量、布局骨架与基础组件，不承载业务逻辑。
- `packages/shared-types`：共享领域标识符、基础原语、状态枚举与前端消费 DTO，承接桌面端、Web 端、移动端对统一数据契约的依赖，但不承载查询解释器或 React 展示逻辑。
- `packages/shared-query`：统一规则、搜索与智能文件夹的查询 AST、双输入归一化、序列化与 SQL 计划边界，不承载具体数据库执行器或 UI 状态。
- `packages/shared-config`：共享配置模型、环境变量边界与默认策略。

### 13.4 当前 Rust crate 职责

- `crates/core-domain`：核心实体、值对象、状态枚举与数据库映射边界。
- `crates/feed-engine`：抓取、解析、标准化与增量更新。
- `crates/content-pipeline`：正文提取、HTML 清洗、缩略图与附件识别。
- `crates/rule-engine`：统一查询表达式命中判断与动作执行。
- `crates/search-engine`：SQLite FTS5 搜索、过滤与高亮片段组装。
- `crates/sync-engine`：事件日志、同步批次、重放与冲突合并。
- `crates/integration-engine`：Webhook、REST 连接器、桥接服务与导出适配层。

### 13.5 当前工作区清单与文件职责

当前阶段已经从“纯目录占位”推进到“可被工具链识别的工作区骨架 + 可构建的桌面端应用壳 + 可被桌面壳消费的共享 UI / 共享类型 / 共享查询包 + 已落地的三栏阅读器骨架”。这些文件的职责应明确，避免后续把配置、样式、组件、视图状态与类型契约堆进单一根文件或单一应用。

- `package.json`：JS/TS 根工作区入口，声明仓库为私有 workspace、固定 `pnpm` 版本，并集中定义 `Biome`、共享配置测试、共享类型检查、Rust 检查、文档链接检查与 `verify` 等统一脚本；当前还补充了 `desktop:dev`、`desktop:build`、`desktop:tauri:dev`、`desktop:tauri:build` 四个桌面壳入口，避免桌面运行命令继续散落到应用目录内。
- `pnpm-workspace.yaml`：声明 `apps/*` 与 `packages/*` 为 JS/TS 工作区扫描边界，让桌面端、Web 端、移动端和共享包在单仓下统一发现。
- `pnpm-lock.yaml`：记录当前 JS/TS 工作区（含规范工具依赖）的锁定解析结果，用于保证依赖安装可复现。
- `.changeset/config.json`：定义 JS/TS workspace 的版本计算策略、基础分支、内部依赖联动方式与 changelog 生成方式，是包级发布线的策略入口。
- `.changeset/README.md`：面向贡献者说明何时必须编写 changeset、如何生成发布计划，以及“包版本 / 协议版本 / 数据库 schema 版本”三条版本线如何分离。
- `biome.json`：统一前端格式化与 lint 规则，并显式限制扫描范围到 `apps/*`、`packages/*` 与关键根配置文件；当前还显式忽略 `apps/**/dist/**/*`、`apps/**/src-tauri/gen/**/*` 与 `apps/**/src-tauri/target/**/*`，避免 Tauri 生成物污染源码质量门禁。
- `lefthook.yml`：定义提交前检查链路（`pre-commit`），把前端规范检查、Rust 格式检查与 Clippy 串联为同一入口，收敛“提交前”质量门禁。
- `.gitignore`：屏蔽 `node_modules/`、`target/`、`dist/` 与调试日志等构建产物，保证仓库关注点聚焦源码、配置与文档。
- `.github/workflows/ci.yml`：基础 CI 入口，按作业拆分文档链接检查与工作区校验，覆盖依赖安装、前端规范、共享配置测试、Rust 编译/静态检查/测试，确保在干净环境可复现。
- `Cargo.toml`：Rust 根工作区入口，负责声明 `crates/*` 为 workspace members，并统一 edition、version、license、publish 等共享元数据。
- `Cargo.lock`：记录当前 Rust 工作区的锁定解析结果；随着服务端和桌面 Rust 能力落地，应作为可复现构建的一部分保留。
- `scripts/check-doc-links.mjs`：文档本地链接校验脚本，跨平台校验 Markdown 内部路径，作为 CI 与本地 `verify` 的统一检查实现，避免链接漂移进入主分支。
- `apps/desktop/package.json`：桌面端前端壳的包入口，当前负责声明 React/Vite/Tauri CLI、`@freelyrss/ui` 与 `@freelyrss/shared-types` 依赖，并暴露 `dev`、`build`、`preview`、`tauri` 四类脚本，是桌面壳前端入口、共享 UI 包、共享类型包与 Tauri CLI 的交汇点。
- `apps/desktop/CHANGELOG.md`：桌面端发布线的用户可见变更记录，避免桌面端变更混入其他应用或共享包的发布说明。
- `apps/desktop/index.html`：桌面端前端宿主文档，提供 Vite 挂载点并定义应用窗口标题入口。
- `apps/desktop/tsconfig.json`：桌面端 TypeScript 编译边界，当前覆盖 React 前端与 `vite.config.ts`，确保桌面壳类型检查在应用边界内闭合。
- `apps/desktop/vite.config.ts`：桌面端前端构建配置，固定 Tauri 开发端口、约束 HMR 行为并忽略 `src-tauri` 目录变化，避免桌面壳开发时前后端工具链相互误触发。
- `apps/desktop/src/main.tsx`：桌面端 React 引导入口，当前负责先加载 `@freelyrss/ui/theme.css`，再挂载 `App` 到前端宿主节点；它仍不掺入业务查询或本地状态逻辑。
- `apps/desktop/src/App.tsx`：阶段 2 Step 15 的桌面阅读器壳组合层，当前负责把来源上下文、文章队列与阅读面板组合成稳定三栏骨架，并在壳内只保留 `selectedSourceId` 与 `selectedArticleId` 两类局部选择状态；它显式消费 `packages/shared-types` 的 DTO 与 `packages/ui` 的展示构件，但仍刻意不承担读取数据库、执行查询、管理路由或持久化阅读状态的职责。
- `apps/desktop/src/styles.css`：桌面壳本地样式层，当前负责标题区、壳级指标卡、三栏滚动容器、空状态、阅读面板排版与窄窗口重排等仅属于桌面壳组合层的布局规则，不承担主题 token 或基础控件样式定义。
- `apps/desktop/src/vite-env.d.ts`：Vite 客户端类型声明入口，为桌面壳前端提供 `vite/client` 类型边界。
- `apps/desktop/src-tauri/Cargo.toml`：桌面端专属 Rust 宿主 crate 清单，负责声明 Tauri 构建依赖、运行时依赖与本地 `[workspace]` 边界，避免应用壳误并入根共享 Rust workspace。
- `apps/desktop/src-tauri/build.rs`：Tauri 构建脚本入口，把窗口配置、能力清单、图标与前端产物元数据编译进宿主程序。
- `apps/desktop/src-tauri/tauri.conf.json`：桌面宿主总配置，定义 `beforeDevCommand` / `beforeBuildCommand`、`frontendDist`、窗口尺寸、应用标识、能力模型与图标清单，是 Tauri 壳与前端产物的装配面。
- `apps/desktop/src-tauri/.gitignore`：忽略 `src-tauri/gen/` 等由 Tauri 生成的中间产物，避免能力 schema 与生成文件混入源码提交面。
- `apps/desktop/src-tauri/capabilities/default.json`：桌面端主窗口的默认权限清单，当前只授予 `core:default`，把权限边界显式收敛到“最小可用壳”。
- `apps/desktop/src-tauri/icons/*`：桌面宿主的占位应用图标资源，当前只服务于壳级编译与打包校验，不承载品牌定稿含义。
- `apps/desktop/src-tauri/src/lib.rs`：桌面宿主的薄运行时入口，当前仅负责启动 `tauri::Builder` 并加载编译后的上下文，不承担共享领域逻辑。
- `apps/desktop/src-tauri/src/main.rs`：桌面宿主二进制入口，在 Windows release 模式下隐藏额外控制台窗口，并把运行控制权交给 `lib.rs` 中的壳层入口。
- `apps/web/package.json`：Web 端访问入口的包清单，后续承接远程阅读与搜索界面的前端依赖。
- `apps/web/CHANGELOG.md`：Web 端发布线的变更记录，后续用于区分远程访问入口的迭代说明。
- `apps/mobile/package.json`：移动端应用包清单，后续承接 React Native + Expo 工程配置。
- `apps/mobile/CHANGELOG.md`：移动端发布线的变更记录，后续用于独立跟踪阅读端与播客端迭代。
- `apps/sync-server/`：当前仅保留目录边界，尚未加入任何 workspace；等同步服务脚手架开始时，再作为独立 Rust 应用接入。
- `packages/ui/package.json`：共享 UI 包的清单文件，当前显式暴露源码入口与 `theme.css` 样式入口，并声明 React peer dependency 与本地 React 类型依赖，固定该包的分发与类型边界。
- `packages/ui/CHANGELOG.md`：共享 UI 包的发布说明，专门记录设计系统与基础组件层的对外变化。
- `packages/ui/src/index.ts`：共享 UI 包的统一导出面，集中暴露主题根、布局骨架、基础表面、按钮、输入框与列表组件，避免应用壳直接引用深层源码路径。
- `packages/ui/src/theme.css`：共享 UI 的主题 token 与基础样式入口，定义颜色、字体、边框、阴影、焦点态与响应式分栏规则，是桌面壳与后续其他应用壳共享视觉契约的核心文件。
- `packages/ui/src/lib/cx.ts`：共享 UI 的轻量类名拼接工具，避免在每个基础组件中重复实现样式类收敛逻辑。
- `packages/ui/src/components/theme-root.tsx`：共享主题根组件，负责挂载主题作用域 class，让应用壳可以显式选择何处启用 FreelyRSS 设计 token。
- `packages/ui/src/components/surface.tsx`：共享表面容器组件，收敛卡片/面板级边框、背景、圆角与紧凑模式样式。
- `packages/ui/src/components/button.tsx`：共享按钮组件，当前封装主按钮、次按钮、幽灵按钮与尺寸变体，不包含任何业务动作语义。
- `packages/ui/src/components/text-input.tsx`：共享文本输入组件，当前封装标签、输入框与提示文本结构，统一输入控件视觉与可读性边界。
- `packages/ui/src/components/list.tsx`：共享列表组件文件，当前提供 `ListSection` 与 `ListRow` 两种基础构件，用于承载来源列表、文章列表等行式展示场景，但不预先绑定任何数据模型。
- `packages/ui/src/components/split-layout.tsx`：共享分栏布局组件文件，当前提供 `SplitLayout` 与 `SplitPane`，把三栏阅读器实际正在使用的网格骨架固化为可复用展示层能力，同时把响应式重排责任限制在“展示骨架”而不是业务状态层。
- `packages/shared-types/package.json`：共享领域类型包的清单文件，当前显式暴露源码入口、`types` 入口与独立 `check` 脚本，并声明本地 TypeScript 依赖，固定该包的分发与校验边界。
- `packages/shared-types/CHANGELOG.md`：共享类型包的发布说明，用于跟踪 DTO、枚举与领域类型契约变化。
- `packages/shared-types/tsconfig.json`：共享类型包的 TypeScript 校验边界，确保该包可在不依赖任何应用壳的前提下独立完成严格类型检查。
- `packages/shared-types/src/index.ts`：共享类型包的统一导出面，集中暴露标识符、基础原语、状态枚举与各领域 DTO，避免应用壳深链引用具体文件。
- `packages/shared-types/src/ids.ts`：共享领域标识符别名定义，统一 `Feed`、`Folder`、`Article`、`Annotation`、`Rule`、`SmartFolder`、`AIArtifact` 与 `SyncEvent` 等实体 ID 的命名边界。
- `packages/shared-types/src/primitives.ts`：共享基础原语文件，定义 `Nullable`、ISO 时间字符串、URL、语言代码、缓存路径与 JSON 值等跨模块可复用类型。
- `packages/shared-types/src/enums.ts`：共享受控枚举集合，当前固化 feed 格式、folder kind、tag scope、附件类型、阅读状态、重要级别、批注类型与 AI Artifact kind 等状态语义。
- `packages/shared-types/src/organization.ts`：订阅组织与标签相关 DTO 文件，定义 `Folder`、`Tag`、`FeedTag` 与 `ArticleTag` 的共享类型边界。
- `packages/shared-types/src/feed.ts`：订阅源相关 DTO 文件，定义 `Feed` 基础模型、订阅树摘要模型与树节点联合类型，供桌面壳后续订阅树与源管理界面消费。
- `packages/shared-types/src/article.ts`：文章阅读相关 DTO 文件，定义 `Article`、`Attachment`、`UserState`、`Annotation` 以及文章列表项与文章详情模型，供后续中栏和右栏阅读界面复用。
- `packages/shared-types/src/automation.ts`：规则、智能文件夹、AI Artifact 与同步事件相关 DTO 文件，当前以 `JsonValue` 形式保留查询条件、动作定义与同步 payload 边界，为后续 `shared-query` 和同步协议落地预留接口。
- `packages/shared-query/package.json`：共享查询表达式包的清单文件，当前显式暴露源码入口、独立 `check` / `test` 脚本与本地 TypeScript 依赖，固定该包的分发和验证边界。
- `packages/shared-query/CHANGELOG.md`：共享查询表达式包的发布说明，用于跟踪 AST、解析器与序列化协议变化。
- `packages/shared-query/tsconfig.json`：共享查询表达式包的 TypeScript 校验边界，当前采用 `NodeNext` 与 `allowImportingTsExtensions`，让源码既能被工作区类型检查，也能被 Node 原生测试直接消费。
- `packages/shared-query/src/index.ts`：共享查询表达式包的统一导出面，集中暴露 AST、构造器、文本解析、校验、序列化与 SQL 计划接口，避免调用方深链引用实现文件。
- `packages/shared-query/src/json.ts`：共享查询表达式包内部的 JSON 原语定义，专门服务查询 AST 的序列化与反序列化边界，不反向依赖 `shared-types`。
- `packages/shared-query/src/ast.ts`：查询表达式的核心语法树定义，固化查询节点、字段集合、操作符集合、排序定义与版本号，是规则、搜索和智能文件夹共享的结构性契约。
- `packages/shared-query/src/errors.ts`：查询校验错误模型，提供带路径与错误码的结构化问题输出，避免后续调用方只能拿到模糊字符串异常。
- `packages/shared-query/src/schema.ts`：查询字段 schema 注册表，集中维护字段别名、默认操作符、合法操作符与枚举取值，防止构造器、解析器和执行计划层各自维护一套字段知识。
- `packages/shared-query/src/normalize.ts`：查询归一化模块，负责拍平同类分组、消解双重取反与复制可变值，确保不同输入路径最终收敛到稳定 AST 形状。
- `packages/shared-query/src/validate.ts`：查询校验器，负责拒绝非法字段、非法操作符、空列表和值类型不匹配的谓词，把错误前移到共享查询边界。
- `packages/shared-query/src/builder.ts`：可视化构造器侧的 AST 生成入口，提供显式的谓词、文本项、分组与取反构造函数，用于把 UI 侧结构化条件稳定映射到 AST。
- `packages/shared-query/src/text-query.ts`：文本查询解析入口，当前支持字段前缀、`is:` / `has:` 语义、`after:` / `before:` 时间条件、排序声明以及 `AND` / `OR` / `NOT` 的最小文本语法，并统一落到 AST。
- `packages/shared-query/src/serialize.ts`：查询 AST 的 JSON 序列化与反序列化入口，负责在持久化与传输边界保持查询定义的结构稳定，同时复用共享校验器防止无效查询入库。
- `packages/shared-query/src/sql-plan.ts`：SQL 查询计划编译器，当前把 AST 收敛为 SQLite 导向的 `where` / `join` / `order by` 计划，明确 `Feed`、`UserState`、`Attachment`、`Tag` 等实体参与查询时的装配方式，但仍故意停留在“计划”而非“执行器”层。
- `packages/shared-query/test/query.test.mjs`：共享查询包的 Node 原生验收测试，当前覆盖可视化构造器与文本查询生成等价 AST、序列化往返、SQL 计划编译和非法谓词校验，是阶段 2 Step 14 的主要自动化验收文件。
- `packages/shared-config/package.json`：共享配置模型包的清单文件，当前负责暴露 `shared-config` 的公共入口与独立测试脚本，固定该包的分发边界。
- `packages/shared-config/CHANGELOG.md`：共享配置包的发布说明，用于记录配置模型、默认策略与环境边界的外部变化。
- `packages/shared-config/README.md`：共享配置包的使用说明，明确环境变量命名、来源优先级、配置覆盖范围与校验规则，作为桌面端和测试环境接线前的契约文档。
- `packages/shared-config/src/index.js`：共享配置包的统一入口，负责组合默认值、标准代理环境变量、FreelyRSS 环境变量与显式覆写，并输出最终配置对象。
- `packages/shared-config/src/defaults.js`：配置域常量与默认值工厂，集中定义运行环境、运行目标、日志级别、同步模式、AI provider 和实验开关的合法集合与默认策略。
- `packages/shared-config/src/env.js`：环境变量解析层，把 `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 与 `FREELYRSS_*` 变量映射为结构化配置片段，并在解析阶段提供基础类型校验。
- `packages/shared-config/src/merge.js`：配置分层合并实现，负责把默认值、环境变量层与调用方覆写收敛到同一配置对象，避免应用侧各自实现不一致的 merge 逻辑。
- `packages/shared-config/src/validate.js`：共享配置校验器，负责在真正接入桌面壳之前就强制同步、AI 与代理相关的必填条件和枚举边界，阻止静默容错进入运行期。
- `packages/shared-config/src/errors.js`：共享配置错误模型，提供带路径信息的 `ConfigValidationError`，让调用方能直接定位失败字段，而不是只看到模糊异常。
- `packages/shared-config/src/config.test.js`：共享配置的 Node 原生测试，覆盖桌面开发环境、桌面测试环境和缺失必填配置时的失败路径，用作阶段 1 Step 10 的自动化验收。
- `crates/*/Cargo.toml`：各 Rust crate 的边界声明文件，用于把抓取、搜索、规则、同步等能力维持在独立模块，而不是回退成单体 Rust 包。
- `crates/*/src/lib.rs`：各 Rust crate 的最小库入口，当前只承担可编译占位职责；后续应逐步承接真实领域逻辑与测试。

当前架构见解：

- Step 6 的关键价值不是“把包管理器跑起来”，而是把 JS/TS 与 Rust 两条工具链的边界固定下来，这决定了后续共享代码如何演进。
- Step 7 的关键价值不是“引入更多工具”，而是把规范执行入口收敛为 `package.json` 脚本与 `lefthook` 单链路，减少团队成员各自运行命令导致的漂移。
- Step 8 的关键价值不是“把版本号加上去”，而是把“JS/TS 包发布线”“同步协议版本”“数据库 schema 版本”拆成三条独立演进轴，避免后续把客户端发版、协议兼容与迁移节奏绑定在一起。
- `apps/*` 与 `packages/*` 的拆分让前端壳和共享能力分离，避免在桌面端壳内沉积本应被 Web 或移动端复用的逻辑。
- `crates/*` 先以多个空库接入 workspace，看似简单，但它提前锁定了“多引擎模块”而非“单个核心 crate”的演进方向，能显著降低后续拆分成本。
- `apps/sync-server` 暂未加入任何工作区是刻意选择，因为当前阶段只需要固化客户端与共享引擎骨架，不应为了“形式完整”提前引入服务端脚手架复杂度。
- 将 `Biome` 扫描范围限制在应用与共享包，是当前阶段的刻意边界控制：先规范代码骨架，再在后续阶段按需纳入更多目录，避免首轮规范化对文档资产造成噪音。
- 先为每个 JS/TS 包生成独立 `CHANGELOG.md`，可以把变更记录继续保持在模块边界内，而不是退化为仓库级“大杂烩”发布说明；这与 FreelyRSS 的多应用壳、多共享包架构是一致的。
- Step 9 的关键价值不是“把 CI 文件补齐”，而是把“文档可达性校验”和“前端/Rust 工具链校验”显式拆成独立作业，使失败定位直接映射到质量门禁类别。
- 文档链接检查采用仓库内脚本并接入 `verify`，让本地开发与 CI 使用同一校验逻辑，降低“本地通过但 CI 失败”的环境差异风险。
- Step 10 的关键价值不是“多加几项环境变量”，而是把运行环境、代理、同步、AI 和实验开关统一收敛到 `packages/shared-config`，防止桌面端、Web 端和测试环境出现三套不兼容的配置口径。
- 先吸收标准代理环境变量，再叠加 `FREELYRSS_*` 专用变量，最后允许显式覆写，是当前最稳妥的优先级设计：既兼容通用开发环境，又保证应用侧可以精确覆盖代理与服务端配置。
- 在共享配置层显式拒绝“启用同步但缺少 endpoint”“启用 AI 但缺少 provider 凭证”这类状态，能把错误从运行期网络失败前移到启动期配置校验，减少后续桌面壳接线时的隐性故障。
- 将配置文档与 Node 原生测试一起放在 `shared-config` 包边界内，意味着后续任何应用壳接入该包时，都必须复用同一份配置契约，而不是在各自壳内复制一套解析逻辑。
- Step 11 的关键价值不是“把 Tauri 跑起来”，而是把“桌面宿主层”和“前端应用层”真正分开：`src-tauri` 只负责窗口、能力与运行时装配，React/Vite 继续负责前端界面演进。
- 将 `apps/desktop/src-tauri` 维持为应用专属 crate、而不是塞进根 `Cargo workspace`，锁定了“共享引擎 crates”与“应用宿主 crate”两条不同演进路径，避免未来把桌面端运行时约束泄漏到共享 Rust 模块。
- `tauri.conf.json` 中的 `beforeDevCommand` / `beforeBuildCommand` 与 `frontendDist` 把前端产物定义为宿主层的显式输入，这能让后续 `packages/ui`、共享类型和三栏布局在不触碰 Rust 壳层的前提下独立演进。
- 当前 `App.tsx` 与 `styles.css` 保持壳级占位而不提前复用 `packages/ui`，是刻意的阶段控制：先验证桌面入口链路，再在 Step 12 单独收敛共享设计系统边界，避免“为了有界面”反向污染共享包。
- 在 `biome.json` 与 `src-tauri/.gitignore` 中显式忽略 `dist/`、`gen/` 与 `target/`，实质上是在架构层把“源码边界”和“生成物边界”分开；否则 Tauri 的生成文件会持续干扰仓库质量门禁与代码审阅噪音。
- Step 12 的关键价值不是“把界面做得更像产品”，而是把“应用壳组合层”和“共享展示层”真正拆开：`packages/ui` 开始承接 token、布局骨架与基础控件，桌面壳只负责组合演示。
- `@freelyrss/ui/theme.css` 作为显式样式入口、`src/index.ts` 作为显式组件入口，意味着后续 Web 端和移动端 Web 预览若要复用设计系统，可以沿用同一条包消费路径，而不是复制 CSS 或深链源码文件。
- `packages/ui` 在 pnpm workspace 下需要单独声明 React 类型依赖，说明“共享包能被桌面壳编译”并不等于“共享包已经具备独立类型边界”；这条经验应被沿用到 `shared-types` 与 `shared-query` 的后续落地中。
- 将桌面壳本地 `styles.css` 收敛为页面编排层，而把 token、焦点态、按钮和列表视觉移入共享包，证明 FreelyRSS 可以在不引入重型 UI 库的前提下建立自己的设计系统边界。
- Step 13 的关键价值不是“多写几组 TypeScript interface”，而是把桌面壳当前真实消费的数据形状从 `App.tsx` 的局部对象字面量中抽离出来，提前建立跨应用壳共享的数据契约。
- 将 `shared-types` 拆分为 `ids`、`primitives`、`enums` 与多个领域 DTO 文件，意味着后续桌面端、Web 端、移动端乃至 Rust 边界代码生成都可以只依赖需要的模块，而不是绑定到单一庞大类型文件。
- 在 `shared-types` 中把 `Rule.conditions`、`SmartFolder.queryDefinition`、`AIArtifact.result` 与 `SyncEvent.payload` 保持为 `JsonValue` 占位，是刻意的阶段控制：先把 schema 槽位固定，再由阶段 2 Step 14 的 `shared-query` 去收敛真正的 AST 与序列化模型，避免类型包抢跑业务解释器设计。
- 将 `test:types` 纳入根级 `verify` 之后，共享类型契约不再依赖“恰好被桌面壳编译到”才暴露问题，而是拥有与共享配置、Rust 工作区同等级的独立质量门禁。
- Step 14 的关键价值不是“提前把搜索语法做复杂”，而是把规则、搜索和智能文件夹共享的查询语义从应用壳和未来执行层中抽离出来，先固化统一 AST 与输入归一化边界。
- `shared-query` 同时提供“可视化构造器 -> AST”和“文本查询 -> AST”两条入口，意味着后续 UI 可以自由切换交互方式，而不必维护两套彼此漂移的筛选语义。
- 将字段别名、默认操作符、合法操作符和枚举值集中收敛到 `src/schema.ts`，避免解析器、校验器和 SQL 计划层分别复制一份字段知识，降低后续字段扩展时的漏改风险。
- `src/normalize.ts` 的存在说明 FreelyRSS 当前并不把“用户输入长什么样”直接等同于“持久化 AST 长什么样”；规范化层先把输入收敛，再交给序列化、规则引擎和未来数据库层消费。
- `src/sql-plan.ts` 明确只输出轻量查询计划而不直接访问数据库，是当前阶段的重要边界控制：先固定查询语义和表关联策略，再在阶段 3 的 SQLite 落地中决定真正的执行器、索引利用和 FTS 结合方式。
- 将 `test:query` 纳入根级 `verify` 后，共享查询包不再依赖未来桌面壳偶然消费或 Rust 引擎接线时才暴露问题，而是成为与 `shared-types`、`shared-config` 同级的独立质量门禁。
- Step 15 的关键价值不是“把阅读器做得更像成品”，而是把桌面壳的组合边界真正固定下来：左栏只表达来源上下文，中栏只表达当前队列与选中项，右栏只表达阅读上下文，三者都不越界承担真实数据访问职责。
- `apps/desktop/src/App.tsx` 现在只保留两类局部选择状态，说明 FreelyRSS 可以先验证三栏骨架和交互回退，再在 Step 16 单独引入导航与视图状态来源，而不是把状态框架、查询框架和数据访问层提前揉成一个组件。
- `apps/desktop/src/styles.css` 现在承接的是“壳级响应式行为”而不是“共享视觉系统”：滚动容器、空状态和窄窗口下右栏下沉规则留在应用壳，主题 token、基础表面和基础控件仍留在 `packages/ui`，这条边界对后续 Web 壳复用非常关键。

## 14. 当前文档职责

当前仓库仍处在“文档先行 + 工程骨架初始化”阶段，因此每个文档都承担明确职责：

- `memory-bank/RSS-design-document.md`：产品边界、功能范围、数据模型和阶段愿景的源文档。
- `memory-bank/tech-stack.md`：技术选型、工程分层和依赖方向的源文档。
- `memory-bank/implementation-plan.md`：按步骤推进实施的执行清单，当前编码工作应严格按此顺序落地。
- `memory-bank/progress.md`：跨开发者交接用的进度记录，记录已完成步骤、验证结果、阻塞与下一步。
- `memory-bank/architecture.md`：把产品设计、技术选型、数据库 schema、仓库骨架和模块边界收敛成统一的实现基线。

当前架构洞察：

- 阶段 1 已经可以开始以“多应用壳 + 多共享包 + 多 Rust 引擎”的方式演进，避免早期形成单体应用结构。
- 目录骨架先行是必要步骤，因为后续 `pnpm workspace`、`Cargo workspace`、CI、changesets 和数据库迁移都会依赖这套边界。
- 即使还未开始建表，数据库 schema 也必须先固化在架构文档中，这样后续迁移、领域模型和共享类型才能围绕同一命名体系演进。
- 当前阶段已经完成 JS/TS 工作区的版本治理基线，但同步协议号与数据库 schema 号仍应留在各自的实现边界中演进，不能被 npm 包版本替代。
