# FreelyRSS 技术栈建议

## 1. 文档目的

本文档基于 [RSS-design-document.md](./RSS-design-document.md) 为 FreelyRSS 推荐最合适的技术栈，并明确取舍理由、分层边界和阶段性实施建议。

目标不是堆砌流行技术，而是选择一套最符合以下约束的可执行方案：

- 个人优先、本地优先
- 核心功能完全离线可用
- 桌面端优先，但保留 Web 与移动端演进路径
- 同步、AI、第三方桥接必须是可选模块
- 后续仍能扩展到云同步、自托管和多设备场景

## 2. 结论

最佳技术栈不是“一个框架包打天下”，而是分层选择：

- 核心引擎：Rust
- 桌面客户端：Tauri v2 + React + TypeScript + Vite
- 本地数据库：SQLite + FTS5
- Web 端：React + TypeScript + Vite，共享设计系统和领域类型
- 官方同步服务：Rust + Axum + PostgreSQL + S3 兼容对象存储
- 移动端：第二阶段采用 React Native + Expo，复用同步协议、领域模型和部分 Rust 核心逻辑

这是当前最稳的组合。原因很直接：

- 桌面端是主战场，Tauri + Rust 最符合“本地优先 + 低资源占用 + 系统集成”
- 核心逻辑用 Rust，可以稳定承载抓取、解析、规则、同步、去重、缓存等重活
- Web 端不是 SEO 站点，而是应用入口，React + Vite 更简单直接
- 移动端如果强行复用 Tauri Mobile，会在工程成熟度和插件支持上承担额外风险
- 官方同步服务用 Rust，可以保持协议、数据结构和安全模型一致

## 3. 方案对比

### 3.1 推荐方案：Rust Core + Tauri Desktop + React Web + Rust Sync + Expo Mobile

优点：

- 最符合桌面优先和本地优先的产品定位
- 核心重逻辑统一在 Rust，后续复用空间最大
- 桌面端性能、资源占用、原生能力和分发形态都更合适
- Web 端可以快速作为同步访问入口落地
- 移动端后续可以用更成熟的生态完成适配

缺点：

- 不是单一 UI 技术栈覆盖所有平台
- 移动端会存在一层额外适配成本

结论：

- 这是最佳长期方案，也是最佳现实方案

### 3.2 备选方案：全平台 Tauri v2 + React

优点：

- 理论上可最大化前端和 Rust 代码复用
- 桌面与移动的工程结构更统一

缺点：

- 移动端开发体验和插件成熟度仍弱于成熟移动框架
- 当产品进入重缓存、播客、后台任务、通知、系统分享等场景时，移动端落地风险更高

结论：

- 可以作为实验路线，但不建议作为主路线

### 3.3 不推荐方案：Electron + Node.js 全家桶

优点：

- 前端团队上手快
- 生态非常成熟

缺点：

- 内存和包体成本更高
- 与“本地优先、轻量、高性能桌面应用”定位不匹配
- 重逻辑最终仍会逼出原生模块或独立服务

结论：

- 不适合作为 FreelyRSS 的核心栈

### 3.4 条件性方案：Flutter + Rust

优点：

- 移动端和桌面端统一程度高
- 移动端体验成熟

缺点：

- Web 能力和桌面生态不如 React 体系自然
- 与未来 Web 访问入口的技术共享较弱
- 团队若以 Web 技术为主，整体研发效率会下降

结论：

- 如果未来产品改为移动端优先，可以重新评估；按当前定位不推荐

## 4. 分层技术栈

## 4.1 代码仓库与工程管理

推荐：

- JavaScript/TypeScript 工作区：`pnpm workspace`
- Rust 工作区：`Cargo workspace`
- 单仓库管理：monorepo

建议结构：

```text
/apps
  /desktop
  /web
  /mobile
  /sync-server
/packages
  /ui
  /shared-types
  /shared-query
  /shared-config
/crates
  /core-domain
  /feed-engine
  /content-pipeline
  /rule-engine
  /search-engine
  /sync-engine
  /integration-engine
```

推荐原因：

- 前端共享类型、查询表达式和 UI 基础件
- Rust 逻辑按 crate 拆分，便于测试和复用
- 后续可以清晰区分“共享领域层”和“平台壳层”

工程规范建议：

- JS/TS：TypeScript 5.9 起步，待生态稳定后升级 6.x
- 代码风格：Biome 或 ESLint + Prettier，二选一即可，不要双重维护
- Rust：`rustfmt` + `clippy`
- Git Hooks：`lefthook`
- 变更集管理：`changesets`

