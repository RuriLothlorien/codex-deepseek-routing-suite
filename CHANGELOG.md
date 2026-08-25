# Changelog

## Unreleased

- 三预设切换：`config.json` 新增 `preset`（默认 `standard`）+ 首轮 `#preset <name>` 指令（仅当前会话）；`standard` 保留任务路由并加入注意力工程引导，`spec` 固定深思考，`react` 固定快循环；`dev_router_status` 输出 `preset`。

**使用方法**：
- 持久默认：编辑 `~/.codex/codex-dsh-routing-suite/config.json`，设 `"preset": "standard" | "spec" | "react"`（默认 `standard`），新会话生效。
- 当前会话：首条消息以 `#preset <name>` 开头（如 `#preset react 帮我开发一个网页`），仅本次会话生效；首轮不加指令时直接使用 `config.json` 的 `preset`（默认 `standard`）。
- 验证：新会话运行 `dev_router_status`，查看 `preset=...` 行。

**本次未对齐上游**（对照 `yjh051108/dsh-routing-suite` main，2026-08-24 单仓库扁平化版：router-standard v34 / router-spec v10 / router-react v17，注意力工程 v1.20–1.28）：
- 未移植 DSH 平台机制：injector 运行时（junction/loader/HMR/staging/UI）、`cordis.yml` agent-plane 配置、`gitbash-executor.mjs`、`install-injector.ps1`、单仓库/子模块工程结构。
- 未移植工具层：`engram_*` 记忆工具（13 个）、`delivery_check` 证据门禁工具、`dev_page_check`（上游 v1.23 已自删）、阶段工具窗 `windowFor` / `preUnlockedFor` / `stageSummary`。
- 未移植机制层：stage 0-3 阶段机（`advanceStage`、`phase_begin`、single-truth stage 文本）、按阶段工具解锁（v1.20 取消预解锁）、`dsh-probe` 评测矩阵 / selftest 平台。
- 引导层仅抽取注意力工程五支柱（v1.22/v1.24/v1.25/v1.26/v1.28）与 spec/react 引导的紧凑文本，未整段搬运上游 v1.14–v1.28 长文。

## 0.1.4 (2026-08-23)

- 全局改名 `codex-dsh-routing-suite`：技能、运行时目录、config.toml 标记、MCP 服务器名与 persona 身份统一为新名；README/文档/发布元数据同步。
- 上游 `dsh-routing-suite` / `dsh-router-standard` 署名与 `dev_router_*` 工具名保持不变。

## 0.1.3 (2026-08-23)

- 修复安装器重复运行在 `~/.codex/config.toml` 中累积空白行的问题（`install.mjs` / `install.ps1` 替换标记块时消费残留换行，并对 3+ 连续换行做归一化）；`uninstall.mjs` / `uninstall.ps1` 同步清理移除标记后的残留空行。
- 影响平台：Windows / macOS / Linux（`install.sh` 委托 `install.mjs`，同一修复）。
- 测试：新增安装器幂等回归（连续安装 config.toml 不变、无 3+ 连续换行）；仓库测试 40 例。

## 0.1.2 (2026-08-22)

- 严格模型门控：`modelClass` 精确区分 Flash / Pro，二者皆非（`deepseek-chat`、其他模型、缺失）时套件工作流整体停用——钩子不注入、不锚定，`dev_mode_subagent` 拒绝执行。
- Flash 家族兼容：`deepseek-v4-flash-vision-exp` 等含 `flash` 的变体纳入 Flash 分支。
- 修正门控范围：非 DeepSeek 模型的 `*-flash` / `*-pro`（如 `gpt-5-flash`）不再误判，一律停用工作流。
- 修复 `dev_mode_subagent` 的 `sessionId` 声明顺序隐患（此前可能在运行时报错）。
- `dev_router_status` 新增 `supported` 字段。
- 测试：仓库 39 例，会话内 `dev_router_test` 38 例（安装器用例仅仓库）。
- 文档：README 合并“功能特性 / DeepSeek 适配 / 双后端”为单一章节，新增安全性分析与模型声明有效性说明；新增 `docs/validation-report.md`（中文有效性测试报告）；SKILL 引用与字段说明同步。

## 0.1.1 (2026-08-22)

- 跨平台：新增 `install.mjs` / `uninstall.mjs`（Windows / macOS / Linux 通用，支持 `--home` 与 `--dry-run`）；Windows 保留 `install.ps1` / `uninstall.ps1`。
- Agent 形态：明确 Codex 桌面端与 CLI 共用同一套 hooks/MCP/技能配置，两者兼容。
- `dev_mode_subagent`：CLI 探测补充 PATH 回退（macOS/Linux）。
- 测试：新增安装器用例（临时 codex home 安装/卸载）；仓库 `npm test` 32 例，会话内 `dev_router_test` 31 例（不含安装器用例）。
- 补充 macOS/Linux 的 `install.sh` / `uninstall.sh`（Node 安装/卸载器的 POSIX 入口）。
- 修复：模型识别默认按 Flash——模型缺失或未识别时不再误用未测试的 Pro 分支（`routerModelFor` 保护 + 测试）。

## 0.1.0 (2026-08-21)

发布就绪的首个版本：dsh-routing-suite（注入器 × 思维模式路由）的 Codex 移植。

- 路由核心：`router-core.mjs` 原样移植；分类器扩展（方案 A）：`SPEC_RE` 增加 `规划|计划|方案|阅读|移植|survey|plan`。
- Hooks：`UserPromptSubmit`（分类 + persona + 近距离引导注入）、`PreToolUse`（首轮硬锚定）；DSH 计划模式语义还原（plan 段由宿主保留，路由照常注入/锚定）。
- MCP 服务器：`dev_router_status` / `dev_router_mode` / `dev_router_test` / `dev_mode_subagent`（exec 子进程后端，剥离 `CODEX_*` 环境、禁用 hooks/memories、可选 reasoning）。
- 可选原生多智能体后端：`agents/router_{spec,react,weak}.toml` + `spawn_agent` 流程；不修改 `features.multi_agent`。
- 主会话 persona 替换（唯一形态）：`model_instructions_file` 替换内置 identity，安装即启用（无开关）。
- 安装/卸载脚本 junction 安全；CCS 三处同步支持。
- 测试：31 例（router 单元 + 钩子场景 + agents 校验）。
