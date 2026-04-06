# FreelyRSS 进度记录

## 当前状态

- 阶段：已进入阶段 1，仓库目录骨架已初始化，尚未进入工作区与工具链初始化
- 最后更新：2026-04-06
- 风险状态：已从“仅文档基线”推进到“工程骨架开始落地”，当前主要风险转为工作区与工具链尚未接线

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

- 工作区、CI、数据库迁移机制尚未初始化。

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

## 下一步

- 按 `implementation-plan.md` 执行 Step 6，初始化 `pnpm workspace` 与 `Cargo workspace`。
- 在工作区识别验证通过后，再继续代码规范、changesets 与 CI 基础设施。