## 4.2 桌面客户端

推荐：

- 桌面壳：Tauri v2
- 前端框架：React 19
- 语言：TypeScript
- 构建工具：Vite 8
- 路由：TanStack Router
- 异步数据状态：TanStack Query
- 本地 UI 状态：Zustand
- 长列表渲染：TanStack Virtual

推荐原因：

- Tauri v2 足够成熟，且支持未来移动端实验路径
- React 19 在组件模型和生态上仍是最稳妥选择
- Vite 8 适合作为桌面和 Web 的统一构建底座
- TanStack Router/Query/Virtual 很适合“高密度阅读器”而不是营销站式应用

UI 层建议：

- 不要直接引入大型后台模板或整套重型 UI 库
- 使用 Radix Primitives 或 Headless 组件构建自己的阅读器设计系统
- 主题系统使用 CSS Variables 统一管理亮色、暗色、高对比度和自定义主题色

不建议：

- 不要把 Next.js 当成桌面应用前端基础设施
- 不要用 Redux 处理全部状态
- 不要把 React Query 和本地数据库缓存混成一层

## 4.3 移动端

推荐：

- 第二阶段采用 React Native + Expo
- 与桌面/Web 共享：领域类型、查询表达式、同步协议、部分业务逻辑
- 不强求共享桌面端组件

推荐原因：

- 移动端需要更成熟的通知、后台任务、媒体播放、系统分享和可访问性支持
- Expo 生态和调试体验比当前 Tauri Mobile 更稳
- 阅读器类产品在移动端很容易碰到平台原生限制，成熟移动栈更可靠

移动端边界：

- 先覆盖阅读、同步、搜索、笔记、缓存、播客消费
- 不首期覆盖复杂规则编辑器、批量管理和重配置面板

## 4.4 Web 端

推荐：

- React 19 + TypeScript + Vite 8
- 与桌面端共享 UI 包、类型包、查询表达式定义

推荐原因：

- Web 端定位是同步访问入口，而不是 SSR 内容站点
- 这类产品不需要为 SEO 或服务端组件承担额外复杂度
- 与桌面端共享 Vite 和 React 工具链能降低维护成本

什么时候考虑 Next.js：

- 只有当 Web 端未来演变为公开站点、需要 SSR、服务端渲染 SEO 页面或复杂边缘路由时，才值得引入

当前结论：

- 不把 Next.js 作为主应用栈

## 4.5 Rust 核心引擎

推荐语言与运行时：

- Rust stable
- Tokio

推荐 crate 方向：

- 网络抓取：`reqwest`
- HTML 解析：`scraper`
- RSS/Atom 解析：优先选成熟解析库，必要时自行补足异常兼容
- JSON Feed：`serde_json` + 自定义模型
- HTML 清洗：`ammonia`
- XML/OPML：`quick-xml`
- 时间：`chrono` 或 `time`
- 序列化：`serde`
- 日志与追踪：`tracing`
- 错误处理：`thiserror` + `anyhow`

核心模块建议：

- `feed-engine`
- `content-pipeline`
- `rule-engine`
- `search-engine`
- `sync-engine`
- `integration-engine`
- `ai-adapter`

为什么 Rust 是核心：

- 抓取、去重、缓存、同步和索引都更偏系统工程
- 这些模块需要稳定、低内存占用、强类型和高并发能力
- 一旦核心逻辑先用 Node.js 或前端层实现，后续通常需要重写

## 4.6 本地数据库与搜索

推荐：

- 数据库：SQLite
- 全文检索：SQLite FTS5
- Rust 访问层：`rusqlite`

推荐原因：

- SQLite 最适合本地优先应用
- FTS5 足够支撑阅读器的全文搜索、标题搜索、元数据搜索和过滤
- `rusqlite` 对 SQLite 特性暴露更完整，适合做嵌入式本地数据库

什么时候再考虑独立搜索引擎：

- 只有当本地库规模明显超过 SQLite FTS5 的舒适区，或者需要复杂向量检索与高级相关性排序时，再评估 Tantivy 或独立搜索层

数据库建议：

- 启用 WAL
- 独立管理 schema migration
- 对附件缓存、正文缓存和业务数据分层存储

## 4.7 同步服务

推荐：

- 服务端框架：Axum
- 服务端语言：Rust
- 元数据数据库：PostgreSQL
- 大对象存储：S3 兼容对象存储，例如 MinIO、R2 或 S3
- 协议风格：REST 优先，后续按需补 GraphQL

推荐原因：

