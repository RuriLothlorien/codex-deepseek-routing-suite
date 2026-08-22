## 简介

**codex-deepseek-routing-suite** 是 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) 的 Codex 移植版：任务感知思维模式路由（spec / react / weak），通过 Hooks + MCP 工具实现首轮 persona 注入、工具面硬锚定与双后端模式隔离子代理。

- 致谢：[yjh051108](https://github.com/yjh051108) 的 **风神插件**；本套件基于 dsh-routing-suite（MIT）移植
- 主会话唯一形态：`model_instructions_file` 替换内置 identity（RL 句 + 路由规则）
- 首轮硬锚定：首个核心工具调用前仅 `Bash`/`exec_command` + `apply_patch`
- 双后端：默认一次性 `codex exec` 子进程；可选原生 `router_*` agents（不强制开启多智能体配置）
- 零运行时依赖；安装/卸载脚本幂等且可逆
- 模型适配：**专门面向 Codex + DeepSeek 设计；Codex + DeepSeek V4 Flash 组合实测；DeepSeek V4 Pro 未测试，效果未验证**

## 安装

- **完整安装（Windows PowerShell）**：解压后运行 `install.ps1`，重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.0.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## Overview (English)

**codex-deepseek-routing-suite** is a Codex port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite): task-aware reasoning-mode routing (spec / react / weak) with first-turn persona injection, tool anchoring, and dual-backend mode isolation via Hooks + MCP tools.

- Thanks to **风神插件 (Fengshen plugin)** by [yjh051108](https://github.com/yjh051108); ported from dsh-routing-suite (MIT)
- `model_instructions_file` persona replacement is the only release form
- First-turn hard anchoring: only `Bash`/`exec_command` and `apply_patch` until the first core tool call
- Dual backend: one-shot `codex exec` subprocess by default; optional native `router_*` agents (no forced multi-agent config)
- Zero runtime dependencies; idempotent install/uninstall
- Model status: **designed for Codex + DeepSeek; tested on Codex + DeepSeek V4 Flash only; DeepSeek V4 Pro NOT tested**

### Install

- Full install (Windows PowerShell): unzip and run `install.ps1`, restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.0.zip` (top-level folder `codex-deepseek-routing-suite/`).
