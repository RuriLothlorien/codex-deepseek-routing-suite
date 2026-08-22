# Changelog

## 0.1.1 (2026-08-22)

- 跨平台：新增 `install.mjs` / `uninstall.mjs`（Windows / macOS / Linux 通用，支持 `--home` 与 `--dry-run`）；Windows 保留 `install.ps1` / `uninstall.ps1`。
- Agent 形态：明确 Codex 桌面端与 CLI 共用同一套 hooks/MCP/技能配置，两者兼容。
- `dev_mode_subagent`：CLI 探测补充 PATH 回退（macOS/Linux）。
- 测试：新增安装器用例（临时 codex home 安装/卸载）；仓库 `npm test` 32 例，会话内 `dev_router_test` 31 例（不含安装器用例）。
- 补充 macOS/Linux 的 `install.sh` / `uninstall.sh`（Node 安装/卸载器的 POSIX 入口）。

## 0.1.0 (2026-08-21)

发布就绪的首个版本：dsh-routing-suite（注入器 × 思维模式路由）的 Codex 移植。

- 路由核心：`router-core.mjs` 原样移植；分类器扩展（方案 A）：`SPEC_RE` 增加 `规划|计划|方案|阅读|移植|survey|plan`。
- Hooks：`UserPromptSubmit`（分类 + persona + 近距离引导注入）、`PreToolUse`（首轮硬锚定）；DSH 计划模式语义还原（plan 段由宿主保留，路由照常注入/锚定）。
- MCP 服务器：`dev_router_status` / `dev_router_mode` / `dev_router_test` / `dev_mode_subagent`（exec 子进程后端，剥离 `CODEX_*` 环境、禁用 hooks/memories、可选 reasoning）。
- 可选原生多智能体后端：`agents/router_{spec,react,weak}.toml` + `spawn_agent` 流程；不修改 `features.multi_agent`。
- 主会话 persona 替换（唯一形态）：`model_instructions_file` 替换内置 identity，安装即启用（无开关）。
- 安装/卸载脚本 junction 安全；CCS 三处同步支持。
- 测试：31 例（router 单元 + 钩子场景 + agents 校验）。
