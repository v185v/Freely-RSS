# FreelyRSS 进度记录

## 当前状态

- 阶段：阶段 2 Step 11 已完成，`apps/desktop` 的 Tauri + React + TypeScript + Vite 桌面端应用壳已初始化并通过验证，下一步进入阶段 2 Step 12 的共享 UI 基础包
- 最后更新：2026-04-07
- 风险状态：已从“桌面端壳尚未接线”推进到“桌面端壳已可构建验证”，当前主要风险转为共享 UI 边界设计是否足够克制，以及后续三栏布局接入时避免把业务逻辑提前沉积到应用壳

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

- 当前无阻塞；下一步风险点是阶段 2 Step 12 需要把共享 UI 保持为纯展示与主题层，避免在 `packages/ui` 过早掺入阅读器业务查询与状态逻辑。

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

## 下一步

- 按 `implementation-plan.md` 执行阶段 2 Step 12，在 `packages/ui` 中建立共享 UI 基础包与主题变量边界。
- 在共享 UI 基础包验证通过后，再继续推进阶段 2 Step 13 与 Step 15 的共享类型和三栏主布局工作。
