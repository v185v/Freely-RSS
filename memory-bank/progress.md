# FreelyRSS 进度记录

## 当前状态

- 阶段：阶段 2 Step 15 已完成，桌面壳的稳定三栏主布局已落地并纳入桌面端与根级验证链路，下一步进入阶段 2 Step 16 的导航与视图状态框架工作
- 最后更新：2026-04-08
- 风险状态：已从“规则、搜索与智能文件夹已拥有共享查询边界”推进到“桌面壳已拥有稳定的三栏阅读骨架与本地选择态”，当前主要风险转为在阶段 2 Step 16 中引入导航、视图状态与后续数据访问入口时继续保持左栏来源上下文、中栏列表状态和右栏阅读上下文的分层边界

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

- 当前无阻塞；下一步风险点是阶段 2 Step 16 需要在不回退成单体 `App.tsx` 的前提下，引入显式导航与视图状态来源，同时继续保持 `packages/ui` 只承载展示骨架、`shared-query` 只承载查询边界、桌面壳只承载组合与局部选择状态。

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

## 下一步

- 按 `implementation-plan.md` 执行阶段 2 Step 16，在当前三栏骨架之上补齐导航与视图状态框架，显式定义“当前来源”“当前视图/过滤条件”“当前选中文章”的状态来源与组合方式。
- 在推进 Step 16 时继续保持当前边界：桌面壳只组合局部状态与展示结构，不把真实查询执行、持久化访问或后续同步入口耦合回单一 `App.tsx`。
