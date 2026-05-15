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

除业务实体外，阶段 3 Step 18 已先落地数据库系统表与迁移策略边界。后续所有业务表、索引和 FTS 结构都必须通过同一条迁移链路进入本地库，而不是由宿主层或测试脚本直接“顺手建表”。

### 12.0 系统表

#### 12.0.1 `schema_migrations`

- `version`
- `name`
- `applied_at`

约束建议：

- `version` 为主键，且必须与嵌入式迁移序列一一对应。
- `name` 必须与同版本嵌入式迁移名称完全一致，用于阻止迁移历史漂移。
- `applied_at` 记录迁移提交时间，只反映迁移执行事实，不承载任何业务状态。

#### 12.0.2 `app_metadata`

- `key`
- `value`
- `updated_at`

约束建议：

- `key` 为主键，只允许保存数据库 bootstrap 级元数据。
- `value` 采用字符串边界，避免在系统元数据层提前引入与业务表耦合的结构化 schema。
- `app_metadata` 不用于替代 `Feed`、`Article` 等业务实体表，只服务于迁移框架和数据库初始化边界。

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
- `last_error_kind`
- `last_error_message`
- `last_error_at`
- `consecutive_failures`

约束建议：

- `id` 为主键。
- `feed_url` 全局唯一。
- `folder_id` 指向 `Folder.id`，允许为空。
- `health_status` 采用受控枚举值。
- `last_error_kind` 为空时表示最近一次检查未留下失败诊断；非空时必须来自受控错误枚举。
- `consecutive_failures` 必须大于等于 0，并且在成功检查后归零。

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

### 12.12 RuleAudit

- `id`
- `rule_id`
- `article_id`
- `match_result`
- `input_snapshot`
- `planned_commands`
- `applied_effects`
- `created_at`

约束建议：

- `id` 为主键。
- `rule_id` 外键引用 `Rule.id`。
- `article_id` 外键引用 `Article.id`。
- `match_result` 采用受控枚举值，明确区分 `matched` 与 `not-matched`。
- `input_snapshot` 保存规则评估时的文章 / 来源 / 用户状态 / 标签 / 附件快照，避免后续 UI 或持久化层重新拼装审计上下文。
- `planned_commands` 保存规则引擎已经生成的显式命令计划，而不是要求 SQLite 写入层重新解释 `Rule.actions`。
- `applied_effects` 允许后续动作写入层把真实落库事实回填到同一审计记录中，而不是在别处另建一套历史模型。

### 12.13 AIArtifact

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

### 12.14 SyncEvent

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

#### 12.14.1 SyncEvent 同步字段边界

Step 60 已将 `SyncEvent` 限定为用户可携带状态、订阅组织和自动化配置的事件日志，不承载设备运行状态、抓取诊断、搜索索引或 UI 任务状态。

通过 `SyncEvent` 同步的实体与字段：

- `Feed`：`title`、`site_url`、`feed_url`、`format`、`icon`、`folder_id`、`custom_name`、`sort_order`、`update_interval`、`cache_policy`
- `Folder`：`name`、`parent_id`、`sort_order`、`kind`
- `Tag`：`name`、`scope`、`color`
- `FeedTag`：`feed_id`、`tag_id`
- `ArticleTag`：`article_id`、`tag_id`
- `UserState`：`read_state`、`starred`、`liked`、`importance`、`read_later`、`reading_progress`、`last_opened_at`
- `Annotation`：`type`、`selected_text`、`anchor`、`note`、`color`、`created_at`
- `Rule`：`name`、`enabled`、`priority`、`conditions`、`actions`、`scope`
- `SmartFolder`：`name`、`query_definition`、`sort_definition`

只保留本地、不进入 `SyncEvent` 的字段与数据：

- `Feed.health_status`、`last_checked_at`、`last_success_at`、`etag`、`last_modified`、`last_error_kind`、`last_error_message`、`last_error_at`、`consecutive_failures`，因为它们描述本设备最近一次抓取事实。
- `Article.fetched_at`，因为它描述本地库接收文章的时间，不是跨设备用户状态。
- `Attachment.local_cache_path`，因为它是设备文件系统路径。
- `RuleAudit.input_snapshot`、`planned_commands`、`applied_effects`、`created_at`，因为规则审计先作为本地可观测历史保留。
- `ArticleSearch`、`ArticleSearchSource` 和所有 FTS 投影，因为搜索索引由本地数据库重建。
- Step 59 的 task status、React Query mutation state、retry label 和 recovery text，因为它们是当前 shell 的运行时观察结果。

按需懒加载、不内联进普通 `SyncEvent.payload` 的内容：

- `Article.content_raw`
- `Article.content_extracted`
- 附件二进制内容及其大对象元数据

这些内容后续应通过 `EncryptedBlob` 引用、密文对象清单和按需下载进入本地缓存，而不是把正文或附件字节塞进事件 payload。

#### 12.14.2 服务端最小实体

同步服务端只保存支持账号、设备、事件交换和密文对象索引所需的最小集合，不复制客户端完整业务 schema。

服务端最小实体：

- `User`：账号主体，只保存身份、创建时间、禁用时间和必要的不可逆标识摘要，不保存明文文章、笔记或阅读历史。
- `Device`：用户设备，保存 `device_id`、`user_id`、显示名、公钥、注册时间和最近活跃时间，用于事件归属、游标和加密边界。
- `SyncEvent`：设备上传的实体级事件或操作日志，保存事件 id、实体类型、实体 id、变更类型、密文或最小 payload 引用、设备 id 和创建时间。
- `EncryptedBlob`：密文对象索引，保存 blob id、用户 id、类型、对象存储 key、大小、校验和、创建时间和可选关联事件 id；对象内容仍在 S3 兼容存储或 WebDAV/Nextcloud 对象存储中。
- `UserSettings`：用户级同步配置与协议偏好，保存用户 id、设置 JSON、版本和更新时间；不得扩展为客户端业务表镜像。

服务端明确不拥有 `Article`、`Feed`、`Annotation`、`UserState` 等业务读取主表。服务端可以验证、交换和存放密文事件，但业务查询、全文搜索和本地阅读仍由客户端本地库承载。

### 12.14 全文搜索结构

#### 12.14.1 `ArticleSearchSource`

- `article_rowid`
- `article_id`
- `feed_id`
- `title`
- `summary`
- `content`
- `author`
- `feed_title`
- `tag_names`

约束建议：

- `ArticleSearchSource` 是只读投影视图，不承载业务写入。
- `content` 优先消费 `Article.content_extracted`，缺失时回退到 `Article.content_raw`。
- `feed_title` 优先消费 `Feed.custom_name`，缺失时回退到 `Feed.title`。
- `tag_names` 只聚合 `Tag.scope = 'article'` 的标签名，用于搜索索引拼装而不是业务事实存储。

#### 12.14.2 `ArticleSearch`

- `article_id`
- `feed_id`
- `title`
- `summary`
- `content`
- `author`
- `feed_title`
- `tag_names`

约束建议：

- `ArticleSearch` 使用 SQLite FTS5 虚拟表承载全文索引，不替代 `Article` 业务表。
- `article_id` 与 `feed_id` 作为未分词元数据保留，供后续结果映射与过滤组合使用。
- FTS 行的生命周期必须跟随 `Article.rowid` 收敛，避免宿主层自行维护第二套搜索主键。
- 索引更新由数据库触发器负责，不允许桌面宿主层或前端壳绕过迁移层直接补写搜索表。

### 12.15 关系与索引基线

- `Folder` 通过 `parent_id` 形成树结构。
- `Feed` 通过 `folder_id` 归属到订阅树节点。
- `FeedTag`、`ArticleTag` 作为多对多关系表，不承载额外业务状态。
- `Article` 是正文、搜索、状态、批注、附件的中心实体。
- `UserState` 与 `Article` 保持一对一。
- `Annotation`、`Attachment`、`AIArtifact` 与 `Article` 保持一对多。
- `RuleAudit` 同时与 `Rule`、`Article` 保持一对多，是规则命中历史、计划命令与后续 applied effects 的统一审计载体。
- `SyncEvent` 是同步日志，不是业务读取主表。
- 阶段 3 应优先为 `feed_url`、`feed_id + source_guid`、`published_at`、`fetched_at`、状态字段和关联表外键补齐索引。
- 阶段 3 Step 20 已通过数据库 `v3` 迁移落地唯一索引与查询索引基线：`Feed.feed_url`、`Tag.scope + name`、`Article.feed_id + source_guid`、`Article.published_at` / `Article.fetched_at`、`Feed.health_status`、`UserState` 状态字段、`FeedTag` / `ArticleTag` 反向关联、`Attachment.article_id`、`Annotation.article_id`、`AIArtifact.article_id` 以及 `SyncEvent` 的实体/设备查询路径都已拥有显式索引入口。
- 阶段 3 Step 21 已通过数据库 `v4` 迁移补齐全文搜索基线：`ArticleSearchSource` 负责搜索文档投影，`ArticleSearch` 负责 FTS5 索引，`Article` / `Feed` / `ArticleTag` / `Tag` 的变更通过数据库触发器同步更新全文索引。
- 阶段 4 Step 32 已通过数据库 `v6` 迁移补齐源健康诊断基线：`Feed.last_error_kind` / `last_error_message` / `last_error_at` / `consecutive_failures` 正式进入 schema，并为“按错误类型回看失败源”和“按连续失败数筛查异常源”提供独立索引入口。
- 阶段 5 Step 50 已通过数据库 `v7` 迁移补齐规则审计基线：`RuleAudit.rule_id + match_result + created_at` 与 `RuleAudit.article_id + created_at` 已拥有独立索引入口，用于按规则回看命中历史和按文章回看自动化轨迹。
- 当前约束策略是“基础语义进表定义、唯一性与查询优化走独立迁移、全文搜索走独立索引迁移、健康诊断走独立演进迁移、规则审计走独立附加迁移”：主键、外键、受控枚举、布尔位和区间约束保留在 `v2` 建表迁移中，唯一索引与查询索引收敛到 `v3`，FTS5 结构、投影视图与同步触发器收敛到 `v4`，文章去重辅助索引收敛到 `v5`，健康诊断字段与索引收敛到 `v6`，规则审计表与历史查询索引收敛到 `v7`，避免后续 SQLite 演进为了补运维与可观测性能力而回退到整表重建。

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
- `crates/sync-engine`：同步实体、字段边界、事件日志、同步批次、重放与冲突合并；当前 Step 60 已先落地纯分类规则，后续再接本地事件写入和远程交换。
- `crates/integration-engine`：Webhook、REST 连接器、桥接服务与导出适配层。

### 13.5 当前工作区清单与文件职责

当前阶段已经从“纯目录占位”推进到“可被工具链识别的工作区骨架 + 可构建的桌面端应用壳 + 可被桌面壳消费的共享 UI / 共享类型 / 共享查询包 + 已落地的三栏阅读器骨架 + 已收敛到 `v4` 的本地 SQLite schema 基线”。这些文件的职责应明确，避免后续把配置、样式、组件、视图状态、数据库迁移与类型契约堆进单一根文件或单一应用。