- 服务端并不负责业务主状态，只负责同步协议、认证、对象存储和事件交换
- Rust 可以与本地端共享协议模型、加密边界和部分校验逻辑
- PostgreSQL 适合管理设备、用户、同步游标、对象清单和审计信息
- 对象存储适合保存加密后的快照、事件批次和附件片段

同步边界建议：

- 不同步 SQLite 文件
- 同步实体变更、事件日志和必要快照
- 自托管模式和官方托管模式共用一套协议

## 4.8 AI 与扩展层

推荐：

- AI 接入协议：统一 Provider Adapter
- 本地模型入口：Ollama 或兼容 OpenAI API 的本地网关
- 远程模型入口：OpenAI 兼容接口或其他云模型接口
- 任务执行：本地队列 + 后台 worker

推荐原因：

- AI 是增强层，不应侵入核心阅读链路
- 统一适配器能同时支持“完全关闭”“本地模型”“云模型”
- 本地队列有利于长任务、重试、缓存和 UI 解耦

扩展建议：

- Webhook：首选
- REST API：次选且应稳定
- GraphQL：后续再评估
- 桥接服务：按 provider plugin 模式接入

## 4.9 音频、阅读与批注

推荐：

- 音频播放：桌面与移动端分别走平台原生播放器能力封装
- 文本高亮与批注：基于 DOM Range / Anchor 模型，自建轻量批注层
- PDF 导出：桌面端优先通过原生打印或 HTML 转 PDF 管线

建议：

- 不要为了批注直接引入完整富文本编辑器作为阅读主视图
- 阅读视图保持“可渲染、可高亮、可定位、可导出”即可

## 4.10 测试与质量保障

推荐：

- 前端单测：Vitest
- 前端组件/交互：Testing Library
- 端到端：Playwright
- Rust 单测与集成测试：`cargo test`
- 协议与快照测试：JSON fixture + golden files

质量门槛建议：

- 规则引擎必须有高覆盖率测试
- 同步冲突合并必须有多设备并发测试
- 解析器必须有真实 feed 样本回归测试
- 阅读模式和导出模式必须有快照测试

## 4.11 构建、发布与运维

推荐：

- CI：GitHub Actions
- 桌面分发：Tauri bundler
- 移动分发：Expo EAS 或平台原生打包
- 服务端部署：Docker + Fly.io / Railway / 自托管 VPS / Kubernetes 均可

版本策略建议：

- 客户端和同步协议分开版本化
- 协议要前向兼容
- 数据库迁移必须可回滚或可恢复

## 5. 当前不建议引入的技术

- Electron：与产品定位不匹配
- Next.js 主应用化：当前 Web 端没有必要承担 SSR 复杂度
- GraphQL First：早期接口面会过大
- 微服务拆分：当前规模完全不需要
- 独立搜索引擎：SQLite FTS5 先足够
- 重型 UI 组件库主导界面：会让阅读器变成通用后台面板

## 6. 建议版本基线

以下版本信息是基于 2026-04-06 核对官方资料后的建议基线：

- React：19.2
- Tauri：v2 stable
- Vite：8.x
- TypeScript：5.9 起步，谨慎评估 6.x
- SQLite：启用 FTS5
- Expo：SDK 55 可作为移动端二阶段基线

说明：

- TypeScript 6.0 发布时间很近，适合先观察生态兼容性
- 客户端项目不应追求“所有依赖都上最新大版本”，而应优先保证主链稳定

## 7. 参考资料

以下资料用于校验关键技术的当前状态，均为官方来源：

- React Versions: https://react.dev/versions
- React 19.2: https://react.dev/blog/2025/10/01/react-19-2
- Tauri 2.0 Stable Release: https://v2.tauri.app/zh-cn/blog/tauri-20/
- Tauri Mobile Plugin Development: https://v2.tauri.app/develop/plugins/develop-mobile/
- Vite 8.0 Release: https://vite.dev/blog/announcing-vite8
- TypeScript Downloads: https://www.typescriptlang.org/download/
- TypeScript 5.9 Release Notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html
- SQLite FTS5: https://www.sqlite.org/fts5.html
- Expo SDK: https://expo.dev/sdk

## 8. 最终建议

如果只给一条明确结论：

FreelyRSS 应该采用“Rust 核心 + Tauri 桌面端 + React/Vite 前端 + SQLite FTS5 本地存储 + Rust 同步服务”的主栈，并把移动端放到第二阶段，用 Expo 体系承接。

这是当前最符合产品定位、工程现实和长期演进空间的方案。
