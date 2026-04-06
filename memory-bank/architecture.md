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

本节固化桌面端本地数据库的核心实体与字段命名，作为阶段 3 建表与迁移的直接依据。当前字段名与 [RSS-design-document.md](F:\Codes\FreelyRSS\memory-bank\RSS-design-document.md) 保持一致。

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

- `apps/desktop`：桌面端主应用，未来承载 Tauri 壳、React UI 和本地能力入口。
- `apps/web`：Web 端远程访问入口，后续只消费同步后的远程数据。
- `apps/mobile`：移动端阅读优先应用，后续承接同步阅读、搜索、笔记与播客消费。
- `apps/sync-server`：远程同步服务，后续承接账号、设备、事件交换和对象存储清单。

### 13.3 当前共享包职责

- `packages/ui`：共享 UI 基础件与主题变量，不承载业务逻辑。
- `packages/shared-types`：共享领域类型、DTO 和状态枚举。
- `packages/shared-query`：统一查询表达式 AST、解析、校验和序列化。
- `packages/shared-config`：共享配置模型、环境变量边界与默认策略。

### 13.4 当前 Rust crate 职责

- `crates/core-domain`：核心实体、值对象、状态枚举与数据库映射边界。
- `crates/feed-engine`：抓取、解析、标准化与增量更新。
- `crates/content-pipeline`：正文提取、HTML 清洗、缩略图与附件识别。
- `crates/rule-engine`：统一查询表达式命中判断与动作执行。
- `crates/search-engine`：SQLite FTS5 搜索、过滤与高亮片段组装。
- `crates/sync-engine`：事件日志、同步批次、重放与冲突合并。
- `crates/integration-engine`：Webhook、REST 连接器、桥接服务与导出适配层。

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
