## 简介

**codex-deepseek-routing-suite** 是 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) 的 Codex 移植版：任务感知思维模式路由（spec / react / weak），通过 Hooks + MCP 工具实现首轮 persona 注入、工具面硬锚定与双后端模式隔离子代理。

- 致谢：[yjh051108](https://github.com/yjh051108) 的 **风神插件**；本套件基于 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（MIT）移植

- 主会话唯一形态：`model_instructions_file` 替换内置 identity（RL 句 + 路由规则）
- 首轮硬锚定：首个核心工具调用前仅 `Bash`/`exec_command` + `apply_patch`
- 双后端：默认一次性 `codex exec` 子进程；可选原生 `router_*` agents（不强制开启多智能体配置）
- 零运行时依赖；安装/卸载脚本幂等且可逆；Codex 直装
- 跨平台（Windows / macOS / Linux），Codex 桌面端与 CLI 兼容；完整安装 `node install.mjs`（Windows 亦可用 `install.ps1`）
- 严格模型门控：仅 DeepSeek V4 Flash / Pro 启动工作流；其他模型自动停用（不注入、不锚定、子代理拒绝）
- Flash 家族兼容：`deepseek-v4-flash-vision-exp` 等纳入 Flash 分支
- 模型适配：**本套件专门面向 Codex + DeepSeek 设计；仅 Codex + DeepSeek V4 Flash 组合实测；DeepSeek V4 Pro 未测试，效果未验证**
- DeepSeek 特定适配：Flash 分支 persona 默认、RL 接口还原（`model_instructions_file` + 首轮 bash/apply_patch）、深度自适应引导、中文分类关键词扩展（规划/计划/方案/阅读/移植）

## 安装

- **完整安装（hooks + MCP + 技能 + agents，Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`），重启 Codex 并信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。
- **仅手册用法（不启用路由）**：把 `skills/dsh-router` 复制到 skills 目录只能读取操作手册；hooks / MCP / agents 未安装，路由不生效，`dev_router_*` 不可用。请用完整安装。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明（机制映射、接口契约、双后端、测试、模型适配状态）。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.3.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## Overview (English)

**codex-deepseek-routing-suite** is a Codex port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite): task-aware reasoning-mode routing (spec / react / weak) with first-turn persona injection, tool anchoring, and dual-backend mode isolation via Hooks + MCP tools.

- Thanks to **风神插件 (Fengshen plugin)** by [yjh051108](https://github.com/yjh051108); this suite is a port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) (MIT)

- `model_instructions_file` persona replacement is the only release form
- First-turn hard anchoring: only `Bash`/`exec_command` and `apply_patch` until the first core tool call
- Dual backend: one-shot `codex exec` subprocess by default; optional native `router_*` agents (no forced multi-agent config)
- Zero runtime dependencies; idempotent install/uninstall; direct Codex install
- Cross-platform (Windows / macOS / Linux), compatible with Codex desktop and CLI; full install via `node install.mjs` (or `install.ps1` on Windows)
- Strict model gating: only DeepSeek V4 Flash / Pro enable the workflow; any other model disables it (no injection, no anchoring, subagent refused)
- Flash family compatibility: `deepseek-v4-flash-vision-exp` and other `flash` variants are treated as Flash
- Model status: **designed for Codex + DeepSeek; tested on Codex + DeepSeek V4 Flash only; DeepSeek V4 Pro NOT tested**
- DeepSeek-specific adaptations: Flash-branch personas by default, RL interface restoration (`model_instructions_file` + first-turn bash/apply_patch), depth-adaptive guidance, and Chinese planning/porting keyword classification

### Install

- Full install (hooks + MCP + skill + agents; Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows), restart Codex, trust the two hooks, verify with `dev_router_status`.
- Manual-only (routing NOT enabled): copying `skills/dsh-router` into a skills directory only provides the manual; hooks/MCP/agents are not installed and `dev_router_*` is unavailable. Use the full install.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.3.zip` (top-level folder `codex-deepseek-routing-suite/`).
