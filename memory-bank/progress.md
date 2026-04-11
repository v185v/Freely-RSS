# FreelyRSS 进度记录

## 当前状态

- 阶段：阶段 4 Step 26 已完成，`crates/feed-engine` 已补齐 RSS 2.0、RSS 0.9x 与 Atom 1.0 的默认解析器、标准化器与固定样本回归测试；下一步进入阶段 4 Step 27 的 JSON Feed 解析
- 最后更新：2026-04-11
- 风险状态：已从“在 Step 26 中补齐 RSS / Atom 解析时继续保持 `FeedFetcher` 只负责编排、`transport` / `parser` / `normalizer` / `repository` 四段端口继续可替换、固定样本继续只服务 `feed-engine` 测试与解析验收”推进到“在 Step 27 中补齐 JSON Feed 解析时继续保持 XML parser 与 JSON parser 共享同一 `ParsedFeedDocument` / `NormalizedFeedBatch` 契约，且不把格式分支逻辑回流到桌面宿主或 UI”

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

- 当前无阻塞；下一步风险点是阶段 4 Step 27 需要在不破坏 Step 26 已落地 XML 解析边界的前提下，为 JSON Feed 1.1 补齐解析与标准化路径，并继续复用 Step 23 固定样本与 Step 26 的默认标准化器作为统一验收基线。

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

## 下一步

- 按 `implementation-plan.md` 执行阶段 4 Step 27，在 `crates/feed-engine` 中补齐 JSON Feed 1.1 的解析和标准化输出。
- 在推进 Step 27 时继续保持当前边界：Step 25 已落地的 `FeedFetcher` 继续只承载编排职责，Step 26 已落地的 `DefaultFeedParser` / `DefaultFeedNormalizer` 继续只消费与产出统一阶段契约，JSON Feed 固定样本继续只服务 `feed-engine` 的解析回归与后续抓取验收，不反向混入桌面宿主或前端壳层。