- `package.json`：JS/TS 根工作区入口，声明仓库为私有 workspace、固定 `pnpm` 版本，并集中定义 `Biome`、共享配置测试、共享类型检查、共享查询测试、桌面壳测试、Rust 检查、文档链接检查与 `verify` 等统一脚本；当前还补充了 `desktop:dev`、`desktop:build`、`desktop:tauri:dev`、`desktop:tauri:build` 与 `test:desktop`，避免桌面运行与验收命令继续散落到应用目录内。
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
- `apps/desktop/package.json`：桌面端前端壳的包入口，当前负责声明 React/Vite/Tauri CLI、`@freelyrss/ui`、`@freelyrss/shared-types`、`@freelyrss/shared-query`、TanStack Router、TanStack Query、Zustand 与 Vitest/Testing Library 依赖，并暴露 `dev`、`test`、`build`、`preview`、`tauri` 五类脚本，是桌面壳前端入口、共享包消费层与桌面端自动化验收入口的交汇点。
- `apps/desktop/CHANGELOG.md`：桌面端发布线的用户可见变更记录，避免桌面端变更混入其他应用或共享包的发布说明。
- `apps/desktop/index.html`：桌面端前端宿主文档，提供 Vite 挂载点并定义应用窗口标题入口。
- `apps/desktop/tsconfig.json`：桌面端 TypeScript 编译边界，当前覆盖 React 前端源码与 `vite.config.ts`，确保应用层、功能层与测试构建配置都在桌面壳边界内完成类型校验。
- `apps/desktop/vite.config.ts`：桌面端前端构建配置，固定 Tauri 开发端口、约束 HMR 行为并忽略 `src-tauri` 目录变化；当前还接入 `jsdom` 测试环境配置，使桌面壳状态框架既能被构建也能被 Vitest 验收。
- `apps/desktop/src/main.tsx`：桌面端 React 引导入口，当前负责先加载 `@freelyrss/ui/theme.css`，再挂载 `App` 到前端宿主节点；它仍不掺入业务查询或本地状态逻辑。
- `apps/desktop/src/App.tsx`：桌面端应用装配入口，当前负责读取桌面壳局部主题状态，并把 `ThemeRoot`、`QueryClientProvider` 与 `RouterProvider` 组合起来；它不承载三栏业务组合，只承担“主题层”“异步数据层”“导航层”的基础装配。
- `apps/desktop/src/app/query-client.ts`：桌面端查询客户端工厂，集中创建 TanStack Query `QueryClient`，当前把 mock 数据边界配置为“无重试、无窗口焦点回刷、长生命周期缓存”，为后续真实数据访问层预留稳定装配面。
- `apps/desktop/src/app/router.tsx`：桌面端路由树定义文件，当前负责注册根路由与阅读器首页路由，并把 `reader-shell` 的搜索参数校验接入 TanStack Router，固定“当前来源/当前文章”由路由而不是组件本地状态承载。
- `apps/desktop/src/features/reader-shell/types.ts`：阅读器壳功能层的局部契约文件，定义导航入口、来源节点、路由搜索参数、局部视图过滤条件、主题 tone 与组合后视图摘要类型，避免把桌面壳专属中间状态污染共享 DTO。
- `apps/desktop/src/features/reader-shell/accessibility.ts`：阅读器壳的无障碍元数据中心，集中维护地标 id、全局快捷键映射与“当前事件目标是否可编辑”的判定逻辑，确保快捷键、跳转链接、组件命名与测试用例共享同一事实来源。
- `apps/desktop/src/features/reader-shell/state.ts`：阅读器壳的 Zustand 本地视图状态源，当前承载 `searchText`、`statusFilter`、`sortMode`、`themeTone` 与测试用 reset 能力，明确与路由导航态分层，并把高对比模式保持在壳级 UI 状态而不是业务数据层。
- `apps/desktop/src/features/reader-shell/mock-data.ts`：阅读器壳的异步 mock 数据边界，当前负责提供来源树、文章队列、文章详情、导航入口与统计摘要样本，用于在未接入数据库前验证组合层与状态框架。
- `apps/desktop/src/features/reader-shell/selectors.ts`：阅读器壳选择器与状态收敛层，负责把 route state、store state 与 mock 数据组合为“可见文章队列”“当前来源”“当前选中文章”“视图过滤 JSON 预览”等派生结果，并在这里集中处理空队列回退与失效文章修正。
- `apps/desktop/src/features/reader-shell/components/navigation-strip.tsx`：顶部导航条组件，负责把主导航入口渲染为可聚焦的命名导航地标，并通过统一回调切换路由来源，是左栏来源树之外的第二个导航入口，同时承接 `Alt+1` 的焦点目标。
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`：左栏来源面板组件，负责渲染来源分组、文件夹/订阅源节点与壳级来源动作按钮，同时暴露稳定的“Sources”地标名称与 `Alt+2` 聚焦入口；它只消费来源上下文，不触碰文章队列过滤逻辑。
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`：中栏文章队列组件，负责承载局部搜索、状态过滤、排序切换、共享查询 JSON 预览与文章列表显示，并把区域名称稳定为“Article queue”，避免把动态来源标题误当成地标名。
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`：右栏阅读面板组件，负责显示当前选中文章详情、状态摘要、标签/批注/附件占位与空阅读态，并把区域名称稳定为“Reading panel”，把当前文章标题保留在区域内部上下文而非 landmark 名称上。
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`：阅读器首页路由组件，负责把 TanStack Router、TanStack Query、Zustand、快捷键注册、跳转链接、主题切换与三栏展示组件真正装配起来，并承担搜索参数校验、空来源回退和选中文章一致性修正，是阶段 2 Step 16 / 17 组合边界的汇聚点。
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`：桌面壳回归测试文件，当前通过 Vitest + Testing Library 同时验证“进入空来源路由时回收失效文章引用”与“键盘快捷键可聚焦命名区域并切换高对比主题”两类壳级验收场景。
- `apps/desktop/src/styles.css`：桌面壳本地样式层，当前负责标题区、壳级指标卡、顶部导航条、skip links、快捷键说明卡、区域聚焦轮廓、视图状态 JSON 预览、三栏滚动容器、空状态、阅读面板排版与窄窗口重排等仅属于桌面壳组合层的布局规则，不承担主题 token 或基础控件样式定义。
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
- `packages/ui/src/theme.css`：共享 UI 的主题 token 与基础样式入口，定义颜色、字体、边框、阴影、焦点态、响应式分栏规则与高对比主题变量，是桌面壳与后续其他应用壳共享视觉契约的核心文件。
- `packages/ui/src/lib/cx.ts`：共享 UI 的轻量类名拼接工具，避免在每个基础组件中重复实现样式类收敛逻辑。
- `packages/ui/src/components/theme-root.tsx`：共享主题根组件，负责挂载主题作用域 class，并允许应用壳在 `midnight` 与 `high-contrast` 主题之间切换，让主题选择保持在统一 token 边界上。
- `packages/ui/src/components/surface.tsx`：共享表面容器组件，收敛卡片/面板级边框、背景、圆角与紧凑模式样式。
- `packages/ui/src/components/button.tsx`：共享按钮组件，当前封装主按钮、次按钮、幽灵按钮与尺寸变体，不包含任何业务动作语义。
- `packages/ui/src/components/text-input.tsx`：共享文本输入组件，当前封装标签、输入框与提示文本结构，统一输入控件视觉与可读性边界。
- `packages/ui/src/components/list.tsx`：共享列表组件文件，当前提供 `ListSection` 与 `ListRow` 两种基础构件，用于承载来源列表、文章列表等行式展示场景，但不预先绑定任何数据模型。
- `packages/ui/src/components/split-layout.tsx`：共享分栏布局组件文件，当前提供 `SplitLayout` 与支持 ref 转发的 `SplitPane`，把三栏阅读器实际正在使用的网格骨架与区域聚焦挂载点固化为可复用展示层能力，同时把响应式重排责任限制在“展示骨架”而不是业务状态层。
- `packages/shared-types/package.json`：共享领域类型包的清单文件，当前显式暴露源码入口、`types` 入口与独立 `check` 脚本，并声明本地 TypeScript 依赖，固定该包的分发与校验边界。
- `packages/shared-types/CHANGELOG.md`：共享类型包的发布说明，用于跟踪 DTO、枚举与领域类型契约变化。
- `packages/shared-types/tsconfig.json`：共享类型包的 TypeScript 校验边界，确保该包可在不依赖任何应用壳的前提下独立完成严格类型检查。
- `packages/shared-types/src/index.ts`：共享类型包的统一导出面，集中暴露标识符、基础原语、状态枚举与各领域 DTO，避免应用壳深链引用具体文件。
- `packages/shared-types/src/ids.ts`：共享领域标识符别名定义，统一 `Feed`、`Folder`、`Article`、`Annotation`、`Rule`、`SmartFolder`、`AIArtifact`、`SyncEvent`、`User` 与 `EncryptedBlob` 等实体 ID 的命名边界。
- `packages/shared-types/src/primitives.ts`：共享基础原语文件，定义 `Nullable`、ISO 时间字符串、URL、语言代码、缓存路径与 JSON 值等跨模块可复用类型。
- `packages/shared-types/src/enums.ts`：共享受控枚举集合，当前固化 feed 格式、folder kind、tag scope、附件类型、阅读状态、重要级别、批注类型与 AI Artifact kind 等状态语义。
- `packages/shared-types/src/organization.ts`：订阅组织与标签相关 DTO 文件，定义 `Folder`、`Tag`、`FeedTag` 与 `ArticleTag` 的共享类型边界。
- `packages/shared-types/src/feed.ts`：订阅源相关 DTO 文件，定义 `Feed` 基础模型、订阅树摘要模型与树节点联合类型，供桌面壳后续订阅树与源管理界面消费。
- `packages/shared-types/src/article.ts`：文章阅读相关 DTO 文件，定义 `Article`、`Attachment`、`UserState`、`Annotation` 以及文章列表项与文章详情模型，供后续中栏和右栏阅读界面复用。
- `packages/shared-types/src/automation.ts`：规则、智能文件夹与 AI Artifact 相关 DTO 文件，当前以 `JsonValue` 形式保留查询条件、动作定义和 AI 结果边界；Step 60 后同步事件 DTO 已迁出到 `sync.ts`，避免自动化契约继续承载同步协议语义。
- `packages/shared-types/src/sync.ts`：共享同步契约文件，负责定义 `SyncEvent` 实体类型、变更类型、payload 形状、字段边界常量、密文 blob 类型，以及服务端最小实体 `User`、`Device`、`SyncEvent`、`EncryptedBlob`、`UserSettings` 的 DTO；它不负责生成事件、执行同步传输或解释本地 UI mutation 状态。
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
- `crates/*/src/lib.rs`：各 Rust crate 的库入口；部分 crate 仍只承担可编译占位职责，`core-domain`、`feed-engine`、`content-pipeline`、`rule-engine` 与 `sync-engine` 已逐步承接真实领域逻辑与测试。
- `crates/sync-engine/src/lib.rs`：同步引擎当前入口，Step 60 负责定义 `SyncEvent` / local-only / lazy encrypted blob 三类边界、同步实体类型、变更类型、用户状态字段、批注字段、正文 blob 分类和关系事件分类；它是纯分类层，不读写 SQLite、不生成持久事件 id、不调用远程服务，也不复用 reader shell 的任务状态。
- `crates/core-domain/Cargo.toml`：核心领域 crate 的清单文件；从阶段 3 Step 18 起，它不再只是占位，而是显式声明 `rusqlite`、`thiserror` 与本地数据库迁移所需依赖；到阶段 3 Step 24 又补齐 `serde` 与 `serde_json`，把“共享领域模型可序列化”也固定为 crate 契约的一部分。
- `crates/core-domain/src/lib.rs`：核心领域 crate 的根入口，当前同时导出 `model` 与 `sqlite` 模块，使桌面宿主与后续其他 Rust 模块都能沿同一入口消费领域语义、数据库 bootstrap 与迁移能力。
- `crates/core-domain/src/model/mod.rs`：领域模型聚合入口，负责把实体、值对象、枚举与错误模型收敛为单一共享导出面，避免桌面宿主或后续抓取引擎深链到具体子文件。
- `crates/core-domain/src/model/error.rs`：领域模型错误边界文件，负责把空值、非法枚举、非法布尔位、非法 JSON 与阅读进度越界收敛为结构化错误，供领域构造与存储翻译层共用。
- `crates/core-domain/src/model/ids.rs`：typed id 值对象文件，负责为 `FeedId`、`ArticleId`、`TagId`、`DeviceId`、`RuleAuditId` 等核心标识建立强类型边界，避免共享 Rust 代码继续以裸 `String` 传递跨实体 id。
- `crates/core-domain/src/model/primitives.rs`：基础值对象文件，负责定义 `IsoDateTime`、`UrlString`、`LanguageCode`、`HexColor`、`CachePath` 与 `JsonBlob`，把 schema 中频繁重复出现的文本/JSON 语义从业务实体里抽离出来。
- `crates/core-domain/src/model/enums.rs`：受控枚举文件，负责承接 `FeedFormat`、`FeedHealthStatus`、`TagScope`、`ReadState`、`ImportanceLevel`、`RuleAuditMatchResult` 等 schema 受控值，保持领域语义与 SQLite `CHECK` 约束使用同一套词汇。
- `crates/core-domain/src/model/organization.rs`：组织类实体文件，负责定义 `Folder`、`Tag`、`FeedTag` 与 `ArticleTag`，收敛订阅树与标签归属的领域表示。
- `crates/core-domain/src/model/feed.rs`：Feed 实体文件，负责表达订阅源的领域状态与抓取元数据，而不包含任何 SQLite 迁移或查询执行逻辑。
- `crates/core-domain/src/model/article.rs`：文章域实体文件，负责定义 `Article`、`Attachment`、`UserState` 与 `Annotation`，并把 `reading_progress` 合法区间校验前移到领域层。
- `crates/core-domain/src/model/automation.rs`：自动化相关实体文件，负责定义 `Rule`、`RuleAudit`、`SmartFolder`、`AIArtifact` 与 `SyncEvent`，把规则、规则审计、智能文件夹、AI 产物与同步事件统一纳入领域命名体系。
- `crates/core-domain/src/sqlite/mod.rs`：SQLite 迁移编排入口，负责准备连接 pragma、校验迁移集、计算待执行迁移、串行提交事务并返回迁移报告；当前还内含迁移级验收测试，直接校验空库初始化、回滚恢复、业务表字段序列、索引存在性、FTS 结构存在性、规则审计升级路径以及数据库级约束和搜索索引同步行为。
- `crates/core-domain/src/sqlite/records.rs`：SQLite 记录翻译文件，负责把数据库记录与 `core-domain/model` 之间的表示差异显式收敛起来，包括 `0/1` 布尔位、JSON 文本列、字符串枚举和值对象转换；同时承担 Step 24 的往返转换与非法值拒绝测试，证明“存储表示”和“领域表示”已经被正式解耦。
- `crates/core-domain/src/sqlite/rule_audit_store.rs`：规则审计持久化文件，负责插入、按规则列出和回填 `RuleAudit.applied_effects`，把规则历史读写与现有 `FeedStore` 的抓取/文章持久化职责明确分离。
- `crates/core-domain/src/sqlite/migrations.rs`：嵌入式迁移注册表与迁移历史校验文件，负责把版本号/迁移名绑定到外部 `.sql` 资产、维护 `schema_migrations` 系统表并拒绝不连续或被篡改的迁移历史；当前已把本地 schema 基线推进到 `v7`。
- `crates/core-domain/src/sqlite/migrations/001_bootstrap_metadata.sql`：数据库 `v1` bootstrap 迁移文件，负责创建 `app_metadata` 系统表并写入 `schema.bootstrap=ready` 元数据，是空库初始化的最小持久化入口。
- `crates/core-domain/src/sqlite/migrations/002_core_business_tables.sql`：数据库 `v2` 业务 schema 迁移文件，负责一次性落地 `Folder`、`Tag`、`Feed`、`Article`、`FeedTag`、`ArticleTag`、`Attachment`、`UserState`、`Annotation`、`Rule`、`SmartFolder`、`AIArtifact` 与 `SyncEvent` 13 张核心业务表，并固定基础主键、外键、枚举/布尔约束与默认值边界。
- `crates/core-domain/src/sqlite/migrations/003_core_business_indexes.sql`：数据库 `v3` 索引与唯一性迁移文件，负责为 `Feed`、`Tag`、`Article`、`UserState`、关联表、附件/批注表与同步表补齐唯一索引和常用查询索引，把 Step 20 的数据库级优化与约束收敛为独立可审阅资产。
- `crates/core-domain/src/sqlite/migrations/004_article_search_fts.sql`：数据库 `v4` 全文搜索迁移文件，负责创建 `ArticleSearchSource` 搜索投影视图、`ArticleSearch` FTS5 虚拟表，并把文章、来源标题与文章标签的变更同步规则收敛为数据库触发器，避免搜索索引维护逻辑回流到宿主层。
- `crates/core-domain/src/sqlite/migrations/007_rule_audit_history.sql`：数据库 `v7` 规则审计迁移文件，负责创建 `RuleAudit` 表、固定 `match_result` / JSON 审计载荷列约束，并为按规则和按文章回看自动化历史补齐查询索引入口。
- `crates/core-domain/src/sqlite/backup.rs`：数据库快照备份与恢复辅助文件，负责在升级前通过 `VACUUM INTO` 生成备份，并提供从快照恢复主数据库与清理 sidecar 文件的入口。
- `crates/core-domain/src/sqlite/error.rs`：SQLite 迁移错误模型文件，负责把 IO、SQLite、迁移序列不一致与路径错误收敛为结构化错误边界。
- `apps/desktop/src-tauri/Cargo.toml`：桌面宿主 crate 清单；从阶段 3 Step 18 起显式依赖 `freelyrss-core-domain`，并在阶段 3 Step 22 补齐 `tempfile` 测试依赖，让“启动时先收敛本地 schema”与“宿主本地路径契约可自动化验收”同时成为宿主构建边界的一部分。
- `apps/desktop/src-tauri/src/lib.rs`：桌面宿主入口；当前通过 `setup_local_storage` 钩子先创建受管本地目录布局并触发数据库初始化，再进入窗口运行链路，保证后续任何前端数据消费都建立在已收敛 schema 与已准备好的本地目录结构之上。
- `apps/desktop/src-tauri/src/storage.rs`：桌面宿主本地存储装配文件，负责把 `app_local_data_dir` 映射为 `database/`、`database/backups/`、`cache/content/`、`cache/media/`、`exports/` 与 `logs/` 目录，并把路径策略、目录创建和数据库迁移调用隔离出 `lib.rs`，避免宿主入口重新膨胀为单体文件。

- `crates/feed-engine/Cargo.toml`：Feed 引擎 crate 清单；阶段 3 Step 23 起先引入测试期 `serde` / `serde_json` 依赖用于样本清单校验，阶段 4 Step 25 再补齐运行时 `freelyrss-core-domain` 与 `thiserror` 依赖建立抓取器抽象，阶段 4 Step 26 继续补齐 `roxmltree` 与 `chrono` 依赖用于默认 XML parser，阶段 4 Step 27 再把 `serde` / `serde_json` 推进为运行时依赖以承载默认 JSON Feed parser，阶段 4 Step 28 继续补齐 `scraper` 与 `url` 依赖以承载 HTML 自动发现与相对链接解析，同时仍保持 crate 尚未提前耦合真实 HTTP 客户端。
- `crates/feed-engine/src/lib.rs`：Feed 引擎公共入口文件，负责统一导出 Step 25 新增的错误模型、抓取器编排器、阶段间数据模型与四段端口接口，并在 Step 26 / Step 27 继续暴露 `DefaultFeedParser` 与 `DefaultFeedNormalizer`；到 Step 28 又继续暴露 `DiscoveredFeed`、`FeedDiscoveryResult`、`ParsedSource` 与 `FetchRunOutput`，让调用方只依赖稳定 crate API 而不深链内部模块。
- `crates/feed-engine/src/error.rs`：Feed 引擎错误边界文件，负责把抓取链路中的 fetch、parse、normalize 与 persist 四类阶段失败收敛为统一错误模型，避免后续调度层必须感知具体实现细节。
- `crates/feed-engine/src/model.rs`：抓取链路阶段模型文件，负责定义 `FetchRequest`、`FetchedFeed`、`ParsedFeedDocument`、`ParsedSource`、`DiscoveredFeed`、`FeedDiscoveryResult`、`NormalizeContext`、`NormalizedFeedBatch`、`PersistedFeedBatch`、`FetchRunReport` 与 `FetchRunOutput` 等阶段间公共契约，避免未持久化的解析结果或 HTML 自动发现结果直接挤进 `core-domain/model`。
- `crates/feed-engine/src/ports.rs`：抓取链路端口定义文件，负责声明 `FeedTransport`、`FeedParser`、`FeedNormalizer` 与 `FeedRepository` 四段接口；到 Step 28 为止，`FeedParser` 的所有权边界已显式扩展为“返回已解析 feed 或返回 HTML 自动发现结果”，而不是继续让宿主用错误字符串猜测 parser 输出。
- `crates/feed-engine/src/fetcher.rs`：抓取器编排文件，负责实现只做调用顺序编排的 `FeedFetcher`，把 transport -> parser -> normalizer -> repository 的调用闭环固定在 `feed-engine` 内；到 Step 28 为止，它在收到 discovery 结果时会于 parse 阶段后直接短路返回，而不是误进标准化或持久化。
- `crates/feed-engine/src/normalizer.rs`：默认标准化器文件，负责把 `ParsedFeedDocument` 投影为 `NormalizedFeedBatch`，在不触碰持久化层的前提下统一填充 feed/article 默认标题、抓取时间与附件映射，避免不同格式 parser 各自发明落库前默认值规则。
- `crates/feed-engine/src/parser/mod.rs`：默认 parser 总入口文件，负责完成 UTF-8 边界校验、JSON / XML / HTML 格式探测、时间与值对象转换，并把 RSS、Atom、JSON Feed 与 HTML 自动发现继续分发给格式专属模块，而不是让 `fetcher.rs` 或宿主层承载格式分支。
- `crates/feed-engine/src/parser/rss.rs`：RSS parser 文件，负责处理 RSS 2.0 / RSS 0.9x 的 `channel/item` 结构、`content:encoded`、`enclosure`、`media:*` 与 legacy 场景，把 RSS 特有字段收敛为统一 `ParsedArticle` / `ParsedAttachment`。
- `crates/feed-engine/src/parser/atom.rs`：Atom parser 文件，负责处理 Atom 1.0 的 `feed/entry`、`link rel`、`author`、`summary`、`content` 与 `xml:lang` 继承，把 XHTML / HTML 正文入口保留在解析层输出里供后续内容管线消费。
- `crates/feed-engine/src/parser/json_feed.rs`：JSON Feed parser 文件，负责处理 JSON Feed 1.x 的 version 校验、top-level metadata、item 作者、文本 / HTML 正文、attachments、缩略图回退与发布时间映射，把 JSON Feed 特有字段收敛为统一 `ParsedArticle` / `ParsedAttachment`，避免在宿主层引入 JSON 专用契约。
- `crates/feed-engine/src/parser/html.rs`：HTML 自动发现模块，负责解析普通网页中的 `<link rel="alternate">` feed 链接、识别 RSS / Atom / JSON Feed `type`、处理 `<base href>` 与相对 URL 解析，并把“单个候选源”“多个候选源”“未发现任何源”统一收敛为 `FeedDiscoveryResult`，避免宿主层自己解析网页 HTML。
- `crates/feed-engine/tests/fetcher_pipeline.rs`：抓取器抽象的对外 API 验收文件，负责用空实现 / stub 组件验证“无真实网络请求时仍可闭环”“阶段失败时会正确短路”，以及 Step 28 新增的“HTML discovery 结果会在 parse 阶段后直接返回、不进入 normalize / persist”，把抓取编排边界固化为自动化测试。
- `crates/feed-engine/tests/parser_fixtures.rs`：默认 parser / normalizer 的样本回归验收文件，负责用固定 RSS 2.0、RSS 0.91、Atom 1.0、JSON Feed 1.1 与 HTML discovery 样本校验解析字段、富媒体附件、正文入口、缩略图回退、自动发现结果与标准化输出，确保真实 parser 落地后继续复用 Step 23 / Step 28 样本资产而不是退回内联字符串测试。
- `crates/feed-engine/tests/fixture_catalog.rs`：Feed 固定样本目录的自动化验收文件，负责校验样本清单 JSON、必需场景覆盖、文件签名、条目数、marker 与路径边界；到 Step 28 为止，它已同时覆盖 XML / JSON feed 样本与 HTML discovery 页面样本，避免固定样本退化为无人维护的散落资产。
- `crates/feed-engine/tests/fixtures/README.md`：Feed 固定样本目录的贡献者说明，明确这些 XML / JSON / HTML 文件只服务测试、回归与后续抓取/解析验收，不进入运行时模块边界。
- `crates/feed-engine/tests/fixtures/manifest.json`：Feed 固定样本清单文件，负责为每个样本声明格式、相对路径、条目数、场景覆盖与关键 marker；到 Step 28 为止，它已把 HTML 单源发现、多源发现和无源页面纳入与 RSS / Atom / JSON Feed 同级的清单契约。
- `crates/feed-engine/tests/fixtures/rss/rss-2-rich-media.xml`：RSS 2.0 富媒体样本，负责提供 enclosure、缩略图与内嵌媒体内容场景，供后续 RSS 解析、附件识别与内容标准化验收复用。
- `crates/feed-engine/tests/fixtures/rss/rss-2-duplicates-and-missing-fields.xml`：RSS 2.0 去重与缺字段样本，负责提供重复 canonical link 候选与缺失 guid/author/pubDate 的稀疏文章场景，供后续去重与容错解析验收复用。
- `crates/feed-engine/tests/fixtures/rss/rss-0.91-legacy.xml`：Legacy RSS 0.91 样本，负责在真正实现 RSS 0.9x 解析前先固定兼容性输入资产，避免后续支持 legacy feed 时重新发明测试数据。
- `crates/feed-engine/tests/fixtures/atom/atom-longform-multilingual.xml`：Atom 1.0 长文多语言样本，负责提供 XHTML 正文、长段落与中日阿等多语种混合内容，供后续正文抽取、排版清洗与多语言索引验收复用。
- `crates/feed-engine/tests/fixtures/json-feed/json-feed-podcast.json`：JSON Feed 1.1 富媒体样本，负责提供音频/视频 attachments 与文本正文混合输入，供后续 JSON Feed 解析与附件标准化验收复用。
- `crates/feed-engine/tests/fixtures/html/html-single-feed.html`：HTML 单源发现样本，负责固定“普通网页中只有一个 RSS 候选源”的场景，并验证 `<base href>` 与相对链接解析不会回流到宿主层处理。
- `crates/feed-engine/tests/fixtures/html/html-multiple-feeds.html`：HTML 多源发现样本，负责固定“普通网页中同时暴露 RSS / Atom / JSON Feed 多个候选源”的场景，并验证候选源去重与顺序保持。
- `crates/feed-engine/tests/fixtures/html/html-no-feed.html`：HTML 无源页面样本，负责固定“普通网页没有任何 discoverable feed 链接”的场景，验证 parser 会返回显式 `FeedDiscoveryResult::None` 而不是把正常业务分支伪装成解析错误。

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
- Step 15 中“局部来源选择态”和“局部文章选择态”曾短暂留在壳层，随后在 Step 16 被正式收敛到路由层；这说明 FreelyRSS 允许用受控的过渡性本地状态验证骨架，但不会把它们长期固化在根入口中。
- `apps/desktop/src/styles.css` 现在承接的是“壳级响应式行为”而不是“共享视觉系统”：滚动容器、空状态和窄窗口下右栏下沉规则留在应用壳，主题 token、基础表面和基础控件仍留在 `packages/ui`，这条边界对后续 Web 壳复用非常关键。
- Step 16 的关键价值不是“把状态库和路由库接进来”，而是把桌面壳真正拆成 `provider` 装配层、`route` 组合层、`store` 局部视图状态层和 `query` 异步数据层四个显式边界，避免后续功能继续回退到单体 `App.tsx`。
- `apps/desktop/src/App.tsx` 现在只保留基础 provider 装配，说明 FreelyRSS 已把“应用入口”与“阅读器业务组合”正式解耦；后续新增其他路由或功能壳时，不需要再改写桌面端根入口的业务结构。
- 路由搜索参数统一承载 `sourceId` 与 `articleId`，让顶部导航条和左栏来源树共享同一导航事实来源；这比多个 `useState` 入口并存更容易在后续键盘导航、可访问性和深链接场景下保持一致。
- `reader-shell/selectors.ts` 把“空来源回退”和“失效文章引用修正”前移为显式选择器规则，意味着空队列已不再是边缘异常，而是桌面壳必须稳定收敛的一类一等状态。
- `@freelyrss/shared-query` 在 Step 16 中只负责视图过滤条件的表达与 JSON 预览，而不直接执行数据库查询，这保持了“查询语义层”与“未来 SQLite 执行层”的架构分离。
- 将 `test:desktop` 接入根级 `verify` 的意义，不只是多了一条测试命令，而是把桌面壳状态一致性正式提升为仓库级质量门禁，而非仅靠人工点按验证。
- Step 17 的关键价值不是“零散补几个 ARIA 属性”，而是把快捷键、地标命名、跳转链接与高对比主题正式定义为桌面壳组合层的职责，使无障碍层建立在既有 route / store / query 分层之上，而不是反向侵入共享 UI 或未来数据层。
- `apps/desktop/src/features/reader-shell/accessibility.ts` 把地标 id、快捷键与输入目标排除规则集中化，意味着后续新增阅读面板快捷键或更多地标时，不必让路由组件、面板组件和测试文件分别维护三套快捷键知识。
- 把 `themeTone` 留在 `reader-shell/state.ts`、而让 `App.tsx` 仅消费它并传给 `ThemeRoot`，证明“主题选择”被视为壳级视图状态，而不是阅读业务状态或共享组件内部私有状态。
- 通过让 `SplitPane` 支持 ref 转发、让命名 `section` 变成可聚焦目标，FreelyRSS 现在可以在不引入额外焦点管理库的前提下，为键盘用户提供稳定的区域进入点，同时保持共享 UI 仍然只是展示骨架。
- 中栏与右栏把动态业务标题从 landmark 名称中剥离出来，说明 FreelyRSS 已开始把“屏幕阅读器需要稳定识别的壳级语义”与“会随当前来源/文章变化的业务上下文”明确区分，这对后续真实数据接入后的可访问性稳定性非常关键。
- 将键盘快捷键与高对比切换验收直接写入 `reader-shell.test.tsx` 并纳入根级 `verify`，意味着从 Step 17 起，可访问性入口不再只是人工体验检查项，而是仓库级自动化质量门禁的一部分。
- Step 18 的关键价值不是“先把业务表建出来”，而是先把唯一合法的本地 schema 演进入口固定下来：自此之后，业务表、索引、FTS 和缓存相关结构都必须通过 `core-domain/sqlite` 的迁移编排层进入数据库。
- 将迁移编排放在 `crates/core-domain`、把路径决策留在 `apps/desktop/src-tauri/src/storage.rs`，明确分开了“共享数据库语义”与“桌面端本地文件系统布局”两条职责边界；前者未来可被测试工具或其他宿主复用，后者仍然是桌面平台私有决策。
- `schema_migrations` 与 `app_metadata` 作为系统表先行落地，意味着阶段 3 之后数据库会同时存在“业务 schema”与“迁移元数据”两层结构；两者职责必须保持分离，不能让系统表退化成万能配置桶。
- 针对已有数据库的升级路径采用“升级前快照备份 + 每条迁移单独事务 + 显式恢复入口”的组合，比单纯依赖 SQLite 自动回滚更稳妥：事务负责阻止半条迁移落库，快照负责跨版本失败后的人工恢复，恢复函数负责把回滚动作编码成可复用实现而不是口头知识。
- 在 Tauri `setup` 阶段先执行数据库初始化，意味着后续 Step 19 到 Step 24 的任何前端查询接线都可以假定“本地 schema 已经收敛”；这避免了 React 层在首屏期间自己判断建库、补表和升级状态，从架构上阻止数据访问逻辑回流到前端壳层。
- 当前将数据库文件与备份目录先固定为 `app_local_data_dir()/database/*`，是对阶段 3 Step 22 的前置约束：先把“数据库主文件”与“升级恢复产物”独立出来，后续再把正文缓存、媒体缓存、导出物与日志扩展为更完整的数据目录结构。
- Step 19 的关键价值不是“把表名补齐”，而是把 `shared-query` 已经约定的 `Feed`、`Article`、`UserState`、`Attachment`、`Tag` 等实体命名真正落实到 SQLite schema 中；自此查询语义层与本地持久化层开始围绕同一套实体词汇表演进，而不是各自发明表名。
- 把迁移 SQL 从 `migrations.rs` 抽离到版本化 `.sql` 文件，不只是为了可读性；更重要的是让后续 SQLite 特有的“重建表式迁移”也能以独立、可审阅、可回放的资产存在，而不是继续埋在 Rust 字符串常量里。
- 在 `v2` 业务表中先固定主键、核心外键、布尔位约束、受控枚举与阅读进度范围，意味着 Step 20 可以专注于唯一性和查询索引补强，而不必为补基础表约束回退到整表重建；这对 SQLite 迁移成本控制非常关键。
- `core-domain/sqlite` 现在不仅是“迁移执行器”，也开始承担“schema 基线守门人”的职责：迁移测试直接校验 13 张业务表与字段序列是否和 `architecture.md` 一致，把架构文档中的 schema 从口头约束提升为自动化验收边界。
- Step 20 的关键价值不是“多建几条索引”，而是把“数据正确性约束”和“查询入口优化”正式从业务表定义中拆成可独立演进的 `v3` 迁移资产；这样后续补 FTS、去重辅助索引或同步查询索引时，都不必回退修改 Step 19 的建表事实。
- `003_core_business_indexes.sql` 把 `feed_url` 唯一性、`Tag.scope + name` 唯一性、文章时间排序、阅读状态过滤与多对多反向查询这些高频路径集中收敛到同一迁移文件，意味着后续开发者查数据库性能或唯一性问题时，有单一审阅入口，而不是在表定义、宿主代码和测试里分散寻找。
- 在 `mod.rs` 中把“索引存在”和“非法写入被拒绝”直接纳入迁移测试，说明 FreelyRSS 现在把数据库级行为视作可回归的架构边界，而不只是实现细节；这会显著降低后续 Step 21 以后因 FTS、抓取写入或状态更新引入的隐性 schema 漂移风险。
- 当前 `v2` / `v3` 的分层也进一步证明了 `src-tauri/storage.rs` 只应该决定数据库文件放在哪里，而不应该决定数据库长什么样：路径策略留给宿主，schema 语义、唯一性和索引规划留给 `core-domain/sqlite`，这是桌面壳与共享 Rust 边界继续保持清晰的关键。
- Step 21 的关键价值不是“把 SQLite FTS5 打开”，而是把“搜索文档如何从业务表投影出来”也正式收敛成 schema 资产：`ArticleSearchSource` 视图定义了标题、摘要、正文、来源标题和标签名的统一拼装边界，后续搜索执行层可以消费这个稳定投影，而不必在 Rust 或前端里复制字段拼装逻辑。
- `004_article_search_fts.sql` 同时承载 FTS 表、回填语句和同步触发器，意味着“建立索引”“升级既有数据”“维持后续一致性”三个动作拥有同一个可审阅入口；这比把初始建表留在迁移里、把同步逻辑散落在宿主写入路径里更稳妥。
- 让 `Feed.title/custom_name` 与 `Tag.name/scope` 的变化也能触发全文索引重建，说明 FreelyRSS 已把搜索视为跨实体投影，而不是只依附于 `Article` 单表的附属能力；这为后续搜索结果中的来源过滤、高亮片段和智能文件夹复用打下了一致的数据基础。
- 在 `mod.rs` 中新增 `v3 -> v4` 升级回填测试与变更同步测试，意味着 FreelyRSS 不再只验证“空库初始化后 schema 正确”，而是开始验证“真实升级路径中的索引投影是否正确收敛”；这对后续已有用户数据库的平滑演进非常关键。
- Step 22 的关键价值不是“多建几个目录”，而是把桌面端本地数据落点正式收敛为宿主层契约：数据库主文件与升级备份留在 `database/`，正文缓存与媒体缓存收敛到 `cache/`，导出产物和日志则各自拥有独立目录，避免后续抓取、导出、缓存清理与故障排查继续共享同一文件夹。
- `apps/desktop/src-tauri/src/storage.rs` 在 Step 22 中同时承担“路径推导”“目录预创建”和“数据库初始化接线”三件宿主私有工作，但仍刻意不触碰 schema、索引、FTS 或缓存内容格式；这进一步巩固了“路径策略属于宿主，数据语义属于 `core-domain/sqlite`”的边界。
- 在 Tauri `setup` 阶段先完成完整目录布局，再调用 `initialize_database`，意味着后续 Step 23 到 Step 59 的测试样本、抓取缓存、媒体落盘、导出产物和任务日志都可以假定本地目录契约已经稳定存在，而不必在各自模块里重复决定路径或临时补目录。
- 把宿主本地目录契约的自动化验收放进 `apps/desktop/src-tauri` 自己的单元测试，而不是只依赖根级 `verify`，说明 FreelyRSS 已开始把“宿主层文件系统布局”也视为一等架构边界；这能减少未来因平台路径调整或缓存目录扩展带来的静默回归。
- Step 23 的关键价值不是“先堆几份 XML/JSON 样本”，而是先把抓取与解析阶段未来要长期复用的验收输入资产固定下来：在真正编写 parser 之前，就先约定好场景覆盖、样本路径和校验方式，避免 Step 25 之后继续用临时内联字符串推动实现。
- 把固定样本放在 `crates/feed-engine/tests/fixtures/`、并通过 `fixture_catalog.rs` + `manifest.json` 管理，意味着 FreelyRSS 明确把“解析回归资产”视为 `feed-engine` 模块边界的一部分，而不是把样本散落到 `core-domain`、桌面宿主或前端壳层。
- `manifest.json` 同时声明格式、场景、条目数与 marker，说明 FreelyRSS 不准备把测试数据集仅仅当作“能打开的文件集合”；它从 Step 23 开始就是可审阅、可扩展、可自动验收的契约资产，这对后续 Step 26 到 Step 30 的解析、去重与内容标准化测试非常关键。
- 在 Step 23 就额外纳入 `rss-0.91-legacy.xml`，虽然超出“最少满足当前步骤”的字面要求，但符合实施计划里对 RSS 0.9x 支持的前置需要：先把 legacy 输入固定为回归资产，再进入真正的兼容实现，比等到解析器落地后临时补样本更稳妥。
- Step 25 的关键价值不是“先做一个空壳抓取器”，而是先把 HTTP 获取、格式解析、标准化和持久化四段边界显式拆开：这样 Step 26 以后补真正的 RSS / Atom / JSON Feed 解析时，不需要再回头重写调用链归属。
- `FeedFetcher` 只负责编排而不承担任何网络、格式或存储实现，意味着调度层未来只需要面向一个稳定入口，而不必自己串联 transport、parser、normalizer 与 repository；这比让宿主层充当“临时总控器”更容易保持模块边界长期清晰。
- `model.rs` 中的 `ParsedFeedDocument` 与 `NormalizedFeedBatch` 同时存在，说明 FreelyRSS 已开始把“原始解析结果”和“准备落库的标准化结果”视为两类不同契约；这避免了未定稿的 parser 输出直接污染 `core-domain/model` 或 SQLite 记录层。
- `ports.rs` 把四段接口定义为 `feed-engine` 内部的第一等资产，而不是等具体库选型后再反推抽象，意味着后续无论选 `reqwest`、第三方 RSS 解析库还是自研兼容层，都必须服从同一条抓取边界。
- `tests/fetcher_pipeline.rs` 作为纯 stub 接线验收文件，证明 Step 25 的目标不是验证网络可达性，而是验证“调用闭环是否独立于真实基础设施存在”；这为后续 UI 调度接线、失败短路与离线测试提供了可复用的最小回归资产。
- Step 26 的关键价值不是“把 XML 读出来”，而是把真实 RSS / Atom 解析正式收敛为 `feed-engine` 自己的默认实现：调用方依旧只面向 `FeedParser` / `FeedNormalizer` 契约，但仓库内已经拥有可直接复用的基线实现与样本回归资产。
- `parser/mod.rs`、`parser/rss.rs` 与 `parser/atom.rs` 的拆分，意味着 FreelyRSS 没有把真实格式分支直接堆回单一文件；格式探测、RSS 兼容层与 Atom 兼容层现在各自拥有独立文件与所有权，为 Step 27 的 JSON Feed parser 预留了平行扩展位。
- `normalizer.rs` 作为独立文件出现，说明 FreelyRSS 没有让 parser 直接承担“落库前默认值补齐”职责；解析契约与标准化契约继续保持分离，这能减少后续不同 feed 格式在默认标题、抓取时间和附件映射规则上的漂移。
- `tests/parser_fixtures.rs` 把“RSS 富媒体附件”“RSS 0.91 兼容”“Atom XHTML 长文”“默认标准化输出”收敛成与 `fetcher_pipeline.rs` 并列的回归资产，意味着从 Step 26 起，FreelyRSS 已开始把真实格式解析正确性视为可回归的架构边界，而不是只依赖未来的持久化或 UI 集成测试兜底。
- Step 27 的关键价值不是“再支持一种格式”，而是证明 `feed-engine` 已经拥有稳定的多格式扩展位：JSON Feed 默认实现只需要新增 `parser/json_feed.rs` 并扩展 `parser/mod.rs` 分发，就能复用既有 `ParsedFeedDocument`、`DefaultFeedNormalizer` 与测试样本框架，而不需要改写 `FeedFetcher` 或宿主接线。
- `parser/json_feed.rs` 的落地说明 FreelyRSS 已把“格式差异”控制在 parser 私有边界内：JSON 的 authors、content_text、content_html、attachments、image 与 version 兼容策略都在 parser 内收敛，宿主层与后续持久化层只消费统一语义对象。
- 把 `serde` / `serde_json` 正式移入 `crates/feed-engine` 运行时依赖，意味着 JSON Feed 不再只是固定样本目录里“未来要支持的格式”，而是已经成为默认解析链路的正式能力；依赖边界也因此继续留在 `feed-engine`，没有扩散到桌面壳或 `core-domain`。
- `tests/parser_fixtures.rs` 在 Step 27 新增 JSON Feed 解析与标准化回归，说明 FreelyRSS 现在把“同一份固定样本必须同时覆盖 parse correctness 与 normalize correctness”视为架构约束；这能显著降低后续 Step 29 持久化接线时因为某一种 feed 格式字段投影不一致而产生的隐性回归。
- Step 28 的关键价值不是“把 HTML 也读一遍”，而是把“用户输入的是网页而不是 feed 地址”正式提升为 parser 成功路径中的第一等结果：`ParsedSource` 与 `FetchRunOutput` 把“已解析 feed 文档”和“HTML 自动发现结果”拆成显式契约，而不是继续依赖错误字符串或宿主层猜测控制流。
- `parser/html.rs` 的落地说明 FreelyRSS 已把 `<link rel="alternate">` 识别、`type` 判定、`<base href>` 处理与相对链接解析全部封装在 `feed-engine` 内部；未来桌面壳、同步层或导入流程只需要消费 `FeedDiscoveryResult`，不需要自己重新解析网页 HTML。
- `fetcher.rs` 在 Step 28 中新增“收到 discovery 结果后于 parse 阶段后直接短路返回”的行为，证明 Step 25 建立的编排边界仍然成立：HTML 自动发现是 parser 的成功分支，不是 normalizer 或 repository 的职责，也不是持久化层的特殊异常路径。
- 把 `html-single-feed.html`、`html-multiple-feeds.html` 与 `html-no-feed.html` 纳入同一份 `manifest.json` 和 `fixture_catalog.rs`，意味着 FreelyRSS 现在把 HTML discovery 页面视为与 RSS / Atom / JSON Feed 同级的长期回归资产；这能显著降低后续 Step 29 接持久化流程时把 discovery 结果误当作解析错误或误当作可直接落库 feed 的风险。
- Step 29 的关键价值不是“终于把数据写进 SQLite”，而是把“标准化 feed 批次 -> 本地业务图”的落库语义正式收敛到 `core-domain/sqlite`：`feed-engine` 继续只拥有抓取阶段语义与仓储接线权，而 SQL、默认 `UserState` 初始化和附件替换策略继续留在共享存储边界。
- `core-domain/sqlite/store.rs` 的落地说明 FreelyRSS 已经拥有第一条真正服务业务写入的共享 SQLite API：它负责在单一事务里 upsert `Feed`、`Article`、`Attachment` 与默认 `UserState`，使后续桌面命令、抓取引擎和同步回放都不需要各自重写一套“文章图谱怎么落库”的 SQL。
- Step 29 没有把 `Feed.custom_name`、排序、更新频率等用户字段交回抓取链覆盖，而是让 `FeedStore` 只更新抓取得到的元数据字段；这说明 FreelyRSS 已经开始把“抓取侧事实”和“用户侧组织状态”视为同一实体上的两类不同所有权字段。
- `SqliteFeedRepository` 仅在 `feed-engine` 中负责把 `NormalizedFeedBatch` 映射为领域对象，并通过 `feed_url` 复用既有 `Feed.id`、通过 `source_guid` 复用既有 `Article.id`；这意味着 FreelyRSS 在 Step 29 只补齐了最小持久化身份闭环，还没有把 canonical URL / 标题时间 / 内容哈希等更强去重策略提前混入编排层，为 Step 30 保留了清晰扩展位。

### Step 29 文件职责

- `crates/core-domain/src/sqlite/store.rs`：SQLite 业务写入边界，负责在事务中 upsert `Feed` / `Article`、初始化默认 `UserState`，以及在文章重写时替换附件集合。
- `crates/core-domain/src/sqlite/error.rs`：承载 `MigrationError` 与新的 `StoreError`，分别界定“迁移失败”和“业务写入失败”两类 SQLite 失败语义。
- `crates/core-domain/src/sqlite/mod.rs`：`core-domain/sqlite` 的公共出口；继续负责数据库初始化与迁移，同时新增连接准备函数和 `FeedStore` 导出，避免调用方深链具体实现文件。
- `crates/feed-engine/src/sqlite_repository.rs`：`feed-engine` 的默认 SQLite 仓储实现；负责把 `NormalizedFeedBatch` 转成领域对象、解析最小身份复用规则，并调用 `FeedStore` 完成真实落库。
- `crates/feed-engine/src/lib.rs`：抓取引擎公共 API 汇总入口；在 Step 29 中新增 `SqliteFeedRepository` 导出，使桌面宿主或后续调度层可以只依赖稳定 crate 入口接线。
- `crates/feed-engine/Cargo.toml`：限定 Step 29 的运行时与测试依赖边界；`rusqlite` 留在默认仓储实现，`sha2` 留在稳定 ID 生成，`tempfile` 仅用于仓储回归测试，不让这些依赖扩散到前端或宿主层。

- Step 30 的关键价值不是“把重复文章删掉”，而是把“文章身份判定”正式提升为持久化边界的一等契约：`source_guid` 继续服务显式源内身份复用，canonical/original URL、标题+发布时间+来源与内容哈希则按优先级补足缺失或漂移场景下的稳定身份闭环。
- `005_article_dedup_indexes.sql` 的落地说明 FreelyRSS 没有把 Step 30 做成仓储层的临时内存比较器，而是把 per-feed 去重查询路径固化为 schema 资产；这意味着后续 Step 31 的条件抓取、Step 35 的 OPML 导入回放和 Step 62 的同步重放都能复用同一套数据库级查重入口。
- `core-domain/sqlite/store.rs` 在 Step 30 中新增 URL、标题+发布时间与内容哈希查询函数，说明 FreelyRSS 已明确把“数据库里如何认定这是同一篇文章”留在共享存储边界，而不是让桌面宿主、前端或抓取编排层各自拼接 SQL。
- `feed-engine/src/sqlite_repository.rs` 在 Step 30 中新增批次内去重注册表与稳定 ID 回退策略，说明默认 SQLite 仓储不仅要负责“把标准化结果送进存储层”，也要负责在单次抓取批次内部先折叠重复项；这样同一份 feed 中的 mirror 条目不会因为数据库尚未写入第一条而漏过去重。
- 让批次内去重采用“首个命中条目保留、后续重复条目跳过”的策略，而不是对同一 `Article.id` 连续覆盖，说明 FreelyRSS 现在把“避免重复污染列表”置于“盲目保留最后一份镜像副本”之前；这对 RSS 镜像源、归档镜像和未来多入口导入场景更稳妥。
- 内容哈希只作为第三级后备规则，并且由 `content_extracted -> content_raw -> summary` 的文本序列推导，说明 FreelyRSS 当前仍在主动压低误判风险：只有当源标识、URL 与标题+发布时间都无法提供稳定身份时，才让正文级相似性介入身份判定。

### Step 30 文件职责

- `crates/core-domain/src/sqlite/migrations/005_article_dedup_indexes.sql`：数据库 `v5` 迁移文件，负责为 `Article` 提供按 `feed_id` 收敛的 canonical URL、original URL、标题+发布时间与内容哈希去重辅助索引。
- `crates/core-domain/src/sqlite/migrations.rs`：SQLite 嵌入式迁移注册表；在 Step 30 中把 `article_dedup_indexes` 纳入标准迁移序列，使空库初始化与升级路径都能自动获得 `v5` 索引。
- `crates/core-domain/src/sqlite/store.rs`：共享 SQLite 去重查询边界；继续负责事务写入，同时新增按 URL、标题+发布时间和内容哈希查找既有 `Article.id` 的存储级入口。
- `crates/core-domain/src/sqlite/mod.rs`：SQLite 初始化与迁移验收入口；在 Step 30 中负责验证 `v5` 索引存在、最新 schema 版本推进，以及 `v4 -> v5` 升级路径会落地去重辅助索引。
- `crates/feed-engine/src/sqlite_repository.rs`：默认 SQLite 仓储实现；在 Step 30 中负责按优先级调用去重查询、维护批次内重复项折叠注册表、生成稳定回退 `ArticleId`，并把内容哈希投影到领域文章对象。
- `crates/feed-engine/tests/fixtures/rss/rss-2-duplicates-and-missing-fields.xml`：Step 30 的核心验收输入资产，负责固定“重复 canonical URL + 缺失 guid/author/pubDate”的真实 RSS 样本，验证去重不会误删不同文章。

### Step 31 架构洞察

- Step 31 的关键价值不是“加几个 HTTP 头”，而是把“远端未变化”正式提升为抓取链路中的一等成功结果：`304 Not Modified` 现在与“拉回正文后继续解析”处于同级分支，这使 FreelyRSS 不必再用错误字符串或宿主层条件判断来表达增量抓取。
- `crates/feed-engine/src/transport.rs` 的落地说明 FreelyRSS 已把请求头拼装、超时、瞬态重试与响应缓存元数据收敛到 transport 私有边界；后续 Step 32 的网络错误分类与 Step 33 之后的调度接线都应继续复用这条边界，而不是让桌面宿主或 UI 自己管理 HTTP 语义。
- `FetchRequest` 继续承载 `feed_id + feed_url + etag + last_modified`，意味着 FreelyRSS 现在把“抓取身份”和“缓存协商上下文”视为同一次拉取请求的组成部分；这为后续按 `update_interval` 调度、按健康状态回退频率提供了稳定输入契约。
- `FeedFetcher` 在 Step 31 中新增 not-modified 短路后，进一步证明 parser / normalizer 只应该处理“正文被拉回”的分支；HTML discovery、JSON/XML 解析与标准化都不会接触 `304` 路径，这让内容语义层保持与 HTTP 缓存层解耦。
- `SqliteFeedRepository::record_not_modified()` 与 `FeedStore::record_feed_successful_check()` 的引入说明 FreelyRSS 已明确区分两类成功写入：一种是“正文批次落库”，另一种是“仅更新 feed 检查元数据”。这使后续健康状态、失败计数与调度时间戳能够继续留在持久化边界，不污染内容模型。
- Step 31 没有把 `update_interval`、健康状态分类或连续失败阈值提前混入 `feed-engine` transport，说明当前架构仍坚持“先固化成功路径与缓存协商，再在下一步叠加失败语义”的增量策略；这能减少把网络层暂态策略过早散落到仓储或 UI 的风险。

### Step 31 文件职责

- `crates/feed-engine/src/model.rs`：抓取链路中间契约中心；在 Step 31 中新增 `NotModifiedFeed`、`TransportFetchOutput`、`RecordedFeedCheck` 与 `FetchNotModifiedReport`，负责把“正文已变更”和“正文未变更”表达为显式的类型边界。
- `crates/feed-engine/src/ports.rs`：`feed-engine` 四段式端口定义；在 Step 31 中把 transport 输出升级为 `TransportFetchOutput`，并为 repository 增加 `record_not_modified()`，确保 not-modified 路径也通过稳定端口闭环，而不是绕过仓储层。
- `crates/feed-engine/src/fetcher.rs`：抓取编排器；在 Step 31 中负责识别 `TransportFetchOutput::NotModified`，调用 repository 记录检查结果，并在 `304` 路径下短路 parser / normalizer / persist 主链路。
- `crates/feed-engine/src/transport.rs`：默认阻塞式 HTTP transport 实现；负责组装 `Accept` / `If-None-Match` / `If-Modified-Since`，执行超时与重试策略，提取 `ETag` / `Last-Modified` / `Content-Type` / 最终 URL，并把响应映射为 modified / not-modified 双分支结果。
- `crates/feed-engine/src/lib.rs`：`feed-engine` 公共 API 汇总入口；在 Step 31 中导出新的 not-modified 契约类型以及 `ReqwestFeedTransport` / `FeedTransportOptions`，使宿主或后续调度层只需依赖稳定 crate 出口即可接线。
- `crates/feed-engine/Cargo.toml`：`feed-engine` 依赖边界定义；在 Step 31 中正式纳入 `reqwest` 阻塞客户端依赖，说明默认 transport 已成为该 crate 的正式运行时能力，而非测试工具链附属物。
- `crates/feed-engine/tests/fetcher_pipeline.rs`：抓取编排回归测试；在 Step 31 中验证 `304` 响应会停在 fetcher + repository not-modified 路径，不会误触 parser、normalizer 或普通持久化。
- `crates/feed-engine/src/sqlite_repository.rs`：默认 SQLite 仓储实现；在 Step 31 中新增 not-modified 记账入口，负责解析既有 `Feed.id`、调用 `FeedStore` 更新 feed 检查元数据，并保证文章图与用户状态不被重写。
- `crates/core-domain/src/sqlite/store.rs`：共享 SQLite 写入边界；在 Step 31 中新增 `record_feed_successful_check()`，负责以数据库事务外的轻量更新方式回写 `feed_url`、`health_status`、`last_checked_at`、`last_success_at`、`etag` 与 `last_modified`。
- `crates/core-domain/src/sqlite/mod.rs`：SQLite 初始化与迁移验收入口；虽然 Step 31 未新增 schema 版本，但它继续为 `FeedStore` 提供统一连接准备与既有 schema 保证，确保 transport / repository 新增的状态回写建立在稳定数据库基线上。

### Step 32 架构洞察

- Step 32 的关键价值不是“多加几个报错字符串”，而是把“抓取失败诊断”正式收敛为可持久化的领域事实：`Feed.health_status` 继续表达聚合后的健康状态，而 `last_error_kind`、`last_error_message`、`last_error_at` 与 `consecutive_failures` 则承载最近一次失败的细节与升级依据。
- `FeedEngineError` 在 Step 32 中从“只区分阶段”推进到“阶段 + 失败类别”，说明 FreelyRSS 现在把网络错误、权限错误、解析错误和空内容错误视为产品级语义，而不是仅供日志查看的内部异常文本。
- `FeedFetcher` 在 Step 32 中新增“失败先记账、再返回原始错误”的流程，意味着编排层开始承担失败短路与诊断回写触发职责，但仍不持有健康状态计算本身；真正的失败阈值与持久化语义继续留在 repository / store。
- `FeedStore::record_feed_failed_check()` 与 `record_feed_successful_check()` 的对偶设计说明 FreelyRSS 已明确把健康诊断视为与内容落库并列的持久化分支：成功路径负责清空错误摘要并归零失败计数，失败路径负责递增计数、保留最近错误，并在权限错误立即升级与“连续失败达到阈值升级”之间做统一判定。
- 把健康诊断 schema 独立推进到数据库 `v6`，而不是回改 `v2` 建表迁移，说明 FreelyRSS 已开始把“可观测性与运维字段”也当作可审阅、可升级的架构资产；这对已有用户数据库的平滑演进和后续 Step 33 左栏状态展示非常关键。
- `packages/shared-types` 同步新增 `FeedErrorKind` 与错误摘要字段，说明健康状态不再只是 Rust 内部概念，而是已经推进到跨端契约层；但当前 UI 仍只消费 DTO，不反向定义错误分类规则，这保持了前后端职责边界。

### Step 32 文件职责

- `crates/core-domain/src/model/enums.rs`：共享受控枚举中心；在 Step 32 中新增 `FeedErrorKind`，统一 Rust 领域层对网络、权限、解析与空内容错误的命名。
- `crates/core-domain/src/model/feed.rs`：Feed 领域实体；在 Step 32 中新增最近错误摘要与连续失败计数字段，使健康诊断与抓取元数据落到同一领域对象上。
- `crates/core-domain/src/sqlite/records.rs`：领域对象与 SQLite 记录翻译层；在 Step 32 中负责把 `FeedErrorKind`、最近错误时间和连续失败计数在存储表示与领域表示之间安全往返。
- `crates/core-domain/src/sqlite/migrations/006_feed_health_diagnostics.sql`：数据库 `v6` 迁移文件；负责为 `Feed` 表补齐健康诊断列与失败筛查索引，使 Step 32 的可观测性能力成为正式 schema 资产。
- `crates/core-domain/src/sqlite/migrations.rs`：嵌入式迁移注册表；在 Step 32 中把 `feed_health_diagnostics` 纳入标准迁移序列，确保空库初始化与升级路径都会获得诊断字段。
- `crates/core-domain/src/sqlite/mod.rs`：SQLite 初始化与迁移验收入口；在 Step 32 中负责校验 `v6` schema 列与索引存在，并新增 `v5 -> v6` 升级测试。
- `crates/core-domain/src/sqlite/store.rs`：共享 SQLite 健康状态写入边界；在 Step 32 中新增 `record_feed_failed_check()`，并扩展成功记账以清理错误摘要和失败计数。
- `crates/feed-engine/src/error.rs`：抓取错误语义中心；在 Step 32 中把 transport / parser 失败从模糊字符串推进为带 `FeedErrorKind` 的结构化错误，并为权限错误与空内容错误提供独立构造入口。
- `crates/feed-engine/src/model.rs`：抓取中间契约中心；在 Step 32 中新增 `FailedFeedCheck`，作为 fetcher 向 repository 回写失败诊断的稳定载荷。
- `crates/feed-engine/src/ports.rs`：`feed-engine` 四段式端口定义；在 Step 32 中为 repository 增加 `record_failure()`，确保失败路径也经过稳定端口而不是由 fetcher 直接拼 SQL。
- `crates/feed-engine/src/fetcher.rs`：抓取编排器；在 Step 32 中负责在 transport / parser 失败后组装 `FailedFeedCheck` 并触发仓储记账，再把原始抓取错误返回给调用方。
- `crates/feed-engine/src/parser/mod.rs`：默认 parser 总入口；在 Step 32 中把“空白正文”提升为独立 `empty` 错误，而不是继续退化成 generic parse failure。
- `crates/feed-engine/src/transport.rs`：默认阻塞式 HTTP transport 实现；在 Step 32 中把 `401` / `403` 显式分类为权限错误，其余网络与 HTTP 失败继续收敛为网络错误。
- `crates/feed-engine/src/sqlite_repository.rs`：默认 SQLite 仓储实现；在 Step 32 中新增失败记账入口，负责解析既有 `Feed.id`、回写失败诊断、在首次未落库 feed 场景下安全跳过健康写入，并在成功持久化时重置诊断字段。
- `crates/feed-engine/tests/fetcher_pipeline.rs`：抓取编排回归测试；在 Step 32 中验证 transport / parser 失败会先触发 `record_failure()`，且不会误入 normalizer / persist。
- `crates/feed-engine/tests/parser_fixtures.rs`：parser / normalizer 回归测试；在 Step 32 中新增空内容错误验收，防止空正文回退成一般解析失败。
- `packages/shared-types/src/enums.ts`：前端共享受控枚举定义；在 Step 32 中新增 `FeedErrorKind`，让桌面端、Web 端和移动端共享同一错误类别词汇表。
- `packages/shared-types/src/feed.ts`：Feed DTO 契约文件；在 Step 32 中把最近错误摘要与连续失败计数加入 `FeedDto` / `FeedSummaryDto`，为订阅树和源管理 UI 提供稳定输入。
- `packages/shared-types/src/index.ts`：共享类型包导出面；在 Step 32 中导出新的健康诊断枚举与 DTO 字段，避免调用方深链引用具体实现文件。
- `apps/desktop/src/features/reader-shell/mock-data.ts`：桌面壳异步 mock 数据边界；在 Step 32 中为来源样本补齐错误类型、错误摘要与连续失败计数，提前验证共享 DTO 扩展不会破坏现有壳层组合。

### Step 33 架构洞察

- Step 33 的关键价值不是“把左栏画成树”，而是把“树事实、树投影、树交互”拆成三层清晰边界：`packages/shared-types` 只描述订阅树节点事实，reader shell selectors 负责把这些事实投影为可渲染树行，shell store 只持有本地折叠状态；这使树 UI 可以演进，而不用把层级拼装或折叠状态写回共享契约或宿主层。
- 让 `sourceId` 继续留在 route，而把 `collapsedFolderIds` 留在本地 store，说明 FreelyRSS 已明确区分“可分享 / 可恢复的导航上下文”和“仅服务当前窗口交互的暂态 UI 状态”；这对后续 Step 34 订阅源编辑、Step 37 查询驱动的文章列表和 Step 51 智能文件夹接入都很重要。
- `selectors.ts` 在 Step 33 中承担递归聚合文件夹未读统计、解析文件夹包含的所有 feed、并在深层节点被 route 选中时自动保持祖先展开，说明树投影逻辑被限制在 feature 组合层，而不是回流到 `packages/ui`、桌面宿主或 `core-domain/sqlite`；这样未来接入真实数据源时可以直接替换输入 DTO，而不必重写树交互。
- `source-pane.tsx` 继续复用 `ListSection` / `ListRow` 作为通用列表外壳，但把树专有的 `ul/li` 语义、折叠按钮、深度缩进与分组操作按钮留在 feature 目录，说明 FreelyRSS 没有为了当前一个树视图把基础 UI 包过早做成“通用树组件”；这保持了共享 UI 层的稳定性和低耦合。
- Step 33 直接消费 `FeedSummaryDto.healthStatus` 与最近错误摘要作为树节点文案，而没有把错误分类规则搬到前端重新计算，说明健康诊断仍然由抓取与持久化边界定义，UI 只负责呈现；这延续了 Step 32 建立的“错误事实留在后端边界，前端只消费 DTO”原则。
- 新增的订阅树回归测试把“嵌套文件夹可见性”和“选择文件夹会刷新中栏队列”收敛为桌面壳 feature 级验收，意味着 FreelyRSS 已开始把左栏树视图视为与抓取编排、SQLite 迁移同等级的可回归架构边界，而不是单纯的视觉占位。

### Step 33 文件职责

- `packages/shared-types/src/feed.ts`：订阅树 DTO 契约源文件；定义 `FolderTreeNodeDto`、`FeedTreeNodeDto` 与 `SubscriptionTreeNodeDto`，为桌面壳后续树视图、源管理和智能文件夹并列展示提供稳定数据边界。
- `apps/desktop/src/features/reader-shell/types.ts`：reader shell 本地组合类型中心；在 Step 33 中显式区分快速视图输入、订阅树输入与订阅树渲染行，避免把树专有 UI 状态混入共享 DTO。
- `apps/desktop/src/features/reader-shell/state.ts`：reader shell 的局部 Zustand store；继续承载队列过滤与主题切换，并在 Step 33 中新增 `collapsedFolderIds` 以管理仅属于当前窗口会话的树折叠状态。
- `apps/desktop/src/features/reader-shell/selectors.ts`：reader shell 的纯函数组合层；负责把订阅树 DTO 投影为可渲染树行、递归解析文件夹包含的 feed、聚合未读统计、匹配 route 当前来源以及驱动中栏文章过滤。
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`：左栏来源面板组件；负责把快速视图与订阅树渲染到同一面板中，并把“选中节点”和“折叠/展开文件夹”拆成两个明确交互入口。
- `apps/desktop/src/features/reader-shell/mock-data.ts`：桌面壳异步 mock 数据入口；在 Step 33 中提供嵌套文件夹、健康状态与错误摘要样本，以及真实的 `SubscriptionTreeNodeDto` 结构，确保树 UI 在接真实数据前已有稳定验收资产。
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`：桌面 reader shell 的路由组合根；继续负责 route、query 与 shell store 接线，并在 Step 33 中把 `subscriptionRows` 计算、折叠操作与左栏树选择接入三栏布局。
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`：reader shell feature 回归测试；在 Step 33 中验证树层级显示、折叠/展开行为以及按文件夹选中后中栏队列刷新，防止后续路由或 UI 调整破坏左栏核心行为。
- `apps/desktop/src/styles.css`：桌面壳视觉与布局样式文件；在 Step 33 中新增树行缩进、折叠按钮、语义列表与分组操作区样式，使树视图视觉层继续留在桌面壳而不侵入共享 UI 包。

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
- 从 Step 23 开始，FreelyRSS 不再只有“schema 可回归”，也开始拥有“解析输入资产可回归”的边界：固定 feed 样本成为与迁移 SQL、宿主目录契约同级的长期验收资产。
- 把样本清单和样本文件一起放进 `feed-engine` 的测试目录，而不是新建仓库级 `fixtures/` 杂项目录，能持续强化“抓取/解析问题回到抓取/解析模块解决”的所有权边界。
- Step 24 的关键价值不是“把 schema 抄成 Rust struct”，而是把 `core-domain` 正式拆成“领域语义层”和“SQLite 存储翻译层”两类边界：前者负责 typed id、值对象、受控枚举与实体约束，后者才负责数据库专有表示。
- `core-domain/model` 与 `core-domain/sqlite/records.rs` 的分离，意味着 `bool`、JSON 文本、字符串枚举和未来可能出现的 SQLite 特定列编码不再直接泄漏给抓取引擎、桌面宿主或后续同步层；这些模块现在可以围绕稳定领域对象演进，而不是围绕 SQLite 原始列值演进。
- 把 `UserState.reading_progress` 校验放到 `UserState::validate()`，证明 FreelyRSS 已开始把“会影响业务语义的数据库约束”前移到领域层，而不是只在迁移 SQL 中被动兜底；这为后续抓取、状态更新和同步合并复用同一合法性规则打下基础。
- `ids.rs` 与 `primitives.rs` 把“共享命名体系”从文档和 TypeScript DTO 扩展到了 Rust 领域边界，说明阶段 3 之后 FreelyRSS 的核心词汇表已经同时在架构文档、SQLite schema、共享 TS 类型与共享 Rust 模型中收敛一致。
- `sqlite/records.rs` 中对 record/domain 往返和非法值拒绝的测试，意味着 Step 24 并不是把数据库测试替换成单纯的类型定义，而是新增了一层“持久化表示是否会误伤领域语义”的自动化验收边界；这会降低 Step 25 以后抓取写入和 Step 43 以后状态写入时的字段语义漂移风险。
- Step 25 的关键价值不是“给抓取模块补几个 trait”，而是把 `feed-engine` 正式收敛成一个拥有稳定公共 API 的独立引擎：调用方只看 `FeedFetcher` 与四段端口，不再需要知道抓取链路内部将来选什么网络库、解析库或存储实现。
- `crates/feed-engine/src/error.rs`、`model.rs`、`ports.rs` 与 `fetcher.rs` 的拆分，意味着 FreelyRSS 没有把 Step 25 继续堆进单一 `lib.rs`；抓取错误语义、阶段契约、端口边界和编排逻辑现在各自拥有独立文件与所有权。
- 让 `feed-engine` 在 Step 25 直接依赖 `freelyrss-core-domain` 的 typed id、URL 与时间值对象，而不是重新发明一套本地字符串类型，说明抓取引擎与领域层已经开始围绕同一套共享词汇表演进，但 `ParsedFeedDocument` 这类未持久化中间态仍明确留在 `feed-engine` 内部。
- `tests/fetcher_pipeline.rs` 把“无真实网络请求也能闭环”和“解析失败会在标准化之前短路”收敛为外部 API 级测试，意味着从 Step 25 起，FreelyRSS 已开始把抓取链路的编排正确性视为可回归的架构边界，而不是只等到真实 HTTP 与 parser 落地后再靠集成测试兜底。
- Step 26 进一步证明 `feed-engine` 的真实扩展位应当是“新增 parser / normalizer 默认实现文件”，而不是把格式判断、时间规范化或正文入口拼装回写到桌面宿主；这保持了桌面壳层继续只负责路径、窗口和命令接线。
- 让 `DefaultFeedParser` 直接依赖 `roxmltree` 与 `chrono`、同时继续输出 `ParsedFeedDocument`，说明底层 XML / 时间库选型已经被封装在 `feed-engine` 内部；未来若替换解析库，调用方和领域词汇表无需跟着重写。
- 把 RSS 2.0、RSS 0.91 与 Atom 1.0 的首批真实解析验收固定在 `tests/parser_fixtures.rs`，意味着 Step 27 以后新增 JSON Feed parser 时必须共享同一套阶段契约与样本驱动方式，而不是引入另一套只服务某一种格式的私有测试口径。

## 2026-04-18 ASCII Addendum

### Step 34 Architecture Insights

- Step 34 confirms that feed editing is a desktop-shell composition concern, not a `feed-engine` concern. Rename, custom label, update interval, icon, and manual refresh are all initiated from the left pane beside source selection.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local view state such as folder collapse and queue filters. Step 34 does not move edit state into routing or persistence primitives.
- The shell now resolves a full active-feed object separately from the subscription tree projection. This keeps tree rendering dependent on lightweight summary rows while the editor consumes a richer `FeedDto`.
- The writable mock repository is now the single writer for shell-side feed edits and refresh commands. React Query cache replacement continues to happen at full-snapshot granularity, which keeps Step 34 aligned with earlier shell composition steps.
- Manual refresh remains a shell command path that updates feed health facts and timestamps without pushing refresh semantics into shared UI primitives.
- No database schema changes were required for Step 34. The existing schema continues to describe source facts; this step only proves the desktop-shell interaction boundary before real command wiring is connected to SQLite.
- Verification matters at this boundary: the Step 34 regression test now checks save behavior, persistence across a reopen of the shell, and manual refresh health recovery, so the feature is protected as a shell-level contract rather than an ad hoc UI demo.

### Step 34 File Responsibilities

- `apps/desktop/src/features/reader-shell/components/feed-editor-card.tsx`: owns the feed editing form, draft state, validation, empty-state behavior, and save/refresh button dispatch for a concrete active feed.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: keeps the left pane as the composition point for quick views, subscription tree navigation, and the feed editor card without mixing queue or reader responsibilities into the source pane.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: wires route state, shell store state, React Query data, and Step 34 mutations together; resolves the active feed for the editor and keeps mutation cache updates at the shell boundary.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: acts as the shell-owned writable mock repository; stores editable feed facts, applies feed updates, performs manual refresh state changes, and rebuilds full shell snapshots.
- `apps/desktop/src/features/reader-shell/types.ts`: defines the shell composition contract, including the `feedDetails` map used to resolve a full active feed independently from summary/tree projections.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects the Step 34 shell contract by verifying edit/save flow, reopen persistence, and manual refresh health-state recovery.
- `apps/desktop/src/styles.css`: contains the shell-local presentation rules for the feed editor so feature-specific layout and status styling stay out of shared UI primitives.

### Step 34 Boundary Notes

- `packages/shared-types` remains the DTO boundary only.
- `packages/ui` remains a base primitive layer and does not absorb feed-editing workflow logic.
- `crates/feed-engine` still owns fetch and parse semantics, not user-authored source metadata edits.
- `crates/core-domain` and SQLite remain the future durable write boundary for real source edits; Step 34 only validates the shell interaction shape ahead of that integration.

## 2026-04-19 ASCII Addendum

### Step 35 Architecture Insights

- Step 35 confirms that OPML import is a desktop-shell source-organization concern, not a `feed-engine` concern and not a shared DTO concern.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local view state. OPML import introduces new structural source facts without moving selection state into persistence or routing primitives.
- The writable mock repository is now responsible for OPML parsing, duplicate handling, and structural mutation. The shell UI remains responsible only for accepting OPML text, dispatching the command, and rendering feedback.
- Lazy folder materialization is the key architectural decision in this step: folder outlines become shell folders only when a non-duplicate descendant feed is actually imported. This avoids creating empty imported groups when every descendant feed URL is already known.
- Duplicate handling is now defined at the feed URL boundary and applied against both existing shell source facts and repeated URLs inside the same OPML payload.
- Imported feeds currently enter the shell as `pending` source facts with zero articles. That keeps source import separate from fetch execution and preserves the existing queue and reader boundaries.
- No database schema changes were required for Step 35. The step validates import structure and interaction shape before later SQLite-backed OPML persistence and export work.

### Step 35 File Responsibilities

- `apps/desktop/src/features/reader-shell/components/opml-import-card.tsx`: owns OPML draft state, local validation, import button dispatch, and human-readable import summary and error presentation.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: remains the left-pane composition root and now hosts quick views, the subscription tree, the feed editor, and OPML import without mixing queue or reader concerns into the source pane.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: wires the OPML import mutation, import report state, and React Query snapshot replacement into the shell while preserving route ownership of the selected source and article.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: now acts as the shell-side OPML import engine for the mock environment; it parses XML, reconstructs nested folders, skips duplicate feed URLs, creates pending imported feeds, and rebuilds the full shell snapshot.
- `apps/desktop/src/features/reader-shell/types.ts`: extends the shell-local composition contract with `OpmlImportReport`, keeping import feedback typed without pushing shell-only state into shared DTOs.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 35 by verifying nested folder preservation, duplicate feed skipping, and import summary reporting.
- `apps/desktop/src/styles.css`: adds shell-local OPML import layout, textarea, and summary styling so import presentation remains outside shared UI primitives.

### Step 35 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; no OPML-specific shared contract was introduced yet.
- `packages/ui` remains a primitive layer and does not absorb OPML parsing or import workflow semantics.
- `crates/feed-engine` still owns remote feed fetch and parse semantics, not OPML source-list ingestion.
- `crates/core-domain` and SQLite remain the later durable boundary for real OPML import and export persistence; Step 35 only validates desktop-shell interaction and structural mutation shape.

## 2026-04-20 ASCII Addendum

### Step 36 Architecture Insights

- Step 36 confirms that OPML export is the mirror image of Step 35 import: it is a desktop-shell source-portability concern, not a `feed-engine` concern, not a shared DTO concern, and not yet a durable SQLite write concern.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local view state. OPML export adds a portable snapshot output without moving selection or expansion state into persistence or routing primitives.
- The shell-owned mock repository now owns both structural transforms at this boundary: OPML parsing for import and OPML serialization for export. That keeps the left pane as a command surface while the mock repository remains the single source of truth for shell-side source structure mutation and projection.
- Export intentionally serializes only folders that still contain feed descendants. This is the key Step 36 alignment with Step 35 lazy folder materialization: the round-trip contract is defined around source-bearing structure, not arbitrary empty groups.
- The round-trip regression is an architectural guardrail, not just a UI test. Exporting the current tree, resetting to an empty mock state, and re-importing the payload proves that the shell now owns a reversible OPML structure contract before real persistence wiring lands.
- No database schema changes were required for Step 36. The existing schema still describes source facts; this step only validates portable shell serialization ahead of later SQLite-backed import/export integration.

### Step 36 File Responsibilities

- `apps/desktop/src/features/reader-shell/components/opml-export-card.tsx`: owns OPML export presentation, read-only payload display, export summary rendering, and the generate button for shell-level OPML output.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: remains the left-pane composition root and now hosts quick views, the subscription tree, feed editing, OPML import, and OPML export without mixing queue or reader concerns into the source pane.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: wires the OPML export mutation and generated payload state into the shell while preserving route ownership of the selected source and article; it also invalidates stale export snapshots when import, edit, or refresh mutations change source facts.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: now acts as the shell-side OPML portability engine for the mock environment; it serializes the current folder/feed tree to OPML, keeps export aligned with importable structure, and still rebuilds full shell snapshots after source mutations.
- `apps/desktop/src/features/reader-shell/types.ts`: extends the shell-local composition contract with `OpmlExportReport`, keeping export-only summary state typed without pushing OPML workflow semantics into shared DTOs.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 36 by verifying OPML payload generation from the UI and export/import round-trip preservation of folder paths and feed paths.
- `apps/desktop/src/styles.css`: adds shell-local OPML export layout, textarea, and summary styling so export presentation remains outside shared UI primitives.
- `apps/desktop/src/features/reader-shell/components/opml-import-card.tsx`: continues to own OPML input and import feedback; in Step 36 it remains the complementary import boundary that the export path is intentionally designed to round-trip against.

### Step 36 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; no OPML export DTO was introduced because this step is shell-local workflow state rather than cross-app contract.
- `packages/ui` remains a primitive layer and does not absorb OPML serialization or copy/export workflow semantics.
- `crates/feed-engine` still owns remote feed fetch and parse semantics, not source-tree portability or OPML serialization.
- `crates/core-domain` and SQLite remain the later durable boundary for real OPML import/export persistence; Step 36 only validates desktop-shell interaction, reversible structure shape, and shell-side serialization.

## 2026-04-21 ASCII Addendum

### Step 37 Architecture Insights

- Step 37 confirms that article-list composition is now its own desktop-shell boundary. The queue no longer depends on scattered selector filters; it depends on one explicit article query assembled from route scope plus shell-owned view controls.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local queue controls such as search text, status preset, sort mode, and collapsed folders. Step 37 does not move those concerns into shared DTOs or persistence primitives.
- `packages/shared-query` is now part of the live shell composition path rather than only a preview helper. Feed routes, folder routes, quick views, search text, and sort order now all converge into the same query vocabulary.
- Adding `feedId` to the shared query AST is the key architectural decision in this step. It lets concrete source scope compile into the same query language as read-state and text filters, which keeps future SQLite execution aligned with the shell contract.
- Mock execution remains shell-local in this step. The new article-query module evaluates the shared-query definition against shell snapshots so the queue can prove the composition boundary before real SQLite-backed execution lands.
- No database schema changes were required for Step 37. The existing schema already contains the facts needed for later durable query execution; this step only validates the desktop-shell query shape and shared vocabulary.

### Step 37 File Responsibilities

- `apps/desktop/src/features/reader-shell/article-query.ts`: owns Step 37 query composition and execution; maps route source scope plus shell filters into a shared-query definition and evaluates that definition against mock article snapshots.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root; now resolves one article query object for the middle pane instead of chaining ad hoc selector filters in the route.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`: owns queue filter controls and now presents the unified article-query summary and serialized query payload alongside the visible article rows.
- `apps/desktop/src/features/reader-shell/selectors.ts`: continues to own source-tree projection, active-source lookup, selection fallback, and article-row formatting, but no longer owns article-query execution logic.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 37 by verifying that route scope, sort mode, search text, and status presets combine into one queue result flow.
- `packages/shared-query/src/ast.ts`: extends the shared query vocabulary with `feedId`, making source identity a first-class query field rather than a shell-only side channel.
- `packages/shared-query/src/schema.ts`: defines `feedId` field semantics and aliases so builders, validators, and future text-query inputs understand source-id predicates consistently.
- `packages/shared-query/src/sql-plan.ts`: compiles `feedId` predicates against the article table and widens `anyText` matching to include feed display titles, keeping SQL planning aligned with current queue-search behavior.
- `packages/shared-query/test/query.test.mjs`: regression coverage for the query package boundary; now verifies that `feedId` predicates compile directly into SQL plan parameters.

### Step 37 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 37 did not add query-specific DTO fields or push shell query state into cross-app contracts.
- `packages/ui` remains a primitive layer and does not absorb query construction, source-scope expansion, or mock execution logic.
- `crates/feed-engine` still owns fetch and parse semantics, not queue filtering or article-list query composition.
- `crates/core-domain` and SQLite remain the future durable execution boundary for article queries; Step 37 only validates the shell-side composition shape before that storage-backed integration.

## 2026-04-21 ASCII Addendum II

### Step 38 Architecture Insights

- Step 38 confirms that queue virtualization is a desktop-shell rendering concern, not a query-construction concern. The queue still consumes one explicit article query; the shell now only changes how that result set is mounted into DOM rows.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local queue controls and folder collapse state. Virtual scroll offset is intentionally ephemeral component state and is not promoted into routing, shared DTOs, or persistence primitives.
- Introducing a dedicated queue-virtualization helper is the key architectural decision in this step. Row estimates, overscan, and viewport fallback behavior are now centralized instead of being hidden inside `QueuePane`, which keeps virtualization policy explicit and testable.
- The dense queue fixture mode in the mock repository is an architectural guardrail rather than a product feature. It creates a shell-only proving ground for long-list rendering without changing the default shell snapshot that other steps rely on.
- Query reset behavior is now part of the shell contract: when the article query definition changes, the middle pane scroll position resets so the render window stays aligned with the new result set rather than preserving a stale deep offset from a previous route or filter state.
- No database schema changes were required for Step 38. The existing schema and shared query contract already describe the result set; this step only validates the desktop-shell rendering window ahead of future SQLite-backed large-queue execution.

### Step 38 File Responsibilities

- `apps/desktop/package.json`: wires the desktop shell to `@tanstack/react-virtual`, keeping virtualization as an app-local dependency rather than a workspace-wide primitive.
- `apps/desktop/src/features/reader-shell/queue-virtualization.ts`: owns queue virtualization policy, including row-height estimates, overscan, and viewport measurement fallback behavior for the shell queue.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`: owns Step 38 queue rendering; consumes the already-built article query result set, virtualizes row mounting, surfaces the render-window summary, and resets scroll on query changes.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root; now passes the query-reset signature into the queue pane and updates shell copy to describe virtualization rather than only query composition.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: adds a shell-test-only dense queue mode and generated article/detail fixtures so virtualization can be validated against a long list without changing the default shell snapshot.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 38 by verifying that the queue initially renders fewer rows than the full result set and that scrolling advances the mounted render window.
- `apps/desktop/src/styles.css`: contains shell-local queue virtualization presentation rules, including the virtual-list positioning layer and the rendered-row summary badge.

### Step 38 Boundary Notes

- `packages/shared-query` still owns article-query vocabulary and future SQL planning, but it does not own virtualization or DOM render-window policy.
- `packages/shared-types` remains the DTO boundary only; no virtualization-specific DTO fields were introduced.
- `packages/ui` remains a primitive layer and does not absorb queue-window management or scroll measurement semantics.
- `crates/feed-engine` still owns fetch and parse semantics, not queue rendering strategy.
- `crates/core-domain` and SQLite remain the future durable execution boundary for large queues; Step 38 only validates the shell-side rendering window before storage-backed pagination or streaming is introduced.

## 2026-04-21 ASCII Addendum III

### Step 39 Architecture Insights

- Step 39 confirms that the reading panel is now its own desktop-shell composition boundary. The right pane no longer acts as a generic detail placeholder; it now consumes one resolved article detail object and renders a stable reader base view from it.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local queue controls and folder collapse state. Step 39 does not move reading-panel state into routing, shared DTOs, or persistence primitives.
- Reusing the existing `ArticleDetailDto` without extending it is the key architectural decision in this step. The reader pane proves that the current DTO already carries enough facts for a baseline reading experience, so presentation can advance without inventing shell-only data contracts.
- Reader-body fallback handling is explicitly a shell presentation concern in this step. When extracted content is missing, the right pane now degrades to summary-plus-metadata without redefining article storage semantics or asking the mock repository for a second content shape.
- The Step 39 regression is an architectural guardrail, not only a UI smoke test. Verifying that article switches remove stale summary and body text protects the route-to-reader contract before later read-state mutations and content-mode toggles are introduced.
- No database schema changes were required for Step 39. The existing schema and DTO boundary already describe the article facts needed for the base reading panel; this step only validates shell-side rendering and article-detail consumption.

### Step 39 File Responsibilities

- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns the Step 39 reader base view, including article metadata formatting, summary rendering, extracted-body presentation, and the compact empty-body fallback.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now frames Step 39 explicitly; it still resolves the active article detail from route-backed queue selection and passes that single detail object into the reader pane.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 39 by verifying that selecting a different queue article updates the reader title, summary, and body while clearing stale content from the previously selected article.
- `apps/desktop/src/styles.css`: contains shell-local reader-panel layout and presentation rules for the new metadata cards, reader article sections, and compact body-fallback styling.

### Step 39 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 39 did not add reader-specific DTO fields or shell-only article contracts.
- `packages/shared-query` still owns article-query vocabulary and execution planning, but it does not own right-pane rendering or body fallback presentation.
- `packages/ui` remains a primitive layer and does not absorb article-detail formatting, summary/body sectioning, or reader-specific empty states.
- `crates/feed-engine` still owns fetch and parse semantics, not reading-panel presentation or article-switch behavior.
- `crates/core-domain` and SQLite remain the future durable boundary for read-state mutation, saved reader preferences, and content-mode persistence; Step 39 only validates the shell-side base reading view before that wiring lands.

## 2026-04-21 ASCII Addendum IV

### Step 40 Architecture Insights

- Step 40 confirms that reader content mode is a desktop-shell preference boundary, not a routing concern and not a shared DTO concern. The route still owns `sourceId` and `articleId`; the shell store now additionally owns the last-used content mode.
- Making raw versus extracted content an explicit toggle is the key architectural decision in this step. The reader no longer hides that choice behind an implicit fallback order, so later extraction work can evolve without changing the reader contract again.
- Persisting the latest reader-mode selection locally is intentionally a shell concern in this step. The preference is remembered for the next app session without promoting it into SQLite, shared contracts, or server-facing settings before those persistence boundaries are ready.
- Mock article details now carry visibly different `contentRaw` payloads so the shell can prove the mode boundary before Step 41 introduces real extraction-pipeline behavior. This is a shell-side fixture change, not a new durable article schema.
- Mode-specific empty states are also a presentation concern. When one representation is missing, the reader preserves metadata and summary while explaining the missing representation instead of silently falling through to the other mode.
- No database schema changes were required for Step 40. The existing schema and `ArticleDetailDto` already contain both content fields; this step only validates how the desktop shell exposes and remembers that choice.

### Step 40 File Responsibilities

- `apps/desktop/src/features/reader-shell/types.ts`: adds the shell-local `ReaderContentMode` contract so reader-mode state stays explicit without extending shared DTOs.
- `apps/desktop/src/features/reader-shell/state.ts`: owns the persisted reader-mode preference, keeps it inside the shell-store boundary, and exposes reset behavior that tests can use to simulate an app reopen without leaking preference state across suites.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now wires the store-backed content-mode preference into the reader pane while preserving route ownership of the selected source and article.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns the Step 40 reader-mode UI, including extracted-versus-original mode buttons, representation-specific rendering, and mode-specific empty states.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: now provides distinct raw-content fixtures for article details so the shell can prove that reader-mode switches change visible output before real extraction work lands.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 40 by verifying both mode switching and preservation of the latest reader-mode choice across a simulated app reopen.
- `apps/desktop/src/styles.css`: contains shell-local presentation rules for the reader-mode control group and the raw-content code-style block so this workflow does not leak into shared UI primitives.

### Step 40 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 40 did not add reader-mode fields to cross-app article contracts.
- `packages/shared-query` still owns article-query vocabulary and execution planning, but it does not own reader content-mode selection or right-pane representation policy.
- `packages/ui` remains a primitive layer and does not absorb persisted shell preferences, raw-content rendering semantics, or reader-mode workflow logic.
- `crates/feed-engine` and `crates/content-pipeline` still own fetch, parse, and future extraction semantics, not shell-level toggles or preference persistence.
- `crates/core-domain` and SQLite remain the future durable boundary for any storage-backed reader preferences or extraction-state policy; Step 40 only validates shell-local preference handling and presentation against existing article detail data.

## 2026-04-21 ASCII Addendum V

### Step 41 Architecture Insights

- Step 41 confirms that content extraction is now a real Rust-layer boundary rather than a reader-shell fixture concern. The desktop shell still presents extracted versus raw content, but it no longer defines how extraction should work.
- The key architectural decision in this step is to return one cohesive extraction result object: cleaned HTML, extracted text, thumbnail URL, language estimate, and word-count estimate. That keeps downstream storage and reader integration aligned on one pipeline contract instead of scattering secondary heuristics across multiple layers.
- Candidate selection and sanitization are both owned by `crates/content-pipeline`. `feed-engine` continues to own transport, format parsing, and feed normalization, but it does not decide which HTML subtree is the readable article body.
- Thumbnail discovery is also intentionally colocated with extraction. Open Graph and Twitter image metadata, plus first-content-image fallback, belong to the same content-understanding pass as body selection rather than to UI code or feed transport code.
- Language and word-count estimation now sit next to extracted-text generation. That is the right boundary because both values depend on the final readable text, not on raw transport payloads or shell display logic.
- No database schema changes were required for Step 41. The existing `Article` schema already has `content_extracted`, `thumbnail`, `language`, and `word_count`; this step only establishes the reusable generation path that can later feed those fields.

### Step 41 File Responsibilities

- `crates/content-pipeline/Cargo.toml`: declares the crate boundary and the minimal parsing, URL-resolution, and error-handling dependencies required for extraction work.
- `crates/content-pipeline/src/lib.rs`: defines the public surface of the content pipeline and re-exports the stable Step 41 contract and implementation entry points.
- `crates/content-pipeline/src/error.rs`: owns crate-local failure semantics for invalid or unresolvable URLs encountered during extraction.
- `crates/content-pipeline/src/model.rs`: defines the pipeline input and output contracts so later feed, storage, or sync integration can consume one explicit result shape.
- `crates/content-pipeline/src/sanitize.rs`: owns HTML cleanup helpers, including block stripping, wrapper removal, unsafe-attribute removal, comment removal, and whitespace normalization.
- `crates/content-pipeline/src/extraction.rs`: owns Step 41 extraction behavior end to end, including candidate scoring, readable-text extraction, thumbnail discovery, language estimation, word counting, and crate-level regression tests.

### Step 41 Boundary Notes

- `apps/desktop` still owns reader presentation, content-mode toggles, and local UI preferences; it does not own extraction heuristics or cleaned-body generation.
- `packages/shared-types` remains the DTO boundary only; Step 41 did not add pipeline-specific cross-app contracts.
- `packages/ui` remains a primitive layer and does not absorb content scoring, sanitization, thumbnail detection, or text-analysis logic.
- `crates/feed-engine` still owns remote fetch, feed-format parse, and normalization semantics; Step 41 does not move transport or feed-document concerns into `content-pipeline`.
- `crates/core-domain` and SQLite remain the later durable boundary that will persist extraction outputs into article records; Step 41 only establishes the reusable Rust processing contract ahead of that storage wiring.

## 2026-04-22 ASCII Addendum

### Step 42 Architecture Insights

- Step 42 confirms that attachment rendering is a desktop-shell presentation concern, not a parser concern and not a DTO-schema concern. The shell now makes attachment facts visible, but it still does not define how those facts are discovered or stored.
- The route still owns `sourceId` and `articleId`. The shell store still owns local queue controls, folder collapse state, theme tone, and reader content mode. Attachment visibility does not introduce a new route parameter or a new persisted shell preference.
- Reusing the existing `ArticleDetailDto.attachments` collection without extending the DTO is the key architectural decision in this step. The current cross-app contract already carries the facts needed for podcast enclosure and rich-media presentation, so the shell can advance without inventing reader-only transport models.
- Introducing a dedicated empty-feed fixture alongside the podcast fixture is an architectural guardrail, not extra product scope. It preserves the earlier stale-selection regression while allowing the podcast feed to become a real attachment-bearing source instead of an overloaded empty-state placeholder.
- Attachment labeling is intentionally a shell concern in this step. Terms like "podcast enclosure" and display formatting for duration, file size, cache state, and filenames belong to presentation, while MIME classification and attachment typing remain upstream responsibilities.
- No database schema changes were required for Step 42. The existing `Attachment` schema and `ArticleDetailDto` boundary already describe audio, image, video, and generic file metadata; this step only validates how those facts are surfaced in the reader.

### Step 42 File Responsibilities

- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns Step 42 attachment presentation, including type-specific labels, size and duration formatting, cache-state display, and the reader-side enclosure card layout.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns the Step 42 shell fixtures, including the podcast article detail with audio and image attachments plus the separate empty feed used to keep stale-route coverage intact.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now frames Step 42 explicitly in shell-level copy while continuing to pass one resolved `ArticleDetailDto` into the reader pane.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 42 by verifying that selecting the podcast feed exposes audio enclosure metadata and companion artwork metadata in the reading panel, while existing empty-route and OPML regressions stay valid.
- `apps/desktop/src/styles.css`: contains shell-local attachment-card presentation rules, including attachment section layout, badge styling, and responsive attachment fact grids.

### Step 42 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 42 did not add attachment-display-specific fields or podcast-only contracts.
- `packages/shared-query` still owns article-query vocabulary and execution planning, but it does not own attachment card rendering, enclosure naming, or file-size formatting.
- `packages/ui` remains a primitive layer and does not absorb attachment semantics, podcast presentation rules, or shell-specific empty-feed fixtures.
- `crates/feed-engine` still owns feed-level enclosure discovery, attachment typing, and normalized persistence inputs; Step 42 does not move parsing or classification logic into the shell.
- `crates/content-pipeline` still owns cleaned-body extraction and text-derived metadata, not reader attachment rendering.
- `crates/core-domain` and SQLite remain the durable boundary for attachment records and later article-state mutations; Step 42 only validates shell-side consumption of already-available attachment facts.

## 2026-04-22 ASCII Addendum II

### Step 43 Architecture Insights

- Step 43 confirms that article-state mutation is a desktop-shell command concern before it becomes a durable storage concern. The reader can now write state, but it still does so through a shell-owned mutation path rather than directly through SQLite or Rust domain services.
- The route still owns `sourceId` and `articleId`. The shell store still owns only local queue controls, folder collapse state, theme tone, and reader content mode. Article-state writes do not promote read-state or progress into route params or shell-store persistence.
- Keeping one shell-owned article-state mutation path in `mock-data.ts` is the key architectural decision in this step. The same command now synchronizes article-list items and article-detail state so query-driven queue results, quick views, and reader facts update from one snapshot instead of splitting across separate local copies.
- Read-state normalization is also intentionally centralized in the mock repository boundary. Progress changes now imply coherent `readState` transitions (`0%` => unread, partial => reading, `100%` => read) instead of making the reader pane invent those rules ad hoc.
- The reader pane remains a consumer plus command issuer. It renders state summaries and exposes controls, but it does not become the source of truth for unread counts, quick-view metrics, or queue filtering behavior.
- No database schema changes were required for Step 43. The existing `UserState` schema already covers `read_state`, `starred`, `liked`, `importance`, `read_later`, `reading_progress`, and `last_opened_at`; this step only validates the shell-side mutation flow ahead of later SQLite-backed persistence wiring.

### Step 43 File Responsibilities

- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns the Step 43 shell-side mutation command, including state normalization, list/detail synchronization, snapshot rebuilding, and the corrected baseline fixture for `article-window-behavior`.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now wires the article-state mutation command into React Query so state writes replace the current shell snapshot without changing route ownership.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns the Step 43 state-control UI, visible reader-side state summaries, and mutation-triggering buttons for read state, saved-state toggles, importance, and reading progress.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 43 by verifying route reconciliation when an unread-queue article becomes read and by verifying that mutated state survives an app reopen within the mock shell.
- `apps/desktop/src/styles.css`: contains shell-local presentation rules for the new reader state-control section, state summary card, progress button layout, and mutation error styling.

### Step 43 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 43 did not add mutation-command DTOs or shell-only state fields.
- `packages/shared-query` still owns query vocabulary and future SQL planning, but it does not own state-write semantics. Step 43 only proves that changed article state can flow back through the existing query composition boundary.
- `packages/ui` remains a primitive layer and does not absorb article-state policy, progress normalization, or queue-reconciliation rules.
- `crates/feed-engine` and `crates/content-pipeline` still own fetch, parse, extraction, and metadata derivation semantics; Step 43 does not move article-state writes into those Rust layers.
- `crates/core-domain` and SQLite remain the future durable boundary for `UserState` writes. Step 43 only validates the shell-side command shape and its immediate UI/query echo before storage-backed persistence is introduced.

## 2026-04-22 ASCII Addendum III

### Step 44 Architecture Insights

- Step 44 confirms that keyboard reading flow is a desktop-shell interaction concern, not a routing-schema concern and not a DTO concern. The route still owns `sourceId` and `articleId`; the shell now additionally owns how focused panes interpret reading commands.
- The key architectural decision in this step is to bind reading commands to focused landmarks instead of every descendant control. Queue and reader regions act as explicit keyboard command scopes, which preserves native button and input behavior while still enabling a full keyboard workflow.
- Step 44 intentionally does not introduce a second queue cursor model. Keyboard movement still updates the same route-backed active article that powers queue highlighting and reader detail resolution, so there is no hidden shell-only "selected but unopened" article state to reconcile later.
- Enter is treated as a focus-transfer boundary, not as a new data mutation. The queue already selects the active article through the existing route contract, so Step 44 only needs to move keyboard focus into the reader rather than inventing a second article-open command surface.
- Keyboard-triggered read, star, and read-later actions deliberately reuse the Step 43 shell mutation path. That keeps queue counts, quick views, reader facts, and route reconciliation aligned on one snapshot update boundary instead of splitting pointer-driven and keyboard-driven writes.
- No database schema changes were required for Step 44. The existing `UserState` schema and article DTOs already carry the facts needed for keyboard actions; this step only validates pane-scoped command routing on top of the current shell state model.

### Step 44 File Responsibilities

- `apps/desktop/src/features/reader-shell/accessibility.ts`: now owns the full shell-level shortcut catalog, including both landmark shortcuts and pane-scoped reading-flow commands, so keyboard facts live in one reusable module.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now also owns Step 44 keyboard command routing, including focused-pane detection, article movement, reader entry, and keyboard-triggered state writes via the existing mutation boundary.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: still owns reader presentation and pointer-driven state controls, and now explicitly documents that keyboard commands land on the same shell-side mutation boundary rather than bypassing the reader contract.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 44 by verifying a keyboard-only reading path from queue focus through reader focus, read-state mutation, and subsequent article movement.

### Step 44 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 44 did not add keyboard-command DTOs, queue-cursor fields, or reader-only route state.
- `packages/shared-query` still owns article-query vocabulary and execution planning, but it does not own pane focus policy, keyboard command routing, or reader-entry semantics.
- `packages/ui` remains a primitive layer and does not absorb shell shortcut catalogs, focused-pane command scopes, or article-movement policy.
- `crates/feed-engine` and `crates/content-pipeline` still own fetch, parse, extraction, and metadata derivation semantics; Step 44 does not move keyboard workflow logic into Rust layers.
- `crates/core-domain` and SQLite remain the future durable boundary for reader preferences and `UserState` persistence. Step 44 only validates shell-side keyboard routing and reuse of the current mutation path before storage-backed preference work lands.

## 2026-04-22 ASCII Addendum IV

### Step 45 Architecture Insights

- Step 45 confirms that reading presentation preferences are a desktop-shell concern before they become durable domain settings. Theme and typography can evolve quickly in the shell without forcing route, DTO, or database churn.
- The key architectural decision in this step is to keep one shell-owned preference store for both app-wide theme tone and reader-local typography controls. Content mode and reading presentation now coexist in the same shell boundary, but they still stay outside route state and shared article contracts.
- `ThemeRoot` owns app-wide tone token application, while `ReaderPane` owns the reader-specific control surface and presentation contract. That split prevents every reader component from reinventing theme logic while still keeping font, spacing, and margin policy out of shared primitives.
- CSS custom properties and explicit reader data attributes are the rendering contract for this step. The reader article now exposes font, scale, line-height, margin, and tone choices in one stable presentation boundary that tests and future reader work can observe directly.
- Adding daylight support is intentionally a theme-infrastructure change, not a reader DTO change. The correct boundary is shared UI theme tokens plus shell-local styles, not new fields on `ArticleDetailDto` or article records.
- No database schema changes were required for Step 45. The existing schema remains unchanged because reading presentation preferences are still shell-local and are not yet promoted into SQLite-backed user settings.

### Step 45 File Responsibilities

- `apps/desktop/src/features/reader-shell/types.ts`: defines the Step 45 theme and typography preference vocabulary so route, store, and reader components share explicit names without inventing new DTO fields.
- `apps/desktop/src/features/reader-shell/state.ts`: owns Step 45 local preference persistence, including daylight/midnight fallback handling for the high-contrast shortcut, coexistence with reader content-mode persistence, and reset behavior for simulated app reopens.
- `apps/desktop/src/features/reader-shell/accessibility.ts`: continues to own shell shortcut facts and now clarifies that the contrast shortcut is a theme concern rather than a generic reader-mode concern.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now threads persisted reading presentation settings from the store into the header, `ThemeRoot`, and reader pane without changing route ownership.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns Step 45 reading environment UI, the explicit setting controls, and the data-attribute-driven reader presentation contract applied to the active article.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 45 by verifying presentation-setting persistence across a simulated app reopen and by confirming that high-contrast theme changes do not hide extracted reader text.
- `apps/desktop/src/styles.css`: contains shell-local presentation rules for Step 45, including theme-aware surface usage and reader typography, spacing, and margin variables.
- `packages/ui/src/components/theme-root.tsx`: extends the shared theme boundary so the desktop shell can select `daylight`, `midnight`, or `high-contrast` tone through one primitive wrapper.
- `packages/ui/src/theme.css`: owns cross-shell tone tokens and tone-aware surface variables that make daylight and high-contrast support available to existing primitives without introducing reader-specific logic into the shared UI package.

### Step 45 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 45 did not add theme, font, or layout fields to article contracts.
- `packages/shared-query` still owns article-query vocabulary and execution planning, but it does not own reader presentation preferences or theme selection.
- `packages/ui` now owns reusable tone primitives and token surfaces for daylight, midnight, and high contrast, but it still does not own persistence of reader preferences or article-layout policy.
- `crates/feed-engine` and `crates/content-pipeline` still own fetch, parse, extraction, and metadata derivation semantics; Step 45 does not move presentation preferences into Rust layers.
- `crates/core-domain` and SQLite remain the future durable boundary for any storage-backed reader preferences. Step 45 only validates shell-local preference handling, shared theme-token consumption, and reader-side rendering against the existing article detail contract.

## 2026-04-22 ASCII Addendum V

### Step 46 Architecture Insights

- Step 46 confirms that annotation authoring is a desktop-shell interaction concern before it becomes durable storage. The reader can create highlights and notes, but it still does so through a shell-owned mutation path rather than SQLite or Rust domain services.
- The key architectural decision in this step is to serialize paragraph-scoped extracted-text anchors instead of raw DOM `Range` data. Anchors now depend on `contentMode`, `paragraphIndex`, `startOffset`, and `endOffset`, which is stable enough for shell replay without promoting browser-specific structures into shared contracts or database migrations.
- Selection capture and note drafting remain in `ReaderPane`, while mutation wiring remains in `reader-shell-route.tsx`. That split keeps route ownership unchanged: `sourceId` and `articleId` still live in the route, and the reader remains the interaction surface rather than becoming a query or persistence layer.
- Shell-side annotation validation is intentionally colocated with snapshot mutation in `mock-data.ts`. The mock repository now verifies that anchors target one extracted paragraph and that offsets match current extracted text before it writes the next shell snapshot.
- Annotation replay is also deliberately limited to extracted mode in this step. Step 46 proves stable shell-side anchoring against normalized extracted paragraphs before later work tackles durable cross-mode or cross-device replay semantics.
- No database schema changes were required for Step 46. The existing `Annotation` schema already covers `id`, `article_id`, `type`, `selected_text`, `anchor`, `note`, `color`, and `created_at`; this step only validates shell-side authoring and replay against that existing shape.

### Step 46 File Responsibilities

- `apps/desktop/src/features/reader-shell/types.ts`: defines the shell-local annotation authoring vocabulary, including `ReaderAnnotationKind`, `ReaderAnnotationAnchor`, and `CreateReaderAnnotationInput`.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns Step 46 mock annotation creation, extracted-paragraph anchor validation, default annotation colors, and snapshot updates that let created annotations survive a simulated app reopen.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now wires the Step 46 annotation mutation through React Query while keeping route ownership unchanged.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns Step 46 selection capture, pending-selection state, note drafting, highlight and note creation actions, inline annotation replay, and the annotation list UI.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 46 by verifying highlight and note creation on extracted text plus replay after reopening the mock shell.
- `apps/desktop/src/styles.css`: contains shell-local presentation rules for the Step 46 selection card, inline annotation replay, annotation cards, and note textarea.

### Step 46 Boundary Notes

- `packages/shared-types` remains the DTO boundary only; Step 46 did not add reader-selection structures, DOM-range payloads, or browser-specific anchor fields to shared contracts.
- `packages/shared-query` still owns query vocabulary and future parsing and validation work, but it does not own annotation capture, paragraph replay, or note-draft UI behavior.
- `packages/ui` remains a primitive layer and does not absorb annotation semantics, extracted-paragraph anchoring rules, or reader-side replay logic.
- `crates/feed-engine` and `crates/content-pipeline` still own fetch, parse, extraction, and metadata derivation semantics; Step 46 does not move selection anchoring or note creation into Rust layers.
- `crates/core-domain` and SQLite remain the future durable boundary for `Annotation` writes and cross-session replay policy. Step 46 only validates shell-side authoring and replay against the existing annotation schema.

## 2026-04-22 ASCII Addendum VI

### Step 47 Architecture Insights

- Step 47 confirms that query language semantics belong to `packages/shared-query`, not to any individual shell. The desktop queue can now type richer query text, but it still does so by consuming one shared parser and validator boundary instead of inventing shell-only filter grammar.
- The key architectural decision in this step is to separate parse failures from semantic validation issues. Text input now fails with input-range-aware `QueryTextParseError`, while serialized ASTs and query definitions still use path-based `QueryValidationError` issues; that keeps text UX and persisted-contract validation distinct without splitting the shared query vocabulary.
- The queue filter remains a shell-owned control, but it no longer owns parsing. Route scope, status presets, and sort mode are still composed in `article-query.ts`; the free-form filter text is now parsed into a `QueryNode` subtree that gets merged with those existing shell constraints.
- Ignoring queue-local sort directives is also intentional boundary control. The shared parser can understand sort tokens, but the desktop shell keeps sort ownership in its explicit sort buttons rather than letting free-form text silently override local view controls.
- `parseQueryDefinitionJson` is now a real structural boundary instead of a type cast. Saved rules, smart folders, and later persisted query payloads can fail fast on malformed JSON before they reach SQL planning or future Rust execution layers.
- No database schema changes were required for Step 47. The existing `Rule.conditions` and `SmartFolder.query_definition` JSON slots are still sufficient; this step only hardens how query definitions are parsed, validated, and surfaced in the shell.

### Step 47 File Responsibilities

- `packages/shared-query/src/errors.ts`: owns structured query parse and validation error models, including input-range-aware text parse errors and path-based semantic issues.
- `packages/shared-query/src/text-query.ts`: owns Step 47 text-query tokenization, grouped expression parsing, explicit operator support, inline negation handling, sort token capture, and location-aware parse failure boundaries.
- `packages/shared-query/src/serialize.ts`: owns Step 47 serialized query-definition parsing and structural JSON validation before normalized ASTs reach semantic validation.
- `packages/shared-query/src/index.ts`: remains the query package export surface and now exposes the new parse-error boundary alongside existing validation exports.
- `packages/shared-query/test/query.test.mjs`: protects Step 47 by verifying grouped text queries, explicit operators, positioned parse errors, and malformed JSON validation.
- `apps/desktop/src/features/reader-shell/article-query.ts`: keeps Step 37 query composition ownership and now additionally parses queue filter text through `shared-query`, merges valid query subtrees with route and status clauses, and surfaces parser feedback without moving execution into Rust or SQLite.
- `apps/desktop/src/features/reader-shell/types.ts`: extends the queue query summary contract so parser messages have an explicit shell-local presentation boundary.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`: owns Step 47 queue-filter UX copy and renders parser messages beside the compiled query preview.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: remains the shell composition root and now frames Step 47 explicitly in shell-level copy while still keeping route ownership limited to `sourceId` and `articleId`.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: protects Step 47 by verifying both valid grouped text filtering and invalid-query error handling in the live shell.
- `apps/desktop/src/styles.css`: contains shell-local presentation rules for parser messages in the queue query summary card.

### Step 47 Boundary Notes

- `packages/shared-types` remains DTO-only; Step 47 did not add saved-query DTOs or queue-filter parser state to shared contracts.
- `packages/shared-query` now owns both query vocabulary and parser and serialized-shape validation, but it still does not own shell route state, queue virtualization, or reader presentation.
- `packages/ui` remains a primitive layer and does not absorb query grammar, parser messaging policy, or shell query composition rules.
- `crates/rule-engine` is the next consumer boundary for the stricter query contract; Step 47 intentionally stops before moving rule evaluation or query execution into Rust.
- `crates/core-domain` and SQLite remain the future durable boundary for persisted rules, smart folders, and saved query definitions. Step 47 only validates the shared contract and the shell-side consumption path that sits in front of those later storage-backed layers.

## 2026-04-23 ASCII Addendum VII

### Step 48 Architecture Insights

- Step 48 confirms that persisted rule-condition semantics are a Rust consumer concern in `crates/rule-engine`, not a desktop-shell concern and not a `shared-types` concern. The same query JSON can now cross from JS validation into Rust execution without inventing a second rule grammar.
- The key architectural decision in this step is to parse and validate `Rule.conditions` inside `crates/rule-engine` against the existing shared-query contract rather than embedding opaque JSON lookups inside action code. That keeps persisted rule payloads fail-fast and gives later smart-folder and SQLite execution one reusable Rust boundary.
- `RuleMatchContext` is the execution boundary for this step. It gathers `Article`, optional `Feed`, optional `UserState`, article tags, and attachments into one evaluation snapshot so rule matching does not reach directly into SQLite, shell routes, or DTO adapters.
- Default unread / normal / false fallbacks are deliberate. Missing `UserState` does not prevent evaluation; the engine applies the same baseline semantics that later durable storage can materialize explicitly.
- Sort definitions are intentionally parsed but ignored during matching. Step 48 proves contract compatibility for persisted query definitions without prematurely coupling rule hits to ordering or action orchestration.
- No database schema changes were required for Step 48. The existing `Rule.conditions` JSON column remains sufficient; this step only makes Rust-side parsing and hit evaluation executable against current domain entities.

### Step 48 File Responsibilities

- `crates/rule-engine/Cargo.toml`: declares the Step 48 dependency boundary on `freelyrss-core-domain`, `serde_json`, `thiserror`, and `time`, making the crate capable of consuming persisted rule JSON and domain entities without reaching into desktop packages.
- `crates/rule-engine/src/lib.rs`: defines the public Step 48 export surface, re-exporting query-contract types, validation issues, matching entry points, and the rule-match context as the crate's stable API.
- `crates/rule-engine/src/error.rs`: owns Step 48 error modeling for path-based query-definition issues and crate-level invalid-definition reporting.
- `crates/rule-engine/src/query.rs`: owns Step 48 Rust-side query-definition parsing and validation, including structural JSON checks, field/operator enforcement, enum validation, and sort-shape validation for persisted rule payloads.
- `crates/rule-engine/src/engine.rs`: owns Step 48 rule-hit evaluation against `Article`, `Feed`, `UserState`, `Tag`, and `Attachment` snapshots, plus unit tests for nested matches, default fallbacks, and invalid-condition failures.

### Step 48 Boundary Notes

- `packages/shared-query` remains the source of query vocabulary and JS-side parse and validation behavior; Step 48 mirrors that contract in Rust only so persisted rule JSON can execute outside the desktop shell.
- `packages/shared-types` remains DTO-only and does not absorb Rust execution context, rule-match snapshots, or validation-error transport for this step.
- `apps/desktop` still does not execute persisted rules; queue filters remain shell-local consumers of shared-query while rule hits now live in Rust.
- `crates/rule-engine` now owns condition parsing and hit evaluation, but it still does not execute actions, write audit logs, or persist state changes.
- `crates/core-domain` and SQLite remain the durable boundary for `Rule` storage, future action writes, and rule-hit audit records. Step 48 only proves that persisted rule conditions can be executed coherently against current domain models.

## 2026-04-23 ASCII Addendum VIII

### Step 49 Architecture Insights

- Step 49 confirms that rule-action semantics belong in `crates/rule-engine` as a typed command-planning boundary before they become durable SQLite writes. The engine now interprets `Rule.actions`, but it still stops short of persistence.
- The key architectural decision in this step is to keep `Rule.actions` stored as JSON in `crates/core-domain` while parsing and validating that JSON inside `crates/rule-engine`. That preserves one persisted rule shape while preventing future store code from scattering ad hoc JSON lookups across SQLite write paths.
- `execute_rule` is the new orchestration boundary for this step. It validates the action payload, reuses the Step 48 condition-match path, and turns a matched rule into explicit commands for later consumers instead of mutating `UserState`, tags, folders, or cache files in place.
- Command planning is intentionally state-aware and idempotent. The engine compares desired actions against default/current `UserState`, existing article tags, current feed-folder placement, and attachment cache availability so already-satisfied rules collapse to an empty plan rather than noisy duplicate writes.
- Support for `{ "type": "noop" }` is an intentional compatibility boundary. Placeholder rules and older tests can remain valid while the action writer and audit trail are still being layered in.
- No database schema changes were required for Step 49. The existing `Rule.actions` JSON column remains sufficient because this step only formalizes parsing, validation, and command planning against current domain entities.

### Step 49 File Responsibilities

- `crates/rule-engine/src/actions.rs`: owns Step 49 action JSON parsing and validation, typed rule-action definitions, explicit command structures, state-aware command planning, and unit tests for supported and invalid action payloads.
- `crates/rule-engine/src/engine.rs`: remains the rule-match execution boundary and now also owns `execute_rule`, which combines enabled-rule gating, action-definition validation, condition matching, and command-plan generation without crossing into persistence.
- `crates/rule-engine/src/error.rs`: now owns both query-definition and action-definition validation issue models so downstream callers can distinguish malformed conditions from malformed action payloads.
- `crates/rule-engine/src/lib.rs`: extends the public rule-engine export surface with Step 49 action types, command-plan types, action-parser entry points, and the combined `execute_rule` helper.

### Step 49 Boundary Notes

- `packages/shared-query` remains the owner of query vocabulary and JS-side validation semantics; Step 49 does not move rule-action vocabulary into JS packages or DTO layers.
- `packages/shared-types` remains DTO-only and still does not absorb persisted rule-action command types, Rust execution context, or audit payloads.
- `apps/desktop` still does not execute persisted rules or consume rule-action command plans; desktop-shell boundaries remain unchanged in this step.
- `crates/core-domain` still stores `Rule.actions` as opaque persisted JSON and continues to own durable entities plus SQLite schema; it does not parse or execute rule actions in Step 49.
- SQLite and later automation/audit layers remain responsible for applying `RuleActionCommand`s and recording hit history. Step 49 only proves the command-planning contract that those later layers will consume.

## 2026-04-23 ASCII Addendum IX

### Step 50 Architecture Insights

- Step 50 confirms that rule-audit history is a two-layer boundary: `crates/rule-engine` owns evaluation snapshots plus planned-command serialization, while `crates/core-domain` and SQLite own durable storage and later applied-effects updates.
- The key architectural decision in this step is to serialize rule input context and planned commands exactly once, inside `crates/rule-engine`, and then persist those payloads as opaque JSON through `RuleAudit`. That prevents SQLite writers and later UI readers from re-parsing `Rule.conditions` or `Rule.actions`.
- `evaluate_rule_with_audit` is the new audit orchestration boundary. It records both matched and not-matched enabled evaluations, preserves the current `execute_rule()` convenience API, and gives later automation writers one canonical audit payload to persist beside command application.
- The new `RuleAudit` table is intentionally append-first with nullable `applied_effects`. Step 50 stores evaluation input, match result, command plan, and timestamp now, while later write paths can enrich the same row with durable applied facts instead of creating a second audit model.
- `RuleAuditStore` is also a deliberate separation. Feed/article persistence remains in `FeedStore`; automation history now has its own store so future action-application code can evolve without inflating fetch persistence with unrelated audit concerns.
- Database schema changes were required for Step 50. Schema `v7` adds `RuleAudit`, plus indexes for `rule_id + match_result + created_at` and `article_id + created_at`, so rule-history lookup becomes a first-class durable path instead of a planned future concern.

### Step 50 File Responsibilities

- `crates/rule-engine/src/audit.rs`: owns Step 50 audit-ready rule evaluation, input snapshot capture, planned-command JSON serialization, and conversion into durable `RuleAudit` entities.
- `crates/rule-engine/src/engine.rs`: keeps match evaluation and `execute_rule()` as the stable rule-engine convenience surface while delegating richer audit payload creation to `audit.rs`.
- `crates/rule-engine/src/lib.rs`: extends the public export surface with Step 50 audit types and helpers without removing the existing command-plan API.
- `crates/core-domain/src/model/ids.rs`: adds `RuleAuditId` so audit rows do not fall back to untyped string identifiers.
- `crates/core-domain/src/model/enums.rs`: adds `RuleAuditMatchResult` so durable audit rows and SQLite `CHECK` constraints share one controlled vocabulary.
- `crates/core-domain/src/model/automation.rs`: extends the automation domain with the durable `RuleAudit` entity and its persisted JSON payload fields.
- `crates/core-domain/src/sqlite/migrations.rs`: advances the embedded migration registry to schema `v7` and validates the new audit migration in the same ordered chain as prior schema steps.
- `crates/core-domain/src/sqlite/migrations/007_rule_audit_history.sql`: owns the Step 50 SQLite audit schema and history lookup indexes.
- `crates/core-domain/src/sqlite/records.rs`: translates `RuleAudit` rows to and from typed domain entities, including JSON payloads and the controlled match-result enum.
- `crates/core-domain/src/sqlite/rule_audit_store.rs`: owns Step 50 audit persistence APIs for insert, list-by-rule, and applied-effects updates.
- `crates/core-domain/src/sqlite/mod.rs`: protects Step 50 with migration-level schema and index assertions for `RuleAudit`, plus upgrade coverage from schema `v6` to `v7`.

### Step 50 Boundary Notes

- `packages/shared-query` still owns query vocabulary and validation semantics; Step 50 does not move saved-query meaning or rule grammar into SQLite stores.
- `packages/shared-types` remains DTO-only and still does not absorb `RuleAudit` transport contracts, audit snapshot payloads, or planned-command serialization.
- `apps/desktop` still does not read or render persisted rule history; Step 50 only establishes the Rust and SQLite boundary that later UI work will consume.
- `crates/rule-engine` now owns audit snapshot generation in addition to matching and command planning, but it still does not write SQLite rows or apply commands.
- `crates/core-domain` and SQLite now own durable audit history plus future applied-effects updates, but they still do not parse or execute `Rule.conditions` / `Rule.actions` themselves.

## 2026-04-24 ASCII Addendum X

### Step 51 Architecture Insights

- Step 51 confirms that `SmartFolder` is not a cosmetic left-pane grouping; it is the durable “saved query” boundary for FreelyRSS. The same query-definition contract now spans ad-hoc queue filters, persisted rule conditions, and persisted smart-folder scopes.
- The key architectural decision in this step is to keep smart-folder semantics inside the shared-query contract instead of encoding them into desktop-only route handlers. The desktop shell parses persisted `queryDefinition` JSON through `parseQueryDefinitionJson` and then composes it with shell-local filters, so saved scopes and ad-hoc filters remain one language.
- `SmartFolderStore` is intentionally separate from `FeedStore` and `RuleAuditStore`. Subscription persistence, automation audit history, and durable saved-query definitions are three different responsibilities and now have three different store boundaries.
- The left pane now contains three clearly different navigation classes: quick views, smart folders, and the subscription tree. Quick views remain shell-authored route presets, smart folders are durable saved queries, and the subscription tree remains the structural feed/folder hierarchy. Keeping those classes distinct prevents future sync, export, and UI editing flows from collapsing unlike concepts into one DTO shape.
- `SmartFolderDto` now carries lightweight counts (`unreadCount`, `articleCount`) for shell rendering, but the underlying durable meaning still lives in `queryDefinition` and optional `sortDefinition`. The counts are presentation summaries, not the source of truth.
- Step 51 did not require a new schema migration because the `SmartFolder` table already existed. This is an important signal that Stage 2 fixed the durable schema slot correctly, and Stage 5 can now attach real consumers to that slot without reworking SQLite shape.

### Step 51 File Responsibilities

- `packages/shared-types/src/automation.ts`: extends `SmartFolderDto` with `unreadCount` and `articleCount`, so smart-folder summaries can cross the shell boundary without inventing a desktop-only view model.
- `apps/desktop/src/features/reader-shell/types.ts`: adds `smartFolders` to `ReaderShellData`, making saved-query folders a first-class input to reader-shell composition rather than an inferred side list.
- `apps/desktop/src/features/reader-shell/selectors.ts`: teaches active-source resolution how to map a smart-folder id into the same `SourceRow` abstraction used by quick views, folders, and feeds.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: renders the new `Smart folders` section in the left pane, keeping quick views, smart folders, and the subscription tree visually and structurally distinct.
- `apps/desktop/src/features/reader-shell/article-query.ts`: parses persisted smart-folder query JSON through the shared-query contract and merges saved scopes with shell-local status/search filters before article execution.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: seeds representative smart folders, computes lightweight counts, and proves that desktop-shell navigation can consume saved-query definitions before the real backend wiring lands.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: passes smart-folder rows into `SourcePane`, preserving the route-backed navigation flow while extending the left pane with durable saved queries.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies that smart folders render in the left pane and that selecting one drives the queue through the persisted query-definition contract.
- `crates/core-domain/src/sqlite/smart_folder_store.rs`: introduces the dedicated SQLite persistence API for saving and listing smart folders, including unit coverage for round-tripping persisted saved-query definitions.
- `crates/core-domain/src/sqlite/mod.rs`: exports `SmartFolderStore`, making smart-folder persistence a public storage boundary alongside feed persistence and rule-audit persistence.

### Step 51 Boundary Notes

- `packages/shared-query` remains the only owner of query grammar, JSON parsing, normalization, and validation semantics; Step 51 adds another consumer, not another query language.
- `packages/shared-types` still transports DTOs only; it does not become the place where smart-folder query semantics are interpreted.
- `apps/desktop` now consumes smart folders as route-backed saved scopes, but it still uses mock data and does not yet edit or persist smart folders through real backend commands.
- `crates/core-domain` and SQLite now expose an explicit durable smart-folder store, but they still persist `query_definition` / `sort_definition` as validated JSON blobs rather than executing those queries themselves.
- The existing database schema already included the full Step 51 durable shape: `SmartFolder(id, name, query_definition, sort_definition)`. This step validates that the original schema choice was sufficient and that future sync/edit flows can build on the same table without another structural rewrite.

## 2026-04-24 ASCII Addendum XI

### Step 52 Architecture Insights

- Step 52 starts from the correct durable boundary: full-text search is now executable inside `crates/core-domain` / SQLite rather than being modeled as another desktop-shell-only filter pass.
- The key architectural decision in this increment is to reuse the existing `ArticleSearch` FTS5 table and its trigger-maintained `ArticleSearchSource` view. Search indexing remains a schema-level concern, while query execution now lives in a dedicated store instead of being spread across tests or ad hoc SQL strings.
- `ArticleSearchStore` is intentionally separate from `FeedStore`, `SmartFolderStore`, and `RuleAuditStore`. Feed ingestion, saved-query persistence, audit history, and search retrieval are four different storage responsibilities and now have four different store boundaries.
- The new search API exposes two read shapes because they serve different future consumers: `search_article_ids` is the narrow contract for queue retrieval and filtered article selection, while `search_with_snippets` is the presentation-oriented contract for UI preview text and hit highlighting.
- Feed scoping sits at the search-store boundary on purpose. Folder scopes and feed scopes should narrow the same FTS result set rather than forcing desktop code to intersect two unrelated result lists after the fact.
- This increment does not yet replace the desktop shell's mock article filtering. That is deliberate: Step 52 first establishes a tested durable search executor, then later wiring can attach article retrieval and UI state to the same boundary without bypassing SQLite.
- No schema migration was needed in this increment because schema `v4` already created `ArticleSearch` and kept it synchronized with `Article`, `Feed`, and `ArticleTag` changes. The new work validates that the existing schema slot was strong enough to support executable search retrieval later in Stage 6.

### Step 52 File Responsibilities

- `crates/core-domain/src/sqlite/article_search_store.rs`: introduces the dedicated SQLite FTS retrieval API, including ranked article-id lookup, snippet generation, feed-scope filtering, and unit tests for the Step 52 search boundary.
- `crates/core-domain/src/sqlite/mod.rs`: exports `ArticleSearchStore` and `ArticleSearchHit`, making full-text retrieval a public SQLite boundary alongside feed persistence, smart-folder persistence, and rule-audit history.
- `crates/core-domain/src/sqlite/migrations/004_article_search_fts.sql`: remains the durable schema source for `ArticleSearchSource` and `ArticleSearch`; this file's responsibility is now clearly the index/update pipeline that powers the new executable store.
- `crates/core-domain/src/sqlite/store.rs`: still owns feed/article ingest and dedup persistence only; Step 52 intentionally does not fold FTS lookup into this file so write-side and read-side responsibilities stay separated.
- `memory-bank/progress.md`: records that Stage 6 Step 52 has started from the durable SQLite boundary and captures the validated commands for the next developer.
- `memory-bank/architecture.md`: now documents the new search-store boundary and clarifies how each touched file contributes to the durable search pipeline.

### Step 52 Boundary Notes

- `packages/shared-query` remains the source of truth for unified filter semantics; Step 52 adds durable full-text execution, not a second filtering language.
- `packages/shared-types` remains DTO-only and still does not define storage-layer search plans or SQLite snippet contracts.
- `apps/desktop` still composes queue filters in memory for the mock shell, but future integration should call into the new durable search boundary instead of creating another shell-only search executor.
- `crates/core-domain` and SQLite now own executable FTS lookup and snippet generation; later Stage 6 work should build article-list retrieval on top of this store rather than issuing raw `ArticleSearch MATCH` queries from unrelated modules.
- The current durable search pipeline is now split cleanly by file: `004_article_search_fts.sql` maintains index content, `article_search_store.rs` executes indexed lookups, `mod.rs` exposes the boundary, and `store.rs` remains focused on feed/article writes.

## 2026-04-24 ASCII Addendum XII

### Step 52 Architecture Insights (continued)

- The Step 52 search boundary is now split into two durable read levels: narrow FTS primitives (`search_article_ids`, `search_with_snippets`) and a broader queue-oriented retrieval API (`list_articles`). This keeps later UI consumers from rebuilding article hydration logic outside SQLite.
- The key architectural decision in this increment is to combine FTS, feed scoping, reader-state filtering, and published-date sorting in one SQLite retrieval path. That prevents the desktop shell from having to intersect search ids, source scopes, and state filters in memory once durable data loading replaces mocks.
- `ArticleSearchReadFilter` and `ArticleSearchSort` deliberately mirror reader-shell intent without importing UI code into Rust. They are storage-bound enums describing durable retrieval semantics, not component props.
- `list_articles()` joins `Feed` and `UserState` because queue rendering needs durable display titles and state fallbacks at read time. This is still a search-store concern, not a DTO package concern and not a feed-write concern.
- Attachment counts are computed inside the retrieval query so later queue rendering can consume one storage response instead of issuing N follow-up attachment lookups.
- The search boundary still does not absorb smart-folder query parsing or shared-query grammar. That contract remains outside this file; `ArticleSearchStore` is the durable executor that later article-query orchestration should call after query semantics are resolved.

### Step 52 File Responsibilities (continued)

- `crates/core-domain/src/sqlite/article_search_store.rs`: now owns three distinct SQLite retrieval responsibilities for Stage 6 Step 52: ranked FTS ids, snippet previews, and queue-oriented article listing with feed/state joins.
- `crates/core-domain/src/sqlite/mod.rs`: continues to expose the public search-store boundary; no other SQLite module needs to know the details of FTS joins or queue-oriented search filtering.
- `crates/core-domain/src/sqlite/store.rs`: still remains write-oriented feed/article persistence code and intentionally does not absorb article-list search reads.
- `memory-bank/progress.md`: records that Step 52 has advanced from raw FTS primitives to durable queue-oriented article retrieval.
- `memory-bank/architecture.md`: now distinguishes the narrow and broad read contracts inside the SQLite search boundary so the next developer knows where desktop integration should attach.

### Step 52 Boundary Notes (continued)

- `packages/shared-query` still owns query meaning; this increment only broadens the durable retrieval layer that later query orchestration can target.
- `apps/desktop` still should not grow a second in-memory search executor. The intended next move is to translate shell query intent into this durable search boundary.
- `crates/core-domain/src/sqlite/article_search_store.rs` is now the single place for Stage 6 search retrieval semantics; future queue loading should build on it instead of issuing bespoke `Article`, `Feed`, and `UserState` joins elsewhere.

## 2026-04-24 ASCII Addendum XIII

### Step 52 Architecture Insights (desktop planning split)

- The desktop reader-shell search path is now explicitly split into planning and execution. This is an important architectural correction because durable SQLite execution should consume an already-planned query contract instead of duplicating route and filter interpretation inside multiple callers.
- `planReaderArticleQuery()` now owns route-scope resolution, smart-folder query parsing, shell filter merging, sort planning, parse-error reporting, and summary text generation. That makes it the desktop-side orchestration boundary for Step 52.
- `executeReaderArticleQuery()` remains as the temporary in-memory fallback executor for mock data. Keeping it exported but separate makes it clear that memory execution is an implementation detail, not the source of query meaning.
- `ReaderArticleQuery.executionMode` is a small but important contract addition. It lets the UI and later tests distinguish whether queue results came from mock in-memory evaluation or from a durable SQLite-backed executor without inferring that from environment or hidden state.
- This increment intentionally does not add Tauri command wiring yet. The architecture now has the correct seam: desktop planning on one side, SQLite retrieval on the other side, and a future bridge can connect them without reworking summary generation or queue semantics.

### Step 52 File Responsibilities (desktop planning split)

- `apps/desktop/src/features/reader-shell/article-query.ts`: now owns two separate responsibilities: query planning (`planReaderArticleQuery`) and the temporary mock-only execution path (`executeReaderArticleQuery`).
- `apps/desktop/src/features/reader-shell/types.ts`: now records execution provenance through `ReaderArticleQuery.executionMode`, giving later durable integration a stable UI-visible contract.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: continues to validate current reader-shell behavior against the preserved in-memory path after the planning/execution split.
- `memory-bank/progress.md`: records that Step 52 desktop work has been refactored to support durable execution wiring next.
- `memory-bank/architecture.md`: documents the new seam between desktop query planning and future durable SQLite execution.

### Step 52 Boundary Notes (desktop planning split)

- `packages/shared-query` still defines query semantics; desktop planning composes those semantics, but execution can now vary by boundary.
- `apps/desktop` currently contains both planning and fallback execution only because the shell still runs on mock data. The intended architecture is for durable execution to move behind a bridge while planning remains in the shell.
- `crates/core-domain` remains the durable executor for search/list retrieval; this increment makes it possible to attach that executor without cloning query-planning logic into the Rust bridge layer.

## 2026-04-24 ASCII Addendum XIV

### Step 52 Architecture Insights (bridge scaffold)

- The desktop side now has an explicit durable retrieval bridge module: `desktop-bridge.ts`. This is the correct architectural place for Tauri invocation concerns, keeping runtime detection and command transport out of route composition and query planning code.
- The key architectural decision in this increment is to land the bridge seam without cutting over the queue UI prematurely. That keeps Step 52 moving while protecting the already-verified shell behavior and avoiding accidental spillover into Step 53 presentation work.
- `desktop-bridge.ts` is intentionally transport-focused. It does not own query meaning, source-scope planning, or fallback memory execution; it only describes the future durable queue contract and how to call it when the Tauri runtime is available.
- The reverted route cutover was useful architectural feedback: queue execution cannot switch boundaries safely until source-scope mapping and backend command semantics are in place together. The bridge and the route seam now exist separately so the next increment can integrate them in one controlled change.
- Adding `@tauri-apps/api` at this stage is still Step 52 work because it enables the durable retrieval bridge only; it does not change article rendering, search-hit markup, or user-facing highlight behavior.

### Step 52 File Responsibilities (bridge scaffold)

- `apps/desktop/src/features/reader-shell/desktop-bridge.ts`: owns the frontend transport contract for future durable queue loading and handles Tauri-runtime availability checks.
- `apps/desktop/package.json`: now declares the Tauri API dependency required for Step 52 queue-bridge work.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: intentionally remains on the in-memory execution path in this increment; its responsibility is unchanged until the backend queue command is ready.
- `memory-bank/progress.md`: records that the Step 52 bridge scaffold exists, while route cutover is still pending.
- `memory-bank/architecture.md`: documents the new transport seam and the deliberate decision not to switch UI execution boundaries yet.

### Step 52 Boundary Notes (bridge scaffold)

- Still not Step 53: no snippet rendering, no search-hit highlight presentation, and no UI markup for matched terms were added in this increment.
- `apps/desktop/src/features/reader-shell/article-query.ts` remains the planning-plus-memory-execution boundary today.
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts` is now the future durable transport boundary.
- The next Step 52 change must add the backend command before the route consumes this bridge for real queue retrieval.

## 2026-04-24 ASCII Addendum XV

### Step 52 Architecture Insights (Tauri backend command)

- The desktop durable retrieval path is now complete on the backend side: shell query intent can cross the Tauri boundary and reach SQLite-backed article retrieval without leaking SQL or storage concerns into the React route layer.
- `reader_queue.rs` is intentionally a transport-and-mapping module. It translates desktop queue request semantics into `ArticleSearchStore` calls and then maps durable rows into the queue DTO shape expected by the current shell.
- The key architectural decision in this increment is to return only queue rows, not snippet/highlight payloads. That keeps the command strictly inside Step 52 and prevents accidental blending of retrieval work with Step 53 presentation concerns.
- The command currently computes only lightweight queue-facing derivations such as estimated reading minutes and default state fallbacks. Richer article-detail hydration remains outside this boundary.
- `storage.rs` still owns directory layout and database initialization, while `reader_queue.rs` now owns Step 52 queue retrieval transport. This keeps lifecycle/bootstrap concerns separated from query-serving concerns inside the Tauri backend.
- Exporting `ArticleSearchReadFilter` and `ArticleSearchSort` from `crates/core-domain/src/sqlite/mod.rs` is part of the durable boundary cleanup: Tauri command code now depends on stable storage enums instead of duplicating retrieval semantics locally.

### Step 52 File Responsibilities (Tauri backend command)

- `apps/desktop/src-tauri/src/reader_queue.rs`: owns the Step 52 Tauri queue command, request/response DTOs, durable retrieval mapping, and backend unit coverage.
- `apps/desktop/src-tauri/src/lib.rs`: registers the new queue command in the desktop app runtime.
- `apps/desktop/src-tauri/src/storage.rs`: continues to own storage initialization and now uses a schema-version-aware assertion in tests.
- `apps/desktop/src-tauri/Cargo.toml`: declares the backend command dependencies required by the new queue module.
- `crates/core-domain/src/sqlite/mod.rs`: now exports the durable search filter/sort enums that the Tauri queue command consumes.
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts`: now has a real backend command target available, even though the route has not switched over yet.

### Step 52 Boundary Notes (Tauri backend command)

- Still not Step 53: no snippet rendering, no highlighted terms, and no search-hit presentation model cross the Tauri boundary yet.
- The frontend bridge and backend command now both exist; only the route cutover remains before the queue can execute durably in the desktop shell.
- Because current validation is green with the route still on memory execution, the next Step 52 cutover should be small and test-focused rather than combining transport, backend mapping, and UI behavior changes all at once.

## 2026-04-24 ASCII Addendum XVI

### Step 52 Architecture Insights (queue cutover complete)

- Step 52 is now structurally complete. The query-planning boundary, frontend transport boundary, Tauri backend command boundary, and SQLite execution boundary are all connected end-to-end for queue retrieval.
- The cutover strategy is intentionally hybrid: the route prefers durable retrieval when available but keeps the in-memory executor as a safe fallback. This is a practical architecture for the current repository state because tests still run outside the Tauri runtime.
- `resolveFeedIdsForSource()` centralizes source-scope-to-feed-scope mapping. That keeps folder/feed scope logic inside selector utilities rather than scattering it across route effects and backend commands.
- The route-level durable loading effect is deliberately transport-oriented. It does not re-plan query semantics; it only takes already-planned shell state (`searchText`, `sortMode`, `statusFilter`, current source scope) and asks the bridge for rows.
- The UI still does not know anything about FTS snippets or match highlighting. This cleanly separates Step 52 retrieval completion from the future Step 53 presentation work.
- The resulting end-to-end Step 52 pipeline is now: query intent in `article-query.ts` and shell state → feed-scope resolution in `selectors.ts` → durable transport in `desktop-bridge.ts` → Tauri backend mapping in `reader_queue.rs` → SQLite execution in `ArticleSearchStore`.

### Step 52 File Responsibilities (queue cutover complete)

- `apps/desktop/src/features/reader-shell/selectors.ts`: now owns reusable feed-scope resolution for source ids via `resolveFeedIdsForSource()`.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: now chooses between durable queue rows and fallback memory rows, while preserving route selection and current shell behavior.
- `apps/desktop/src/features/reader-shell/desktop-bridge.ts`: now actively participates in runtime queue retrieval instead of existing only as a scaffold.
- `apps/desktop/src-tauri/src/reader_queue.rs`: continues to own the backend queue command used by the bridge.
- `crates/core-domain/src/sqlite/article_search_store.rs`: remains the durable executor for Step 52 article-list retrieval.
- `memory-bank/progress.md`: records that Step 52 is now complete and that Step 53 is the next milestone.
- `memory-bank/architecture.md`: now captures the final Step 52 end-to-end boundary split and the explicit non-overlap with Step 53 highlighting work.

### Step 52 Boundary Notes (queue cutover complete)

- Step 52 is complete, but Step 53 has not started in code: there is still no snippet rendering, no `<mark>` UI treatment, and no hit-highlighting view model in the desktop queue.
- The durable retrieval path is now live for the desktop runtime, while tests remain stable through the fallback path.
- Future Step 53 work should build on the now-complete Step 52 pipeline rather than revisiting queue retrieval wiring.

## 2026-04-25 ASCII Addendum XVII

### Step 53 Architecture Insights

- Step 53 lands in the correct layer: search-hit highlighting is now a presentation concern built on top of the already-finished Step 52 retrieval path, not a rewrite of queue execution.
- The key architectural decision in this increment is to split durable snippet generation from browser/mock fallback snippet generation. SQLite remains the source of truth for real FTS snippets, while the desktop shell gets a local fallback only so tests and mock mode can still exercise the UI.
- `searchSnippet` is now part of the queue DTO contract. This is a useful boundary correction because the queue needs search-hit preview text as queue data, not as an ad hoc string assembled inside React components.
- `ReaderArticleQuery.searchHighlightTerms` is intentionally desktop-local. It is derived from parsed shell search text for UI highlighting, but it is not a storage-layer search plan and it is not written back into shared-query or SQLite.
- Reader-side highlighting remains separate from annotation anchoring. Search hits are transient view decoration, while annotations are durable article-local marks; Step 53 preserves that distinction by layering search highlight spans over existing annotation replay instead of merging the concepts into one annotation model.
- No database schema migration was required for this step. The existing `ArticleSearch` FTS5 table already carried the indexed text needed for durable snippet generation, so Step 53 only broadens read contracts and UI presentation.

### Step 53 File Responsibilities

- `apps/desktop/src/features/reader-shell/search-highlighting.tsx`: owns desktop-local search presentation helpers, including positive content-term extraction from shared-query ASTs, fallback snippet building for mock execution, plain-text highlight range calculation, and safe queue-snippet mark rendering.
- `apps/desktop/src/features/reader-shell/article-query.ts`: still owns reader-shell query planning and fallback memory execution, and now also decorates memory queue rows with nullable `searchSnippet` data plus `searchHighlightTerms` for the reader surface.
- `apps/desktop/src/features/reader-shell/types.ts`: records the new `ReaderArticleQuery.searchHighlightTerms` contract so route logic and reader presentation can share one search-highlight source.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`: owns queue-side snippet presentation and prefers `searchSnippet` over plain summary text when a search hit is available.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: owns reader-side transient hit highlighting while preserving existing content-mode switching, annotation replay, and selection capture behavior.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: continues to own route composition and now passes planned search-highlight terms into the reader pane without changing queue-loading boundaries.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: now initializes `ArticleListItemDto.searchSnippet` as nullable shell data so fallback execution can decorate rows without violating the shared DTO shape.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: validates the user-visible Step 53 behavior that a body-only search term produces both a queue snippet and a reader highlight.
- `apps/desktop/src/styles.css`: contains the shell-local snippet and search-hit presentation rules for the queue and reader surfaces, keeping this UI treatment out of shared primitives.
- `apps/desktop/src-tauri/src/reader_queue.rs`: continues to own the desktop queue command boundary and now forwards durable `search_snippet` data from SQLite into the queue DTO returned to React.
- `crates/core-domain/src/sqlite/article_search_store.rs`: now owns four durable read responsibilities for search: ranked ids, snippet previews, queue-oriented article listing, and queue-row snippet generation through the same SQLite boundary.
- `packages/shared-types/src/article.ts`: defines the shared queue/article DTO contract and now explicitly includes nullable `searchSnippet` data for queue presentation consumers.
- `packages/ui/src/components/list.tsx`: keeps the generic list-row primitive reusable while now allowing rich summary content, so queue snippets do not require a second shell-only row component.

### Step 53 Boundary Notes

- `packages/shared-query` still owns search syntax and validation semantics; Step 53 only reads the parsed query and does not create a second highlighting grammar.
- `crates/core-domain` and SQLite now own durable snippet generation when the desktop runtime is available. React does not issue raw FTS snippet SQL and does not guess durable ranking behavior.
- `apps/desktop/src/features/reader-shell/search-highlighting.tsx` is deliberately not a second executor. Its job is limited to mock-mode fallback snippet construction and reader-side presentation, not queue filtering or durable retrieval.
- `packages/shared-types` remains DTO-only; it now carries snippet data, but it still does not define storage plans, query parsers, or UI algorithms.
- Step 53 still does not solve durable reader-detail loading. Queue rows can now show real snippets, but article detail hydration remains on the existing shell/mock path until a later milestone extends the desktop bridge beyond queue retrieval.

## 2026-04-27 ASCII Addendum XVIII

### Step 54 Architecture Insights

- Step 54 introduces two cache-policy boundaries on purpose: a desktop-wide runtime cache budget/default policy contract and a per-feed durable cache policy contract. They solve different problems and should not collapse into one settings surface or one table.
- `packages/shared-config` is now the owner of `cache.maxBytes` and `cache.defaultPolicy`. These values affect local runtime behavior and belong in app configuration, not in a new synced business table.
- `Feed.cache_policy` is durable source metadata. It belongs in shared DTOs, Rust domain models, and SQLite because it expresses how a specific subscription wants offline storage handled even if the global default changes later.
- Imported feeds seed their `cachePolicy` from the current global default, but they immediately become ordinary feed-owned metadata after creation. This keeps OPML import from becoming a second cache-policy system.
- The desktop shell now edits global cache defaults and per-feed cache policy through separate mutation paths. That keeps future Step 55 eviction logic from having to infer whether a change came from app configuration or feed metadata.
- Ordinary ingest intentionally does not overwrite an existing `Feed.cache_policy` during conflict updates. User-managed source policy must survive refresh and feed metadata updates.
- No eviction, attachment prefetch scheduling, or cache reclamation behavior ships in Step 54. This step only establishes the stable settings inputs that Step 55 should consume.

### Step 54 File Responsibilities

- `packages/shared-config/README.md`: documents the runtime cache configuration surface, including environment variable names and the intended split between desktop-wide defaults and durable per-feed policy.
- `packages/shared-config/src/defaults.js`: defines default runtime cache settings (`cache.maxBytes`, `cache.defaultPolicy`) for startup.
- `packages/shared-config/src/env.js`: parses `FREELYRSS_CACHE_MAX_BYTES` and `FREELYRSS_CACHE_DEFAULT_POLICY` from environment input into the shared config shape.
- `packages/shared-config/src/validate.js`: enforces that cache policy values stay inside the shared enum set and that cache limits are positive integers.
- `packages/shared-config/src/config.test.js`: verifies defaulting, environment overrides, and validation failures for the runtime cache configuration boundary.
- `packages/shared-types/src/enums.ts`: defines the cross-language `CachePolicy` enum values used by config, DTOs, desktop UI, and Rust.
- `packages/shared-types/src/feed.ts`: adds `FeedDto.cachePolicy`, making per-feed cache behavior part of the shared subscription contract.
- `packages/shared-types/src/index.ts`: re-exports the new cache policy contract so downstream packages consume one stable shared-types entry point.
- `crates/core-domain/src/model/enums.rs`: defines the Rust-side `CachePolicy` enum that mirrors the shared TypeScript contract.
- `crates/core-domain/src/model/feed.rs`: adds durable `cache_policy` to the `Feed` domain entity.
- `crates/core-domain/src/model/mod.rs`: re-exports `CachePolicy` so storage and ingest code depend on one domain enum source.
- `crates/core-domain/src/sqlite/migrations/008_feed_cache_policy.sql`: adds the durable SQLite schema field for per-feed cache policy.
- `crates/core-domain/src/sqlite/migrations.rs`: registers schema version 8 so the cache policy column becomes part of the normal upgrade flow.
- `crates/core-domain/src/sqlite/records.rs`: maps SQLite rows to and from the durable `CachePolicy` enum during feed record conversion.
- `crates/core-domain/src/sqlite/store.rs`: persists `cache_policy` on feed creation and preserves existing user-managed policy during feed upserts.
- `crates/core-domain/src/sqlite/mod.rs`: exports the updated SQLite boundary and verifies migration upgrade expectations through tests.
- `crates/feed-engine/src/sqlite_repository.rs`: seeds newly discovered feeds with `CachePolicy::Content` until a caller or later edit chooses another policy.
- `crates/rule-engine/src/audit.rs`: updates audit fixtures so rule-audit serialization continues to reflect the full `Feed` domain shape after the new field landed.
- `crates/rule-engine/src/engine.rs`: updates rule-engine fixtures and tests for the expanded `Feed` model while leaving cache policy semantics outside rule execution.
- `apps/desktop/src/features/reader-shell/cache-policy.ts`: centralizes user-facing policy labels plus bytes/megabytes conversion helpers for the Step 54 UI.
- `apps/desktop/src/features/reader-shell/components/cache-settings-card.tsx`: renders and validates desktop-wide cache defaults editing.
- `apps/desktop/src/features/reader-shell/components/feed-editor-card.tsx`: adds per-feed cache policy editing to the existing source metadata editor.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: composes the left-pane source tree, feed editor, OPML tools, and the new global cache settings surface without mixing their state models.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: stores mock `cacheSettings`, persists feed `cachePolicy`, and seeds imported feeds from the active default policy.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: keeps global cache settings saves separate from feed metadata saves and wires both through the shell route state.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies cache settings persistence, feed policy persistence, and imported-feed default seeding.
- `apps/desktop/src/features/reader-shell/types.ts`: adds the desktop-local `ReaderCacheSettings` contract and threads it through `ReaderShellData`.
- `apps/desktop/src/styles.css`: contains the Step 54 editor and settings-card presentation rules for the desktop shell.

### Step 54 Boundary Notes

- The database change for this step is intentionally narrow: `Feed` now includes `cache_policy TEXT NOT NULL DEFAULT 'content'`. Step 54 does not add a second settings table for global cache defaults.
- `packages/shared-config` owns the runtime-wide cache budget and default policy. Those values may come from environment or app-level settings and are not the durable source of truth for an individual feed after creation.
- `packages/shared-types`, `crates/core-domain`, and SQLite own per-feed cache policy as durable subscription metadata.
- `apps/desktop` currently exposes both configuration surfaces, but it still does not perform eviction, attachment prefetch, or cache cleanup. Future Step 55 logic should consume the existing contracts rather than introducing new state.
- `crates/feed-engine` and `crates/core-domain/src/sqlite/store.rs` together preserve a useful ownership rule: creation can seed a default cache policy, but ordinary ingest must not rewrite a policy the user already chose.
- `crates/rule-engine` is not a cache-policy owner in this step; its touched files only keep tests and audit fixtures aligned with the expanded `Feed` entity.

## 2026-04-27 ASCII Addendum XIX

### Step 55 Architecture Insights

- Step 55 keeps eviction logic in the correct local layer: cache cleanup is now a shell-visible behavior, but its planning rules still live outside React components and outside route composition.
- The key architectural decision in this increment is to separate cleanup planning from cleanup application. `cache-maintenance.ts` computes pressure, candidate ordering, and eviction reports; `mock-data.ts` applies those results to the current shell snapshot.
- Per-feed cache policy is now a hard cleanup boundary, not just descriptive metadata. If cached content contradicts a feed's durable `cachePolicy`, that cache is reclaimed before ordinary LRU pressure is considered.
- LRU protection is intentionally narrower than cache policy. Starred articles, read-later articles, and note-bearing articles are protected from budget-driven cleanup, but they are not allowed to override an explicit source-level policy mismatch.
- `ReaderShellData.cacheStatus` is desktop-local on purpose. It exposes cleanup state to the shell without promoting mock inventory details into shared DTO packages or Rust persistence before a durable cache engine exists.
- No database schema migration was required for this step. Step 55 consumes the existing Step 54 inputs and the already-present attachment cache path field instead of adding new SQLite tables prematurely.

### Step 55 File Responsibilities

- `apps/desktop/src/features/reader-shell/cache-maintenance.ts`: owns pure cache-pressure summarization, policy-mismatch detection, protected-article checks, ordered cleanup candidate planning, and cleanup report generation.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: now owns mock cache inventory state, applies planned evictions to the shell snapshot, clears attachment `localCachePath` values when attachment cache entries are reclaimed, and preserves the latest cleanup report.
- `apps/desktop/src/features/reader-shell/types.ts`: defines the desktop-local cache status, cleanup candidate, and cleanup report contracts shared by route composition, mock state, and cache-maintenance presentation.
- `apps/desktop/src/features/reader-shell/components/cache-maintenance-card.tsx`: renders budget status, protected-cache facts, ordered cleanup candidates, and the latest cleanup outcome in the left pane.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: composes the new cache-maintenance surface beside cache settings, feed editing, and OPML tools without merging their state models.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: owns mutation wiring for cache cleanup and keeps cleanup triggering separate from cleanup planning and mock-state application.
- `apps/desktop/src/features/reader-shell/cache-policy.ts`: now also provides shared byte-formatting helpers consumed by both cache settings and cache-maintenance presentation.
- `apps/desktop/src/features/reader-shell/cache-maintenance.test.ts`: validates policy-mismatch precedence and protected LRU behavior at the pure-planner boundary.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: validates the user-visible Step 55 flow that lowering the cache budget, running cleanup, and re-reading shell data preserves protected podcast media while reclaiming unprotected cache.
- `apps/desktop/src/styles.css`: contains the cache-maintenance card layout and candidate-list presentation rules, keeping this UI treatment local to the desktop shell.
- `memory-bank/progress.md`: records the completed Step 55 milestone, verification commands, and the new next-step handoff toward Markdown export.
- `memory-bank/architecture.md`: records the new cleanup-planning boundary, the explicit policy-vs-LRU precedence rule, and the file-level responsibility split for this increment.

### Step 55 Boundary Notes

- `packages/shared-config` continues to own the desktop-wide byte budget and default cache policy contract; Step 55 consumes those settings but does not redefine them.
- `packages/shared-types` and `crates/core-domain` still own durable per-feed cache policy metadata. Step 55 reads that boundary through the desktop shell; it does not move cleanup policy into a separate ad hoc enum set.
- `apps/desktop/src/features/reader-shell/cache-maintenance.ts` is not a downloader, prefetch scheduler, or durable storage engine. It only plans cleanup against the current cache inventory snapshot.
- `apps/desktop/src/features/reader-shell/mock-data.ts` is still a mock repository, not the future production cache backend. This step proves cleanup semantics and UI boundaries before durable cache execution arrives.
- `crates/core-domain`, SQLite, and `apps/desktop/src-tauri/src/storage.rs` remain unchanged in this increment. Durable cache reclamation in the real desktop runtime is still a later step.
- Step 55 intentionally stops before Step 56 export work: no Markdown generation, batch export pipeline, or HTML/PDF serialization logic was added here.

## 2026-04-29 ASCII Addendum XX

### Step 56 Architecture Insights

- Step 56 puts Markdown export in the correct shell-side boundary: export formatting is now a pure transformation from resolved article details into a portable document, not a responsibility of `reader-pane.tsx` or `reader-shell-route.tsx`.
- The export contract deliberately consumes `ArticleDetailDto` instead of queue rows. Queue rows are optimized for listing, while export needs the article body, feed metadata, tags, annotations, anchors, and attachment records.
- Single-article export and visible-queue export share the same formatter. The only difference is which article ids the route asks the mock repository to resolve before formatting.
- The generated Markdown is cache-neutral. It records attachment URLs and local cache paths as metadata, but it does not copy cache files, mutate cache state, or depend on the Step 55 cleanup planner.
- No database schema migration was required for this step. Existing article detail, annotation, attachment, and state DTOs already carry the information needed for Markdown export.
- Step 56 intentionally remains format-specific. Future HTML/PDF export should reuse the article selection and report pattern, but it should not turn `markdown-export.ts` into a mixed-format serializer.

### Step 56 File Responsibilities

- `apps/desktop/src/features/reader-shell/markdown-export.ts`: owns Markdown serialization, file-name generation, batch document assembly, metadata rendering, body fallback rules, annotation rendering, anchor rendering, attachment rendering, and export report construction.
- `apps/desktop/src/features/reader-shell/markdown-export.test.ts`: validates the pure export boundary for single-article and batch documents, including metadata, body text, annotations, and cached attachment references.
- `apps/desktop/src/features/reader-shell/components/markdown-export-card.tsx`: owns the reader-side Markdown export presentation surface, including the readonly payload textarea, report facts, selected-article command, visible-queue command, and export errors.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: composes the Markdown export card inside the reading panel and passes through export callbacks/results without formatting Markdown itself.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns mock export article resolution by id and delegates the actual Markdown document construction to `markdown-export.ts`.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: owns export mutation wiring, selects either the active article id or the current visible queue article ids, and keeps route state separate from export formatting.
- `apps/desktop/src/features/reader-shell/types.ts`: defines the desktop-local Markdown export mode, report, and result contracts used by the formatter, route, mock repository, and presentation component.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies the user-visible Step 56 flow for exporting the selected article and current visible queue from the reader shell.
- `memory-bank/progress.md`: records the completed Step 56 milestone, validation commands, and the Step 57 handoff.
- `memory-bank/architecture.md`: records the Step 56 export boundary, the cache-neutral rule, and the file-level responsibility split for future maintainers.

### Step 56 Boundary Notes

- `markdown-export.ts` does not fetch durable data. It only formats details already resolved by a repository boundary.
- `markdown-export.ts` does not write files. It returns a generated filename and Markdown payload so later desktop filesystem work can decide how and where to persist artifacts.
- `components/markdown-export-card.tsx` does not inspect DTO internals beyond showing the returned result. That keeps UI concerns separate from export semantics.
- `reader-shell-route.tsx` remains a composition layer. It chooses single vs. batch ids and triggers the mutation, but it does not build Markdown strings.
- Step 57 should add HTML/PDF-specific formatting or print boundaries beside this Markdown path, not inside it.

## 2026-04-29 ASCII Addendum XXI

### Step 57 Architecture Insights

- Step 57 adds HTML/PDF document export beside the existing Markdown exporter instead of widening `markdown-export.ts` into a mixed-format serializer.
- HTML export and PDF export share one new document formatter because both are HTML-shaped documents at this stage: HTML is the standalone saved document, while PDF is a print-ready HTML source intended for the future desktop print pipeline.
- The PDF path deliberately returns a `.pdf` target file name plus print source markup, not a binary PDF. Actual filesystem writing and native print invocation remain outside this step.
- The formatter consumes resolved `ArticleDetailDto` records plus the current reader presentation settings. It does not consume queue rows, query state, cache inventory, or route search params directly.
- The current reader content mode now matters for document export. Extracted mode emits readable paragraphs with annotation marks, while raw mode emits escaped source markup in a preformatted block.
- No database schema migration was required for this step. Article detail, annotation anchors, attachment metadata, and reader presentation settings already provide the necessary export input.

### Step 57 File Responsibilities

- `apps/desktop/src/features/reader-shell/html-pdf-export.ts`: owns HTML/PDF document serialization, filename generation, report construction, reader-presentation mapping, extracted/raw body fallback, annotation mark rendering, metadata rendering, and attachment rendering.
- `apps/desktop/src/features/reader-shell/document-export-styles.ts`: owns standalone document CSS, reader-presentation-to-CSS mapping, print CSS, and the PDF print-source visual treatment used by `html-pdf-export.ts`.
- `apps/desktop/src/features/reader-shell/html-pdf-export.test.ts`: validates the pure formatter boundary for standalone HTML and PDF print-source output, including metadata, content mode, annotations, attachments, print CSS, and file naming.
- `apps/desktop/src/features/reader-shell/components/document-export-card.tsx`: owns the reader-side HTML/PDF export presentation surface, including the readonly document-source textarea, format/mode/file report facts, selected-article commands, visible-queue commands, and export errors.
- `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`: composes the HTML/PDF export card beside the Markdown export card and passes through callbacks/results without formatting documents itself.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns mock article-detail resolution for document export and delegates actual HTML/PDF construction to `html-pdf-export.ts`.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: owns mutation wiring for document export, selects either the active article id or current visible queue ids, captures the current reader presentation settings, and passes those inputs to the mock repository.
- `apps/desktop/src/features/reader-shell/types.ts`: defines the desktop-local document export format, presentation, report, and result contracts shared by the formatter, route, mock repository, and presentation component.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies the user-visible Step 57 flow for selected-article HTML export and visible-queue PDF print-source preparation from the current reader mode.
- `apps/desktop/src/styles.css`: keeps document export summary layout resilient for longer report values such as generated filenames and reader presentation summaries.
- `memory-bank/progress.md`: records the completed Step 57 milestone, verification commands, and the Step 58 handoff.
- `memory-bank/architecture.md`: records the Step 57 format boundary, the print-source rule, and the file-level responsibility split for future maintainers.

### Step 57 Boundary Notes

- `html-pdf-export.ts` is a formatter, not a file writer, browser print invoker, durable storage adapter, or route layer.
- `markdown-export.ts` remains Markdown-only. The new HTML/PDF work reuses the same article selection pattern through `mock-data.ts`, but it does not reuse or mutate Markdown serialization internals.
- `components/document-export-card.tsx` displays returned output and report facts only. It does not inspect `ArticleDetailDto` internals or assemble HTML strings.
- `reader-shell-route.tsx` captures current reader settings as export input, but it still does not build document strings. This keeps route composition separate from format semantics.
- Future durable export work should add a Tauri filesystem/print boundary after these pure formatters, not move file-writing or native print logic into React components.
- Step 58 should implement batch operations through a separate mutation boundary. It should not reuse document export state as a general multi-select state store.

## 2026-04-30 ASCII Addendum XXII

### Step 58 Architecture Insights

- Step 58 keeps batch selection and batch execution deliberately separate. Selection is transient shell UI state in `state.ts`; execution is a pure mutation rule in `batch-operations.ts`; persistence is still represented by the mock repository in `mock-data.ts`.
- The selected article boundary is the current visible queue, not the current export set and not the whole local library. This keeps batch work aligned with what the user can inspect in the queue pane.
- Batch commands mutate list rows and resolved article details together so the queue and reader panel stay consistent after a mutation. Cache deletion also clears affected attachment `localCachePath` values in article details.
- Batch cache deletion reuses the shell cache inventory shape introduced by Step 55, but it does not run the Step 55 LRU planner. User-selected deletion is an explicit command, while cleanup remains a separate policy-driven operation.
- No database schema migration was required for this step. Step 58 proves desktop shell semantics and mock repository mutation behavior before adding a durable backend batch executor.
- Export modules remain untouched as mutation executors. Markdown, HTML, and PDF formatters still serialize documents only; they do not own multi-select state, tag changes, read-state changes, or cache deletion.

### Step 58 File Responsibilities

- `apps/desktop/src/features/reader-shell/batch-operations.ts`: owns pure batch command execution for selected article ids, including id normalization, unknown-id validation, mark-read updates, read-later updates, article-tag application, selected cache deletion, attachment cache-path clearing, and report construction.
- `apps/desktop/src/features/reader-shell/batch-operations.test.ts`: validates the pure batch boundary for selected-only read-state changes, tag application without duplicates, read-later updates, and selected cache deletion without affecting unselected cache entries.
- `apps/desktop/src/features/reader-shell/components/batch-operations-card.tsx`: renders the queue-side batch control surface, including selected/visible counts, select-all and clear-selection commands, state/tag/cache action buttons, latest result facts, and mutation errors.
- `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`: owns visible queue selection presentation by rendering row checkboxes, selected-row styling hooks, the batch operations card, and callbacks for toggling or selecting all visible articles.
- `apps/desktop/src/features/reader-shell/state.ts`: owns transient shell UI selection state for batch operations, including deduped selection setting, row toggling, clearing, and pruning selections when the visible queue changes.
- `apps/desktop/src/features/reader-shell/types.ts`: defines desktop-local batch action, command, input, report, and result contracts, and exposes article tags on `ReaderShellData` so the batch UI can offer valid article-tag commands.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: owns mock batch execution against the current shell snapshot, delegates mutation rules to `batch-operations.ts`, updates mock articles, article details, and cache inventory, then returns a fresh `ReaderShellData` snapshot plus the batch result.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: owns route-level mutation wiring, visible-queue id derivation, selection pruning, batch result state, error message extraction, and passing batch callbacks/data into `QueuePane`.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies the user-visible Step 58 flow: selecting queue rows, marking selected articles read, adding a tag to selected articles, deleting selected cache, and confirming unselected rows stay unchanged.
- `apps/desktop/src/styles.css`: contains the desktop shell presentation rules for queue selection controls, selected queue rows, batch summary grids, batch result grids, and responsive layout behavior.
- `memory-bank/progress.md`: records the completed Step 58 milestone, validation commands, and the Step 59 handoff.
- `memory-bank/architecture.md`: records the Step 58 selection/execution/repository boundary and file-level responsibility split for future maintainers.

### Step 58 Boundary Notes

- `batch-operations.ts` is not a durable storage adapter. It mutates passed-in shell snapshots and returns updated values; a later backend implementation should preserve this rule boundary instead of embedding batch semantics in transport code.
- `BatchOperationsCard` is not the future task status panel. It shows only the latest local batch result and direct mutation error; Step 59 should introduce a broader task-status surface for background work.
- `queue-pane.tsx` owns selection affordances, but it does not decide how a command changes article state, tags, or cache inventory.
- `reader-shell-route.tsx` coordinates mutations and query-cache replacement only. It should stay free of per-action mutation rules.
- `mock-data.ts` remains a mock repository. Durable Step 58 behavior still needs a future Tauri/Rust command path before production storage can execute these mutations.
- `markdown-export.ts`, `html-pdf-export.ts`, `document-export-styles.ts`, and `reader-pane.tsx` remain outside the batch execution path. Step 58 deliberately avoids reusing export selection or document result state as a generic batch state model.
- Step 59 should consume current feature-level errors and task results from dedicated boundaries rather than moving feed refresh, cache cleanup, export, and batch operation logic into one monolithic status component.

## 2026-04-30 ASCII Addendum XXIII

### Step 59 Architecture Insights

- Step 59 establishes task status as an observation boundary, not an execution boundary. Refresh, OPML import/export, Markdown export, HTML/PDF export, cache cleanup, and batch operations still execute through their existing feature-specific mutation paths.
- The key architectural decision is that task status entries are normalized from current shell facts. `task-status.ts` receives mutation/result facts and returns display-ready state; it does not store jobs, schedule work, retry automatically, or mutate repository data.
- Retry is intentionally contextual. The task panel exposes a retry button only where the current route still has enough information to safely rerun the same kind of command, such as refreshing the active feed or rerunning cleanup/export from the current reader context.
- Failure fixtures stay in the mock repository. The empty archive feed refresh now fails on purpose so the shell can verify user-visible recovery behavior without changing durable feed-engine semantics.
- No database schema migration was required for this step. Task status is transient desktop shell state and must not be mistaken for `SyncEvent`, rule audit history, or a future durable background job queue.
- Step 59 keeps existing cards narrow. `BatchOperationsCard`, export cards, `CacheMaintenanceCard`, and `FeedEditorCard` still present local command controls and local results; the new task panel is the cross-feature monitor.

### Step 59 File Responsibilities

- `apps/desktop/src/features/reader-shell/task-status.ts`: owns pure task-entry normalization, error-message extraction, task state priority, and aggregate task monitor summaries.
- `apps/desktop/src/features/reader-shell/task-status.test.ts`: validates the pure status boundary for running, failed, completed, and idle task states plus summary counts/headline behavior.
- `apps/desktop/src/features/reader-shell/components/task-status-panel.tsx`: renders the shell-level task monitor, task counts, task rows, failure details, recovery text, timestamps, and retry buttons where provided.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: composes task status inputs from existing React Query mutations and feature results, passes entries into the task panel, and wires contextual retry callbacks without owning feature-specific execution rules.
- `apps/desktop/src/features/reader-shell/types.ts`: defines desktop-local task status kind, state, entry, and summary contracts shared by the route, pure task-status helper, and presentation component.
- `apps/desktop/src/features/reader-shell/mock-data.ts`: keeps the mock refresh failure fixture for the empty archive feed and continues to own mock repository behavior for shell validation only.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: verifies the user-visible Step 59 flow: completed export status appears in the monitor, failed source refresh reports the reason, recovery guidance is visible, and retry remains available.
- `apps/desktop/src/styles.css`: contains the task monitor layout, status badges, status row states, and responsive shell sidecar layout.
- `memory-bank/progress.md`: records the completed Step 59 milestone, validation commands, and the Step 60 handoff.
- `memory-bank/architecture.md`: records the Step 59 observation boundary and file-level responsibility split for future maintainers.

### Step 59 Boundary Notes

- `task-status.ts` is not a durable scheduler, task executor, sync log, retry policy engine, or event-sourcing layer.
- `TaskStatusPanel` is not the owner of feature errors. It renders normalized observations and calls explicit route-provided retry callbacks only.
- `reader-shell-route.tsx` should remain a composition layer. It can observe mutation states, but it should not absorb the semantics of feed refresh, cache cleanup, document export, or batch mutation execution.
- Step 60 must define synchronization entities and event boundaries independently from Step 59 task status. React Query mutation state, panel rows, and mock failure fixtures are UI/runtime observations, not synchronization facts.

## 2026-04-30 ASCII Addendum XXIV

### Step 60 Architecture Insights

- Step 60 starts the sync phase by defining boundaries, not by starting transport. The new code classifies what will become `SyncEvent`, what stays local, and what must be represented as lazy encrypted blobs.
- `SyncEvent` is now explicitly reserved for user-portable changes: subscription organization, feed user metadata, tags, article tag membership, user reading state, annotations, rules, and smart folders.
- Device facts stay local. Feed health diagnostics, cache validators, local fetch timestamps, local cache file paths, FTS rows, rule audit internals, and Step 59 task-status observations do not cross devices through `SyncEvent`.
- Article body bytes and attachment bytes are neither local-only nor ordinary event payload. They are a lazy content boundary: events may reference encrypted blob records later, but payloads should not inline article bodies or attachment bytes.
- The sync server's minimum model is deliberately smaller than the client schema. `User`, `Device`, `SyncEvent`, `EncryptedBlob`, and `UserSettings` are enough for account/device identity, event exchange, encrypted object indexing, and protocol settings; they are not a remote copy of the local SQLite business tables.
- No database migration was required for Step 60. The existing local `SyncEvent` table already has the generic event slot; this step fixes the semantic contract that Step 61 must consume when generating records.

### Step 60 File Responsibilities

- `packages/shared-types/src/sync.ts`: owns cross-platform sync DTOs, event entity/change enums, payload shape, field-boundary constants, encrypted blob kinds, and service-side minimal entity DTOs.
- `packages/shared-types/src/ids.ts`: now also exposes `UserId` and `EncryptedBlobId`, keeping service identity and encrypted object references in the same shared id boundary as existing domain ids.
- `packages/shared-types/src/index.ts`: exports the new sync constants and DTO types so desktop, future Web/mobile clients, and the future sync server can consume the same vocabulary.
- `packages/shared-types/src/automation.ts`: remains responsible for rules, smart folders, and AI artifacts only; `SyncEventDto` moved out so sync protocol semantics no longer live in a broad automation file.
- `crates/sync-engine/src/lib.rs`: owns the pure Rust sync-boundary classifier for `SyncEvent`, local-only, and lazy encrypted blob decisions. Its tests prove the Step 60 acceptance cases without needing SQLite or a server.
- `memory-bank/progress.md`: records the completed Step 60 milestone, verification commands, and the Step 61 handoff.
- `memory-bank/architecture.md`: records the event field matrix, local-only facts, lazy blob rule, service-side minimal entities, and file-level responsibility split for future maintainers.

### Step 60 Boundary Notes

- `crates/sync-engine/src/lib.rs` does not write `SyncEvent` rows. Step 61 should add event generation at local mutation/write boundaries and reuse the classifier instead of duplicating field lists.
- `packages/shared-types/src/sync.ts` does not define the desktop runtime task system. Step 59 task rows remain UI observations and must not leak into sync payload contracts.
- `Article.content_raw` and `Article.content_extracted` should be lazy encrypted blobs in future sync work. Local body cache materialization or eviction is a device-local cache fact, not a cross-device state change.
- `Attachment.local_cache_path` remains local-only because it points at a device filesystem path. Attachment content can later be represented by encrypted blobs without syncing that path.
- Step 61 should begin with user state, annotation, tag relationship, and subscription structure writes. It should not start by syncing SQLite files, FTS rows, rule audit internals, or Step 59 task monitor data.

## 2026-05-09 ASCII Addendum XXV

### Step 61 Architecture Insights

- Step 61 turns the Step 60 synchronization classifier into a local persistence boundary. Classification still lives in `crates/sync-engine`, while durable event creation now happens in `crates/core-domain` beside the SQLite mutation that caused the event.
- The key rule is atomicity: a local user-state update, annotation creation, feed move, or tag relationship insert must commit with its `SyncEvent` row, or neither side should commit. This prevents later sync batches from seeing an event that does not match local state.
- `SyncEvent.payload` now uses the shared DTO shape of `changedFields` plus `value`, but the local Rust/SQLite boundary deliberately keeps snake_case field names because those are the schema and classifier terms. A later service/client DTO mapper can translate to camelCase if needed.
- Moving a subscription is modeled as `feed/update` with `folder_id` in `changedFields`, not as a special UI command. This keeps subscription organization changes in the same entity-level event vocabulary as future custom-name, sort-order, and cache-policy changes.
- Tag relationship changes are explicit attach/detach-style events. Article and feed tags should not be represented as ad hoc arrays inside unrelated article/feed payloads because relationship tables have their own identity and conflict behavior.
- No schema migration was required. The existing `SyncEvent` table already supplies the generic local event slot, and Step 61 only adds the code path that writes rows to it.
- Step 61 still does not implement sync batching, cursors, remote transport, encryption, lazy blob upload, or conflict resolution. Those belong to later Stage 8 steps that should consume generated `SyncEvent` rows.

### Step 61 File Responsibilities

- `crates/sync-engine/src/lib.rs`: owns the pure synchronization classifier. Step 61 extends it with feed update fields plus FeedTag attach/detach classification while preserving its no-SQLite, no-transport responsibility.
- `crates/core-domain/Cargo.toml`: adds the path dependency on `freelyrss-sync-engine` so core-domain storage code can consume classifier decisions instead of duplicating sync field lists.
- `crates/core-domain/src/sqlite/sync_event_store.rs`: owns local SQLite mutation plus event-log insertion for Step 61. It upserts `UserState`, inserts `Annotation`, moves `Feed.folder_id`, attaches article/feed tags, constructs `SyncEvent.payload`, inserts `SyncEvent`, and lists local events for verification.
- `crates/core-domain/src/sqlite/mod.rs`: exports `LocalSyncEventStore` and `SyncEventWriteContext` as part of the SQLite storage boundary, keeping callers away from the module's private helper functions.
- `crates/core-domain/src/sqlite/error.rs`: adds a `NonEventSyncBoundary` store error for the defensive case where a local write path accidentally asks the classifier for an operation that is not a sync event.
- `crates/core-domain/src/model/automation.rs`: continues to own the durable local `SyncEvent` domain shape. Step 61 did not move payload interpretation or event classification into this model file.
- `Cargo.lock`: records the root Rust workspace dependency graph after `freelyrss-core-domain` began depending on `freelyrss-sync-engine`.
- `apps/desktop/src-tauri/Cargo.lock`: records the desktop Tauri workspace dependency graph after the core-domain dependency change reached the desktop host build.
- `crates/feed-engine/src/parser/rss.rs`: remains the RSS parser for `channel/item`, `enclosure`, and `media:*` parsing. Step 61 only changed a guarded thumbnail branch to satisfy Rust 1.95 Clippy; no RSS behavior was intentionally changed.
- `memory-bank/progress.md`: records the completed Step 61 milestone, verification commands, environment notes, and the Step 62 handoff.
- `memory-bank/architecture.md`: records the Step 61 atomic local-event boundary and file-level responsibility split for future maintainers.

### Step 61 Boundary Notes

- `LocalSyncEventStore` is not a remote sync engine. It must not upload events, maintain remote cursors, encrypt blobs, or resolve conflicts.
- `crates/sync-engine` remains the correct place for event vocabulary and field-boundary decisions. New local write paths should add classifier variants first, then consume those decisions in storage code.
- `SyncEventWriteContext` supplies event id, device id, and timestamp from the caller. This keeps deterministic tests simple and leaves production id/time generation policy outside the storage helper.
- Feed diagnostics, fetch validators, FTS projections, rule audit internals, local cache paths, and task-status observations remain outside this event store.
- Stage 8 Step 62 should build on the generated `SyncEvent` rows by adding event batch packaging, cursor tracking, failure retry, and local replay primitives without changing the local event payload contract.

## 2026-05-10 ASCII Addendum XXVI

### Step 62 Architecture Insights

- Step 62 turns the generated `SyncEvent` row into a transport-neutral envelope, but it still does not start remote synchronization. The new sync-engine primitives can package, cursor, retry, and replay events without knowing whether those events came from SQLite, an HTTP API, WebDAV object storage, or a future encrypted batch file.
- The sync cursor is a high-water mark over `created_at + event id`. This keeps batching deterministic even when multiple events share the same timestamp, and it avoids using array offsets or local row numbers that would not survive across devices.
- Replay is deliberately idempotent by event id. Applying the same batch twice skips already-applied events, which is required before remote retries and at-least-once upload/download semantics can be safe.
- Retry state is pure policy state, not a scheduler. Step 62 records attempts, last error, and exhaustion, but it does not persist retry rows, calculate wall-clock backoff, or render task status.
- The replay state is a local convergence primitive, not the production SQLite writer. It proves event semantics and batch behavior before a later adapter materializes remote events into durable tables with conflict handling.
- No schema migration was required. Durable cursors, remote batch receipts, conflict records, encrypted blobs, and server-side upload/download tables remain later Stage 8 work.
- Step 63 should reuse the batch/cursor envelope shape for the sync server API instead of inventing a server-only event shape. The service still must not mirror the full local SQLite business schema.

### Step 62 File Responsibilities

- `crates/sync-engine/src/lib.rs`: remains the public sync-engine entrypoint. It now re-exports batch, replay, retry, and error primitives while preserving the existing field-boundary classifier and event classification API.
- `crates/sync-engine/src/batch.rs`: owns `SyncEventEnvelope`, `SyncEventKey`, `SyncCursor`, `SyncEventBatch`, and `package_event_batch`. It sorts events by `created_at + id`, filters after the provided cursor, caps batch size, advances `next_cursor`, and reports `has_more`. It does not read SQLite, upload events, or encrypt payloads.
- `crates/sync-engine/src/replay.rs`: owns `SyncReplayState`, `SyncReplayOutcome`, and `replay_event_batch`. It applies sync-event payloads into an in-memory replica state, handles entity upserts/deletes, relationship attach/detach, duplicate-event skipping, and replay cursor advancement. It is not a conflict resolver or a durable database adapter.
- `crates/sync-engine/src/retry.rs`: owns `RetryPolicy`, `RetryState`, `RetryDisposition`, `RetryFailureReport`, `record_sync_failure`, and `record_sync_success`. It models bounded retry decisions without storing jobs, sleeping, scheduling timers, or surfacing UI task rows.
- `crates/sync-engine/src/error.rs`: owns `SyncEngineError`, the shared error vocabulary for invalid batch sizes, invalid cursors, invalid payloads, missing relation fields, and unsupported replay events.
- `crates/sync-engine/Cargo.toml`: now declares `serde_json` because replay inspects `SyncEvent.payload.value` directly while staying independent from `freelyrss-core-domain`.
- `crates/core-domain/src/sqlite/sync_event_store.rs`: remains the SQLite local mutation plus event-log insertion boundary. Step 62 only extends its regression coverage so locally generated `SyncEvent` rows can be converted into `SyncEventEnvelope`, packaged, and replayed through the sync engine.
- `crates/core-domain/src/model/automation.rs`: still owns the durable local `SyncEvent` domain shape. Step 62 does not move storage-specific ids, JSON blobs, or SQLite record conversion into `crates/sync-engine`.
- `Cargo.lock`: records that the root Rust workspace's `freelyrss-sync-engine` package now explicitly depends on `serde_json`.
- `apps/desktop/src-tauri/Cargo.lock`: records the same sync-engine dependency edge for the desktop host dependency graph.
- `memory-bank/progress.md`: records the completed Step 62 milestone, verification commands, environment notes, and the Step 63 handoff.
- `memory-bank/architecture.md`: records the Step 62 batch/cursor/retry/replay boundaries and file-level responsibility split for future maintainers.

### Step 62 Boundary Notes

- `SyncEventEnvelope` is a sync transport envelope, not the local domain model. `core-domain` still owns validated local ids, `JsonBlob`, SQLite rows, and transactional writes.
- `package_event_batch` expects callers to provide events; it does not query storage and should stay reusable by SQLite, HTTP, and object-storage adapters.
- `SyncCursor` is not yet a durable remote cursor table. Step 63 can put the cursor in API DTOs; durable local/remote cursor persistence should be added only when the service/client exchange path exists.
- `replay_event_batch` currently proves deterministic convergence for sync-owned entities and relationship events. Conflict resolution, field-level timestamps, tombstones, encrypted blob download, and SQLite materialization remain separate later steps.
- Retry state must remain separate from Step 59 task status. Task panels observe user-facing operations; retry state belongs to sync transport attempts.
- The sync server in Step 63 should expose event upload/pull and encrypted object listing around this contract, not endpoint-level access to client tables such as `Article`, `UserState`, `Annotation`, or `Feed`.

## 2026-05-10 ASCII Addendum XXVII

### Step 63 Architecture Insights

- Step 63 introduces the remote sync server as a protocol boundary, not as a remote copy of the desktop database. The server accepts account/device metadata, sync event envelopes, cursors, and encrypted blob metadata only.
- The server API deliberately exposes `/v1/sync/events`, `/v1/sync/events/pull`, `/v1/sync/blobs`, and `/v1/devices`; it does not expose table-shaped routes such as `/v1/articles`, `/v1/feeds`, `/v1/annotations`, or `/v1/user-states`.
- Event pull uses the Step 62 `package_event_batch` high-water cursor semantics. The server stores events by user, converts API DTOs to `SyncEventEnvelope`, and delegates ordering/cursor movement to `crates/sync-engine`.
- Authentication is intentionally skeletal. The current login route issues in-memory bearer tokens for API validation and tests; later production auth can replace the backing implementation without changing the sync event route contract.
- Device registration is the first server-side identity boundary. Uploads must name a registered device owned by the authenticated user, and individual event envelopes must match the request device id.
- Encrypted blob handling is metadata-only. The server can list/register `EncryptedBlob` records, but it does not upload raw article bodies, attachment bytes, or local cache file paths.
- No server database schema migration was added. The current `SyncServerState` is an in-memory acceptance skeleton; PostgreSQL tables, S3-compatible object storage, durable cursors, and auth persistence belong to later sync-server hardening work.
- Step 64 should add conflict merge rules outside the temporary in-memory store. Conflict semantics need to be explicit sync-domain logic, not incidental behavior of map insertion order.

### Step 63 File Responsibilities

- `Cargo.toml`: adds `apps/sync-server` to the root Cargo workspace so repository Rust verification includes the remote sync API skeleton.
- `apps/sync-server/Cargo.toml`: declares the Rust/Axum sync server package, binary target, library target, and dependencies on Axum, Tokio, serde, chrono, thiserror, and `freelyrss-sync-engine`.
- `apps/sync-server/src/lib.rs`: exposes the server library entrypoint and keeps route construction reusable for tests and the binary.
- `apps/sync-server/src/main.rs`: provides the executable wrapper, reads `FREELYRSS_SYNC_BIND_ADDR`, binds the listener, and serves the Axum router with default in-memory state.
- `apps/sync-server/src/error.rs`: owns the API error vocabulary and HTTP/JSON error mapping for unauthorized, forbidden, bad request, conflict, and internal failures.
- `apps/sync-server/src/model.rs`: owns server API DTOs for login, users, devices, sync cursors, sync events, event upload/pull responses, encrypted blobs, and health responses. It also converts between API event DTOs and `SyncEventEnvelope`.
- `apps/sync-server/src/state.rs`: owns the current in-memory server state, token lookup, user/device maps, per-user event storage, per-user encrypted blob indexes, event entity validation, and delegation to `package_event_batch`.
- `apps/sync-server/src/routes.rs`: owns Axum route registration, bearer-token extraction, HTTP handlers, and Step 63 route tests covering login, device registration, empty pull, upload, pull, encrypted blob listing, missing business table routes, and rejection of business entities as sync events.
- `Cargo.lock`: records the root workspace dependency graph after adding the sync server and removes the duplicate `freelyrss-sync-engine` dependency block that prevented Cargo from parsing the lockfile.
- `memory-bank/progress.md`: records the completed Step 63 milestone, verification commands, Tauri CLI timeout note, and the Step 64 handoff.
- `memory-bank/architecture.md`: records the Step 63 remote protocol boundary and file-level responsibility split for future maintainers.

### Step 63 Boundary Notes

- `apps/sync-server` is not a local reader backend. Desktop, Web, and mobile clients should still materialize readable article state from their own local/client-side models.
- The sync server must not accept local-only facts as sync events. Feed diagnostics, fetch validators, FTS rows, rule audit internals, local cache paths, and task-status observations remain outside the remote event API.
- `SyncEventDto` JSON uses camelCase at the HTTP boundary, while existing local SQLite payload field names may remain snake_case until a dedicated mapper translates field vocabulary.
- Duplicate upload handling is idempotent by event id. This is a transport safety rule and should not be confused with conflict resolution.
- Future PostgreSQL and object-storage adapters should preserve the current route contract and state responsibilities instead of introducing server endpoints for full client business tables.

## 2026-05-10 ASCII Addendum XXVIII

### Step 64 Architecture Insights

- Step 64 makes conflict resolution an explicit sync-domain concern. The rules live in `crates/sync-engine`, not in `apps/sync-server/src/state.rs`, because the server skeleton is only a protocol/event exchange boundary and should not accidentally become the authority for readable business state.
- `merge.rs` is intentionally separate from `replay.rs`. Replay proves deterministic application and idempotence by event id; merge decides which concurrent values survive when multiple devices edited the same sync-owned facts.
- User state uses field-level clocks. Each field keeps the value from the newest `SyncEventKey(created_at + event_id)`, except `reading_progress`, which keeps the greatest valid progress in `0..=1` so a newer but lower progress event cannot move the user backward.
- Annotation merging is append-preserving. Concurrent highlights and notes with distinct annotation ids are retained side by side rather than collapsed into one article-level note.
- Tag membership is represented as explicit set operations. `FeedTag` and `ArticleTag` attach/detach events maintain relation sets with per-relation versions, so old attach events cannot undo newer detach decisions.
- Subscription organization remains event-driven instead of list-snapshot-driven. `Feed.folder_id`, `Feed.sort_order`, and other feed fields merge independently, which keeps feed movement and custom naming from overwriting each other.
- No database schema migration was added. The current merge state is an in-memory acceptance model for sync semantics; a later durable adapter can materialize the same rules into SQLite or a merge journal if product needs require it.
- Step 65 should layer encryption around event/blob transport without moving key handling into `merge.rs` or turning the sync server into a plaintext resolver.

### Step 64 File Responsibilities

- `crates/sync-engine/src/merge.rs`: owns Step 64 conflict merge primitives. It defines `SyncMergeState`, `MergedEntity`, `SyncMergeOutcome`, and `merge_event_batch`; tracks per-field versions, relation versions, applied event ids, and entity tombstones; validates reading progress; and tests user-state, annotation, tag, subscription-ordering, stale-event, and idempotence behavior.
- `crates/sync-engine/src/lib.rs`: re-exports the merge API next to batch, replay, and retry primitives so later sync clients can consume conflict rules without deep-linking into module internals.
- `crates/sync-engine/src/replay.rs`: remains the deterministic replay primitive. Step 64 does not change it because replay must stay useful for batch/idempotence verification without field-level conflict policy.
- `apps/sync-server/src/state.rs`: remains the temporary in-memory remote store for users, devices, sync events, and encrypted blob metadata. It should delegate event ordering to `package_event_batch` and must not absorb Step 64 conflict semantics.
- `memory-bank/progress.md`: records the completed Step 64 milestone, verification commands, build warning note, and Step 65 handoff.
- `memory-bank/architecture.md`: records the Step 64 conflict-resolution boundary and file-level responsibility split for future maintainers.

### Step 64 Boundary Notes

- `SyncMergeState` is not a production database adapter. It is a deterministic policy model that later storage code can use or mirror.
- Merge rules consume `SyncEventEnvelope` values and payload fields; they do not generate local `SyncEvent` rows, call HTTP routes, encrypt payloads, or persist cursors.
- Field-level clocks use event timestamps plus event ids because device-local row numbers and array offsets are not stable across devices.
- `reading_progress` intentionally differs from last-writer-wins fields. Progress should converge to the farthest valid read position rather than the most recently observed lower position.
- Entity tombstones exist only in merge state for delete ordering. They are not yet a durable cross-device deletion journal.

## 2026-05-10 ASCII Addendum XXIX

### Step 65 Architecture Insights

- Step 65 introduces encryption as a transport boundary around remote sync events, not as a replacement for local domain events. Local SQLite can still store clear `SyncEvent.payload` because the local database is the client-side authority; the remote API now only accepts ciphertext payload envelopes.
- Client-held key material lives in `crates/sync-engine`, not in the sync server. The server can validate event metadata, device ownership, entity type, change type, and encrypted envelope shape, but it cannot decrypt `read_state`, note text, annotation anchors, or rule payload values.
- AES-256-GCM authenticates event metadata as AAD. This means an attacker or buggy transport cannot move a ciphertext from one event/entity/device/timestamp to another without causing decryption failure on the client.
- Recovery is modeled as a client-side export/import kit. PBKDF2-HMAC-SHA256 derives a wrapping key from a recovery secret and salt, then wraps the 32-byte master key. The recovery secret and plaintext master key do not become server fields.
- The remote server now stores `EncryptedSyncEventEnvelope` values for events and existing `EncryptedBlobRecord` metadata for large objects. These are separate concerns: event payload ciphertext protects sync operations, while blob metadata indexes encrypted article bodies, attachments, event batches, and snapshots.
- Step 65 does not add keychain integration, object upload scheduling, WebDAV/Nextcloud storage, server-side durable persistence, or desktop settings UI. Those remain later adapters around the cryptographic and protocol boundary.
- No local database schema migration was required. The local `SyncEvent` table remains the source of generated event semantics; encryption is applied when preparing remote upload and reversed after remote download before replay/merge.

### Step 65 File Responsibilities

- `crates/sync-engine/Cargo.toml`: declares direct dependencies on `base64` and `ring` because the sync engine now owns event-payload encryption, authenticated decryption, key wrapping, and base64 transport encoding.
- `crates/sync-engine/src/encryption.rs`: owns Step 65 cryptographic primitives and tests. It defines client master keys, nonces, recovery salts, encrypted payload/event/batch structs, AES-256-GCM event encryption/decryption, encrypted event batching, PBKDF2 recovery-kit export, and recovery-kit restoration.
- `crates/sync-engine/src/error.rs`: extends the sync-engine error vocabulary with encryption, decryption, invalid crypto key, and invalid encrypted payload errors so callers do not fall back to stringly typed crypto failures.
- `crates/sync-engine/src/lib.rs`: re-exports the Step 65 encryption API next to batch, replay, retry, and merge primitives so sync clients can depend on one sync-engine public surface.
- `apps/sync-server/src/model.rs`: changes the remote event DTO from plaintext `payload` to `encryptedPayload`, adds the encrypted payload DTO, and converts between HTTP DTOs and `EncryptedSyncEventEnvelope`.
- `apps/sync-server/src/state.rs`: changes the in-memory event store from `SyncEventEnvelope` to `EncryptedSyncEventEnvelope`, validates encrypted payload envelope fields, keeps cursor movement over encrypted event metadata, and still rejects unsupported business entity types.
- `apps/sync-server/src/routes.rs`: updates route tests and fixtures to upload encrypted events, verify pulled server content does not include plaintext `read_state` or `read` values, and reject old plaintext payload submissions.
- `apps/sync-server/src/error.rs`: maps new sync-engine crypto errors to bad-request API responses where callers supplied invalid ciphertext, unsupported algorithms, or mismatched key metadata.
- `packages/shared-types/src/sync.ts`: adds `EncryptedSyncPayloadDto`, `EncryptedSyncEventDto`, and `MasterKeyRecoveryKitDto` so frontend clients share the same encrypted remote sync contract.
- `packages/shared-types/src/index.ts`: exports the new encrypted sync DTOs and recovery kit DTO from the shared type package.
- `Cargo.lock`: records the direct sync-engine dependency edge to `base64` and `ring` after Step 65.
- `memory-bank/progress.md`: records the completed Step 65 milestone, verification commands, environment note, and Step 66 handoff.
- `memory-bank/architecture.md`: records the Step 65 encryption boundary and file-level responsibility split for future maintainers.

### Step 65 Boundary Notes

- `EncryptedSyncEventEnvelope` is the remote transport shape. It is not accepted by replay or merge until a client with the master key decrypts it back into a `SyncEventEnvelope`.
- The sync server must not gain a decrypt endpoint, plaintext event store, recovery-secret field, or business-table routes as part of this phase.
- Key generation, secure random nonce generation, OS keychain storage, and account/server configuration are not implemented yet. Future client adapters must supply unique nonces and store master keys outside server-visible state.
- `package_encrypted_event_batch` batches ciphertext using the same `created_at + event id` cursor semantics as plaintext batching, but it deliberately avoids inspecting or decrypting payload content.
- `MasterKeyRecoveryKit` is a client-held/exported recovery artifact. Server persistence of recovery kits should be evaluated separately and, if added, must treat the kit as opaque ciphertext metadata rather than account credentials.
- Step 66 should focus on desktop sync settings UI and status surfaces. It should not dilute the Step 65 boundary by putting key material in React state that is shared with unrelated reader-shell task monitoring.

## 2026-05-11 ASCII Addendum XXX

### Step 66 Architecture Insights

- Step 66 introduces desktop synchronization settings as a presentation and configuration boundary, not as sync transport. The UI collects enablement, server URL, account email, device list, last-sync time, and user-visible error state only.
- The sync settings feature is intentionally separate from the Step 59 task monitor. Task status still observes reader operations such as refresh, cache cleanup, export, OPML, and batch operations; sync account/server configuration does not become a generic background task row.
- The current server probe is a deterministic mock acceptance model. It proves the desktop shell can distinguish `Not configured`, `Syncing`, `Sync failed`, and `Sync successful` before real HTTP clients, durable cursors, upload queues, or WebDAV adapters exist.
- Client key material remains outside the React settings state. Step 66 does not generate master keys, store recovery secrets, decrypt events, show ciphertext, or upload encrypted batches.
- Device rows are status metadata for the settings surface. They are not durable server `Device` rows yet and do not replace the server-side device registration contract added in Step 63.
- No database schema migration was required. Durable account settings, keychain references, cursor persistence, retry jobs, WebDAV object manifests, and upload/download history remain later adapter work.
- Step 67 should add the WebDAV / Nextcloud transport as an object-storage-style adapter around the encrypted event/blob contract, not by expanding this card into a scheduler or by sharing SQLite files.

### Step 66 File Responsibilities

- `apps/desktop/src/features/sync-settings/sync-settings.ts`: owns the desktop-only sync settings state model, mock validation rules, status labels, device labels, disabled-state transition, syncing-state transition, and tested-state transition. It does not call HTTP, read key material, write local storage, schedule uploads, or import sync-engine crypto primitives.
- `apps/desktop/src/features/sync-settings/components/sync-settings-card.tsx`: renders the Step 66 settings card with sync enablement, server URL, account email, status badge, last-sync summary, device list, save/test action, disable action, and visible error message. It owns only local component state for the mock UI flow and does not persist secrets or transport work.
- `apps/desktop/src/features/reader-shell/components/source-pane.tsx`: exposes a `syncSettingsSlot` composition point and renders the sync settings card beside source/cache/OPML tools. It does not import sync validation rules or absorb account state into source selection.
- `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`: composes `SyncSettingsCard` into the desktop shell and updates the Step 66 header copy. It keeps route-backed source/article state, reader mutations, and task status separate from synchronization settings.
- `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`: adds a Step 66 regression covering not-configured, syncing, failed, and successful UI states, verifies the device list appears after success, and confirms Task Status does not absorb sync configuration state.
- `apps/desktop/src/styles.css`: owns the desktop sync settings visual treatment, including the status badge colors, settings summary grid, enablement row, device list, and action layout.
- `memory-bank/progress.md`: records the completed Step 66 milestone, validation commands, environment note, and Step 67 handoff.
- `memory-bank/architecture.md`: records the Step 66 desktop sync settings boundary and file-level responsibility split for future maintainers.

### Step 66 Boundary Notes

- The settings card is not the sync adapter. Future upload, pull, cursor, retry, and WebDAV work must live behind adapter boundaries rather than in this React component.
- The settings card is not the keychain boundary. Future OS keychain integration should store key references outside this UI state and should never expose plaintext master keys to the sync server.
- The success path is a mock validation path. It proves UI state transitions, not remote availability, authentication, encryption, or server persistence.
- Sync status should remain a user-facing configuration/status surface. It should not reuse Step 59 task-status entries unless a later explicit scheduler produces transport task observations.
- WebDAV / Nextcloud support must preserve Step 65 ciphertext semantics and must not introduce plaintext article, annotation, user-state, or SQLite-file endpoints.

## 2026-05-11 ASCII Addendum XXXI

### Step 67 Architecture Insights

- Step 67 treats WebDAV / Nextcloud as an object-storage-style transport adapter, not as a shared filesystem for the local database. The sync unit remains encrypted event envelopes, encrypted blob metadata, cursors, and manifests.
- The adapter lives in `crates/sync-engine` because it must reuse the established sync contract: `EncryptedSyncEventEnvelope`, `EncryptedSyncEventBatch`, `SyncCursor`, and `package_encrypted_event_batch`. It does not belong in the reader UI or desktop settings card.
- WebDAV event objects are serialized ciphertext envelopes under stable relative object keys. Pulling from WebDAV reconstructs encrypted envelopes and then delegates ordering, cursor movement, and `has_more` behavior to the same encrypted batch function used by the official sync-server path.
- Blob support is metadata-only at this step. `WebDavEncryptedBlobMetadata` describes encrypted object identity, kind, storage key, byte size, checksum, creation time, and optional event reference; it does not contain plaintext article bodies, attachment bytes, local cache paths, or SQLite backup files.
- The adapter includes a `WebDavObjectStore` trait rather than a concrete HTTP client. This keeps Step 67 focused on the protocol/object layout and allows a future Nextcloud/WebDAV HTTP implementation to plug in without changing sync event semantics.
- The in-memory WebDAV store is a deterministic test adapter. It proves idempotent PUT/list behavior and cursor-compatible pulls without introducing credentials, network retries, background scheduling, or UI state.
- WebDAV validation rejects unsupported sync entity types and SQLite-like blob storage keys. That keeps self-hosted sync aligned with the same boundary already enforced by the official server: no `/articles`-style remote table mirror and no database-file sharing.
- No database schema migration was added. Durable WebDAV account settings, credentials, per-adapter cursors, retry jobs, upload/download history, and keychain references remain later client-adapter work.

### Step 67 File Responsibilities

- `crates/sync-engine/src/webdav.rs`: owns the Step 67 WebDAV / Nextcloud object adapter boundary. It defines WebDAV namespace/path layout, object content types, sync manifest shape, object-store trait, in-memory test store, encrypted event object serialization, encrypted event pulls, encrypted blob metadata manifest writes/reads, key validation, checksum generation, and Step 67 regression tests.
- `crates/sync-engine/src/lib.rs`: re-exports the WebDAV adapter API from the sync-engine public surface so future desktop/Web/mobile sync clients can consume it without deep-linking into module internals.
- `crates/sync-engine/src/error.rs`: adds `InvalidWebDavObject` to the sync-engine error vocabulary so WebDAV object-key, manifest, event, and blob metadata validation failures are explicit and testable.
- `crates/sync-engine/Cargo.toml`: adds `serde` as a direct sync-engine dependency because WebDAV manifests and object payload DTOs are serialized/deserialized at the transport boundary.
- `apps/sync-server/src/error.rs`: maps the new sync-engine WebDAV validation error to bad-request API responses to keep the server's exhaustive error conversion valid, even though the server does not execute WebDAV transport work itself.
- `Cargo.lock`: records the updated root workspace dependency graph after `freelyrss-sync-engine` gained a direct `serde` dependency.
- `memory-bank/progress.md`: records the completed Step 67 milestone, verification commands, environment note, and Stage 9 Step 68 handoff.
- `memory-bank/architecture.md`: records the Step 67 WebDAV adapter boundary and file-level responsibility split for future maintainers.

### Step 67 Boundary Notes

- `WebDavObjectStore` is a storage adapter contract, not a scheduler. Retry timing, background jobs, user-visible task status, and credential refresh should be added behind later client orchestration boundaries.
- `pull_webdav_event_batch` must not decrypt events. A client with the master key must decrypt pulled `EncryptedSyncEventEnvelope` values before replay or merge.
- WebDAV object keys are relative paths under a configured namespace. Absolute paths, parent-directory segments, and backslash paths are rejected to avoid treating WebDAV as a host filesystem.
- The WebDAV adapter must continue to reject client business table entity types such as `article`. User-readable state is materialized after decryption/replay/merge on the client, not served as WebDAV table objects.
- Future Nextcloud-specific HTTP behavior should implement `WebDavObjectStore` or a thin equivalent adapter while preserving the current object content types and cursor-compatible event batch semantics.

## 2026-05-11 ASCII Addendum XXXII

### Step 68 Architecture Insights

- Step 68 establishes `crates/integration-engine` as the provider-neutral boundary for external integrations. Bridge services, later-read services, knowledge-base/export connectors, and automation endpoints now share one adapter vocabulary instead of being modeled in reader UI or sync transport code.
- The first-class split is `IntegrationKind` plus `IntegrationCapability`. This lets UI and future orchestration code discover that an adapter can bridge a source, save an article for later, export articles, or dispatch automation events without learning provider-specific APIs.
- `IntegrationRequest` and `IntegrationResponse` are generic boundary DTOs. They carry article snapshots, source URLs, export targets, automation event names, and string properties only; they do not expose SQLite records, sync events, encrypted WebDAV objects, or concrete service SDK types.
- `IntegrationRegistry` is the current system wiring point. It centralizes adapter registration, manifest discovery, operation support checks, and invocation dispatch so provider details do not leak upward into shell components.
- `NoopIntegrationAdapter` is the Step 68 empty adapter required by the implementation plan. It proves the system can wire all four integration classes without real credentials, network IO, background scheduling, or provider-specific code.
- No database schema migration was required. External integration configuration, credential storage, webhook delivery history, retry queues, and provider-specific account tables remain later adapter/client work.

### Step 68 File Responsibilities

- `crates/integration-engine/src/lib.rs`: owns the crate public surface and Step 68 regression tests. It re-exports the adapter trait, error type, model DTOs, no-op adapter, and registry so callers do not deep-link into module internals.
- `crates/integration-engine/src/adapter.rs`: owns the provider-neutral `IntegrationAdapter` trait. Adapters expose a manifest and accept `IntegrationRequest` values through one invocation method.
- `crates/integration-engine/src/model.rs`: owns the shared integration vocabulary: `IntegrationKind`, `IntegrationCapability`, `IntegrationManifest`, request structs, response structs, article snapshots, run status, and small key/value properties.
- `crates/integration-engine/src/error.rs`: owns explicit integration-engine failures for duplicate registration, missing adapters, invalid manifests, invalid requests, and unsupported operations.
- `crates/integration-engine/src/registry.rs`: owns `IntegrationRegistry`, adapter registration, manifest lookup by kind, support checks, and provider-neutral invocation dispatch.
- `crates/integration-engine/src/noop.rs`: owns `NoopIntegrationAdapter`, the deterministic empty adapter used to prove bridge, later-read, export, and automation wiring without real external services.
- `crates/integration-engine/Cargo.toml`: remains dependency-free for this step because the adapter boundary does not yet need HTTP, async runtime, serialization, or provider SDK crates.
- `memory-bank/progress.md`: records the completed Step 68 milestone, verification commands, and Step 69 handoff.
- `memory-bank/architecture.md`: records the Step 68 integration adapter boundary and file-level responsibility split for future maintainers.

### Step 68 Boundary Notes

- `crates/integration-engine` is not a sync engine. It must not package `SyncEvent` batches, decrypt sync payloads, write WebDAV objects, or decide cross-device conflict policy.
- `crates/integration-engine` is not the local business schema. It consumes generic article snapshots and requests; it should not require callers to hand over SQLite rows or storage-layer record structs.
- Reader UI should discover and invoke integrations through adapter manifests and generic requests. It should not directly import provider modules such as a future Webhook, Pocket, RSSHub, Notion, or Obsidian adapter.
- Step 69 should add outbound Webhook behavior as an automation adapter behind this boundary. HTTP client configuration, retry policy, signing, and delivery history should stay inside adapter/orchestration code rather than becoming reader-shell state.

## 2026-05-12 ASCII Addendum XXXIII

### Step 69 Architecture Insights

- Step 69 makes Webhook a concrete automation adapter inside `crates/integration-engine`, not a reader-shell button handler or a sync transport feature. Reader UI and rule/export workflows should still invoke integrations through generic automation requests and adapter manifests.
- Webhook delivery is intentionally outbound-only. It converts an `AutomationEventRequest` into an HTTP JSON POST; it does not create inbound Webhook endpoints, expose a REST API, mirror local business tables, or accept remote commands.
- `AutomationEventRequest` now carries optional article snapshots as generic integration DTOs. This is the right boundary for provider metadata because it includes only article id, title, URL, summary, and tags, not SQLite records, sync event payloads, encrypted blobs, local cache paths, or rule audit internals.
- `WebhookPayload` is a provider-facing transport DTO. It includes `eventName`, `articleIds`, `articles`, and string properties so article share, rule-hit, and export-complete events can be delivered consistently without inventing a provider-specific model in UI code.
- Delivery failure is modeled as an integration-engine error. This keeps HTTP status and transport failures observable to future orchestration code without adding durable retry queues, background schedulers, signing, delivery history, or credential storage in this step.
- No database schema migration was required. Webhook endpoint configuration, credentials, signing secrets, retry policy, delivery audit history, and user-facing integration settings remain later adapter/orchestration work.

### Step 69 File Responsibilities

- `crates/integration-engine/src/webhook.rs`: owns the Step 69 Webhook automation adapter. It defines `WebhookEndpoint`, `WebhookAutomationAdapter`, `WebhookPayload`, endpoint URL/header validation, HTTP JSON POST delivery, non-2xx failure handling, and local HTTP receiver regression tests proving article metadata reaches an external endpoint.
- `crates/integration-engine/src/model.rs`: extends the provider-neutral automation request so automation events can include `ArticleIntegrationSnapshot` values. It also derives serialization for article snapshots and integration properties because Webhook payload construction needs those generic DTOs at the transport boundary.
- `crates/integration-engine/src/error.rs`: adds `WebhookDeliveryFailed` so HTTP client construction, transport failures, serialization failures, and rejected endpoint statuses are explicit integration errors instead of string-only side channels.
- `crates/integration-engine/src/lib.rs`: re-exports the Webhook adapter, endpoint, payload, and adapter id from the crate public surface so future desktop/Web/mobile callers can register the adapter without deep-linking into module internals.
- `crates/integration-engine/Cargo.toml`: adds direct dependencies on `reqwest`, `serde`, and `serde_json` because Step 69 is the first real integration transport and needs HTTP delivery plus JSON serialization.
- `Cargo.lock`: records the updated dependency graph after `freelyrss-integration-engine` gained direct HTTP and JSON serialization dependencies.
- `memory-bank/progress.md`: records the completed Step 69 milestone, verification commands, environment note, and Step 70 handoff.
- `memory-bank/architecture.md`: records the Step 69 Webhook adapter boundary and file-level responsibility split for future maintainers.

### Step 69 Boundary Notes

- The Webhook adapter must not become a provider registry. Multiple concrete providers should still be registered through `IntegrationRegistry` as adapters or adapter instances with manifests.
- The Webhook adapter must not own durable scheduling. Retries, backoff, delivery history, and user-visible task status should be added behind later orchestration boundaries.
- The Webhook adapter must not expose inbound HTTP routes. Step 70 is a separate local desktop REST API step and should remain localhost-only with explicit permissioning.
- The Webhook adapter must not consume sync events or encrypted WebDAV objects directly. Automation callers should prepare provider-neutral requests from already-authorized reader, rule, or export workflows.
- Future signing or secret headers should be treated as credential/configuration work and should avoid leaking secrets into generic article snapshots or provider-visible properties.

## 2026-05-13 ASCII Addendum XXXIV

### Step 70 Architecture Insights

- Step 70 adds a local desktop REST API as a Tauri host capability, not as a remote service. It binds only to `127.0.0.1`, uses an ephemeral per-process bearer token, and exposes the connection details only through the running desktop shell.
- The API is intentionally read-mostly. Current routes provide health, feed summaries, article lists, article detail, search results, and export entry-point discovery. Mutation methods are rejected until a desktop user-confirmation flow exists.
- The local REST API reads the same SQLite-backed reader model used by the desktop shell, but it does not expose raw tables. Responses are DTOs that omit local cache paths, sync events, encrypted blobs, WebDAV object keys, and provider-specific integration payloads.
- `GET /exports` is a capability-discovery surface, not an exporter. It returns confirmation route hints for Markdown, HTML, and PDF export flows without writing files from the HTTP request.
- The boundary is separate from `apps/sync-server`. The sync server remains a remote ciphertext sync protocol and must not become a plaintext reader API or reuse desktop-local bearer tokens.
- The boundary is also separate from `crates/integration-engine`. Webhook delivery and future knowledge-base connectors stay behind integration/export adapters; local REST routes should not import provider SDKs or Webhook endpoint logic.
- No database schema migration was required. Durable local API settings, user-managed token rotation, permission grants, mutation confirmation, audit logs, and stable port preferences remain later desktop host work.

### Step 70 File Responsibilities

- `apps/desktop/src-tauri/src/local_api.rs`: owns the Step 70 local desktop REST API server. It defines startup config, loopback bind validation, ephemeral bearer-token generation, Tauri status DTOs, a small local HTTP request/response layer, read-only route handling, SQLite read DTO mapping, export entry-point discovery, shutdown handling, and regression tests for loopback access, authorization, read-only mutation blocking, article/search/detail responses, and export descriptors.
- `apps/desktop/src-tauri/src/lib.rs`: wires local storage initialization and local API startup into the Tauri builder setup, then exposes `get_local_api_status` alongside the existing reader queue command. It does not define REST route behavior or SQLite DTO mapping.
- `apps/desktop/src-tauri/src/storage.rs`: exposes `DesktopDatabasePaths::from_app_local_data_dir` and `DesktopStoragePaths::from_app_local_data_dir` so the local API can reuse the same managed database and export directory layout as the desktop shell.
- `apps/desktop/src-tauri/src/reader_queue.rs`: received rustfmt-only formatting changes while validating the desktop Tauri crate. Its responsibility remains the existing Tauri command for loading reader queue articles; it is not the REST API router.
- `apps/desktop/src-tauri/Cargo.toml`: adds direct `getrandom` and `serde_json` dependencies for the desktop host because Step 70 generates bearer tokens and serializes local REST JSON responses.
- `apps/desktop/src-tauri/Cargo.lock`: records the desktop Tauri host dependency graph after adding the local API dependencies.
- `memory-bank/progress.md`: records the completed Step 70 milestone, verification commands, environment note, and Step 71 handoff.
- `memory-bank/architecture.md`: records the Step 70 local REST API boundary and file-level responsibility split for future maintainers.

### Step 70 Boundary Notes

- The local API must stay loopback-only. Binding to `0.0.0.0`, LAN addresses, or a public interface is outside the Step 70 security model.
- The bearer token is process-local bootstrap authorization, not an account credential. It should not be reused for remote sync, Webhook signing, provider credentials, or persistent user identity.
- Article detail routes may expose reader-facing article content and metadata, but they must not expose local cache filesystem paths, raw SQLite rows, sync event payloads, encryption key material, or WebDAV object internals.
- Future write routes must require an explicit desktop confirmation/permission flow before changing read state, starred state, tags, annotations, or export outputs.
- Step 71 should build knowledge-base export connectors through export/integration boundaries and can use local API discovery only as a read-only integration point, not as an unrestricted filesystem-writing API.

## 2026-05-14 ASCII Addendum XXXV

### Step 71 Architecture Insights

- Step 71 adds knowledge-base export as an `IntegrationKind::ExportConnector` capability inside `crates/integration-engine`, not as reader UI code, a local REST route, a sync transport, or a provider-specific database table.
- The export connector consumes export-specific snapshots. `ExportArticleSnapshot` and `ExportAnnotationSnapshot` intentionally carry richer export data than `ArticleIntegrationSnapshot`: source metadata, content, tags, and notes are needed for knowledge-base files, but they should not automatically flow into Webhook automation or read-later requests.
- The first supported transport is a local Markdown directory under a caller-configured root path. This preserves the desktop confirmation boundary: the adapter writes only after a trusted caller has chosen the target directory and invoked the export connector.
- Profile mappings are file-layout and metadata mappings. Generic Markdown, Obsidian, Logseq, and Notion Markdown import profiles change paths, frontmatter/properties, links, and tag pages; they do not add remote Notion API calls, OAuth credentials, retry schedulers, or delivery history.
- The adapter writes index pages, article pages, and tag pages with sanitized filenames and relative artifact references. The integration response reports generated relative artifact paths rather than exposing raw SQLite rows or local cache paths.
- Knowledge-base export remains separate from `GET /exports` in the local desktop REST API. `GET /exports` is still discovery-only; future file-writing flows need desktop-side confirmation/orchestration before invoking this adapter.
- No database schema migration was added. Durable connector settings, saved export targets, per-provider credentials, user-facing export history, retry queues, and Notion API integration remain later orchestration/provider work.

### Step 71 File Responsibilities

- `crates/integration-engine/src/knowledge_base/mod.rs`: owns the Step 71 knowledge-base export adapter entry point. It defines `KnowledgeBaseExportAdapter`, the public adapter id, request validation, Markdown artifact planning, safe directory creation, file writing, and integration adapter invocation.
- `crates/integration-engine/src/knowledge_base/profile.rs`: owns `KnowledgeBaseExportTarget`, `KnowledgeBaseExportProfile`, accepted target aliases, profile-specific article/tag/index paths, relative Markdown artifact refs, and filename slugging.
- `crates/integration-engine/src/knowledge_base/format.rs`: owns Markdown rendering for the generated index, article pages, tag pages, YAML frontmatter, Logseq properties, Obsidian links, Notion import hints, summaries, content, and notes/highlights.
- `crates/integration-engine/src/knowledge_base/tests.rs`: owns Step 71 regression coverage for generic Markdown directory export, tagged/note-bearing article content, Obsidian and Logseq profile mapping, and profile mismatch rejection before file writes.
- `crates/integration-engine/src/model.rs`: owns the export connector DTO expansion. It adds `ExportArticleSnapshot`, `ExportAnnotationSnapshot`, and `ExportAnnotationType`, then changes `ExportRequest` to use export-rich article snapshots rather than the lighter automation/read-later `ArticleIntegrationSnapshot`.
- `crates/integration-engine/src/error.rs`: adds `KnowledgeBaseExportFailed` so filesystem write and directory creation failures are explicit integration errors instead of being collapsed into generic invalid requests.
- `crates/integration-engine/src/lib.rs`: wires the new knowledge-base module into the crate public surface and updates the no-op export regression to use export-specific snapshots. Future callers can register the adapter without deep-linking into module internals.
- `memory-bank/progress.md`: records the completed Step 71 milestone, verification commands, environment note, and Stage 10 Step 72 handoff.
- `memory-bank/architecture.md`: records the Step 71 connector boundary and file-level responsibility split for future maintainers.

### Step 71 Boundary Notes

- `KnowledgeBaseExportAdapter` is not a provider registry. Multiple provider/profile instances should still be registered and invoked through `IntegrationRegistry`.
- `KnowledgeBaseExportAdapter` is not a credential store or remote API client. A future Notion API connector should be a separate provider adapter or an adapter mode with explicit credential handling, not an implicit side effect of Markdown export.
- `KnowledgeBaseExportAdapter` is not a scheduler. Background retries, export history, user-visible task status, and desktop notifications belong in later orchestration work.
- Export snapshots should be prepared by an authorized caller from approved reader data. The connector should not reach into SQLite, sync events, encrypted WebDAV objects, local cache paths, or REST API request state.
- Step 72 should introduce AI provider contracts as a separate optional intelligence layer. AI summaries, embeddings, translation, or question answering should not be added to knowledge-base export formatting unless a later explicit export-enrichment step supplies already-approved derived artifacts.

## 2026-05-15 ASCII Addendum XXXVI

### Step 72 Architecture Insights

- Step 72 introduces `crates/ai-adapter` as the optional intelligence-layer boundary. This crate is intentionally separate from reader UI, sync transport, integration/export adapters, and the local REST API.
- The primary abstraction is `AiProvider`. Local and remote models expose the same manifest, capabilities, task submission envelope, timeout policy, retry policy, and response shape. This keeps "local model" and "cloud model" from becoming two parallel integration paths.
- `AiTaskSubmission` is the provider-facing unit of work. It can represent article summary, keyword extraction, translation, and limited-context question answering, but it does not schedule work, persist work, or imply that AI is enabled.
- `AiExecutionPolicy` and `AiRetryPolicy` define execution constraints at the boundary. Actual background scheduling, retry workers, queue state, cancellation, and user-visible task history belong to Step 73 or later orchestration code.
- `AiProviderRegistry` is the wiring surface. Callers can register providers, discover providers by kind or capability, and submit a task without importing provider-specific SDKs or branching on local versus remote model behavior.
- `MockLocalAiProvider` and `MockRemoteAiProvider` are deterministic acceptance providers. They prove the shared call shape without introducing network IO, model binaries, credentials, automatic background work, or provider-specific configuration.
- No database schema migration was required. The existing `AIArtifact` table remains the future persistence target for completed derived results, while Step 72 only defines provider contracts and in-memory invocation boundaries.

### Step 72 File Responsibilities

- `crates/ai-adapter/Cargo.toml`: declares the new `freelyrss-ai-adapter` workspace crate. It has no direct dependencies in Step 72 because the provider boundary does not yet need HTTP clients, async runtimes, serialization, model SDKs, or SQLite access.
- `crates/ai-adapter/src/lib.rs`: owns the crate public surface and Step 72 regression tests. It re-exports the provider trait, errors, manifests, task DTOs, registry, timeout/retry policy, and mock providers so callers do not deep-link into module internals.
- `crates/ai-adapter/src/adapter.rs`: owns the provider-neutral `AiProvider` trait. Providers expose a manifest and accept a single `AiTaskSubmission` through one invocation method.
- `crates/ai-adapter/src/model.rs`: owns the shared AI vocabulary: provider kind, capability, manifest, task properties, summary/keyword/translation/question request DTOs, context scope, task submission, task status, task output, and task response.
- `crates/ai-adapter/src/retry.rs`: owns execution constraints for provider calls. It defines nonzero timeout validation, disabled retry policy, fixed retry policy, and retry-delay calculation without creating a scheduler.
- `crates/ai-adapter/src/registry.rs`: owns `AiProviderRegistry`, provider registration, manifest discovery by provider kind or capability, task submission dispatch, and unsupported-capability rejection before provider internals run.
- `crates/ai-adapter/src/mock.rs`: owns deterministic local and remote mock providers. These providers implement the same trait as future real providers and return stable summaries, keywords, translations, and context-limited answers for tests and shell wiring.
- `crates/ai-adapter/src/error.rs`: owns explicit AI adapter failures for duplicate registration, missing providers, invalid manifests, invalid task submissions, invalid execution policy, unsupported capabilities, and provider invocation failures.
- `Cargo.lock`: records the new workspace package after `freelyrss-ai-adapter` joined the Cargo workspace.
- `memory-bank/progress.md`: records the completed Step 72 milestone, verification commands, environment note, and Step 73 handoff.
- `memory-bank/architecture.md`: records the Step 72 AI provider boundary and file-level responsibility split for future maintainers.

### Step 72 Boundary Notes

- `crates/ai-adapter` is not the AI task queue. Durable queue rows, cancellation, background workers, retry execution, cache lookup, and progress reporting should be added in Step 73 without changing the provider trait into a scheduler.
- `crates/ai-adapter` is not an `AIArtifact` repository. Completed model results should be persisted through the existing local domain/storage boundary in a later step, not by adding storage writes to providers.
- `crates/ai-adapter` must not call reader UI, Webhook delivery, knowledge-base export, WebDAV sync transport, sync-server routes, or local REST routes directly. Those modules may prepare authorized inputs or consume already-approved derived artifacts later.
- Real provider implementations should enter as adapters behind `AiProvider`, with credentials, model selection, network clients, and local model process management kept outside generic task DTOs.
- Step 73 should add queue/cache orchestration around this boundary while preserving AI as explicitly enabled optional functionality.

## 2026-05-16 ASCII Addendum XXXVII

### Step 73 Architecture Insights

- Step 73 adds AI task queue and cache orchestration inside `crates/ai-adapter` while keeping `AiProvider` focused on provider invocation. Providers still do not schedule tasks, persist results, manage credentials, or write to UI/storage directly.
- `AiTaskQueue` is an in-memory orchestration primitive. It validates queued work, pops one task at a time, checks a deterministic input cache, invokes `AiProviderRegistry` only on cache miss, and returns an `AIArtifact`-backed result.
- Cache identity is scoped by provider id, article target, capability, and task input. This prevents a local provider result from being reused as a remote provider result while still avoiding duplicate work for equivalent same-provider submissions.
- Completed queue results are mapped into `core-domain::AIArtifact`. This keeps `AIArtifact` as the single domain model for derived AI results and avoids adding a parallel summary/keyword/translation table.
- The result JSON shape is intentionally compact and output-specific: summary stores text, keywords stores keyword arrays, translation stores text plus target language, and question-answer stores text plus cited context ids.
- The queue depends on `freelyrss-core-domain` only for artifact value types. It does not open SQLite connections, run migrations, query articles, expose REST routes, or write provider credentials.
- No database schema migration was added. The existing `AIArtifact` table remains sufficient for completed derived results; durable queue rows, cancellation, retry execution state, and user-visible task history remain later orchestration/storage work.

### Step 73 File Responsibilities

- `crates/ai-adapter/src/queue.rs`: owns Step 73 queue/cache orchestration. It defines `AiQueueTask`, `AiTaskQueue`, `AiQueueRunOutcome`, `AiQueueReport`, stable input hashing, cache lookup, provider-registry execution, and mapping from `AiTaskResponse` to `AIArtifact`.
- `crates/ai-adapter/src/error.rs`: adds explicit queue validation and artifact mapping errors so invalid queue metadata and domain conversion failures are distinguishable from provider registration or invocation failures.
- `crates/ai-adapter/src/lib.rs`: exports the queue/cache API and contains regression tests proving provider execution maps to `AIArtifact` and equivalent same-provider tasks hit the input cache.
- `crates/ai-adapter/Cargo.toml`: adds `freelyrss-core-domain` for `AIArtifact`/id/json value types and `serde_json` for output result JSON construction.
- `Cargo.lock`: records the new `freelyrss-ai-adapter` dependency edges after Step 73.
- `memory-bank/progress.md`: records the completed Step 73 milestone, verification commands, environment note, and Step 74 handoff.
- `memory-bank/architecture.md`: records the Step 73 queue/cache boundary and file-level responsibility split for future maintainers.

### Step 73 Boundary Notes

- `AiTaskQueue` is not a persistent job runner. It should not grow database writes, background threads, cancellation state, desktop notifications, or retry workers without an explicit later step.
- `AiTaskQueue` is not an article repository. Authorized callers must provide the article id, task input, and timestamp; the queue should not reach into SQLite, reader UI state, local REST request state, or sync payloads to assemble inputs.
- Cache hits return already-mapped `AIArtifact` values. Future persistent cache storage should hydrate the queue/cache from the `AIArtifact` domain boundary rather than creating an unrelated cache schema.
- Step 74 should build summary and keyword extraction flows on top of `AiProviderRegistry` and `AiTaskQueue`, preserving AI as an explicit optional feature.
