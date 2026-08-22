## 简介

**codex-deepseek-routing-suite** 是 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) 的 Codex 移植版：任务感知思维模式路由（spec / react / weak），通过 Hooks + MCP 工具实现首轮 persona 注入、工具面硬锚定与双后端模式隔离子代理。

- 致谢：原作者 [yjh051108](https://github.com/yjh051108) 及 **风神插件**

- 主会话唯一形态：`model_instructions_file` 替换内置 identity（RL 句 + 路由规则）
- 首轮硬锚定：首个核心工具调用前仅 `Bash`/`exec_command` + `apply_patch`
- 双后端：默认一次性 `codex exec` 子进程；可选原生 `router_*` agents（不强制开启多智能体配置）
- 零运行时依赖；安装/卸载脚本幂等且可逆；Codex 直装，不依赖 CC Switch
- 模型适配：**本套件专门面向 Codex + DeepSeek 设计；仅 Codex + DeepSeek V4 Flash 组合实测；DeepSeek V4 Pro 未测试，效果未验证**
- DeepSeek 特定适配：Flash 分支 persona 默认、RL 接口还原（`model_instructions_file` + 首轮 bash/apply_patch）、深度自适应引导、中文分类关键词扩展（规划/计划/方案/阅读/移植）

## 安装

- **完整安装（hooks + MCP + 技能 + agents）**：解压后运行 `install.ps1`（Windows PowerShell），重启 Codex 并信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。
- **纯技能用法**：把 `skills/dsh-router` 复制或软链接到 `~/.codex/skills/`（或其他 SKILL.md agent 的 skills 目录）。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明（机制映射、接口契约、双后端、测试、模型适配状态）。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.0.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## Overview (English)

**codex-deepseek-routing-suite** is a Codex port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite): task-aware reasoning-mode routing (spec / react / weak) with first-turn persona injection, tool anchoring, and dual-backend mode isolation via Hooks + MCP tools.

- Thanks to the original author [yjh051108](https://github.com/yjh051108) and the **风神插件 (Fengshen plugin)**

- `model_instructions_file` persona replacement is the only release form
- First-turn hard anchoring: only `Bash`/`exec_command` and `apply_patch` until the first core tool call
- Dual backend: one-shot `codex exec` subprocess by default; optional native `router_*` agents (no forced multi-agent config)
- Zero runtime dependencies; idempotent install/uninstall; direct Codex install, no CC Switch dependency
- Model status: **designed for Codex + DeepSeek; tested on Codex + DeepSeek V4 Flash only; DeepSeek V4 Pro NOT tested**
- DeepSeek-specific adaptations: Flash-branch personas by default, RL interface restoration (`model_instructions_file` + first-turn bash/apply_patch), depth-adaptive guidance, and Chinese planning/porting keyword classification

### Install

- Full install (hooks + MCP + skill + agents): unzip and run `install.ps1`, restart Codex, trust the two hooks, verify with `dev_router_status`.
- Skill-only: copy or symlink `skills/dsh-router` into `~/.codex/skills/`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.0.zip` (top-level folder `codex-deepseek-routing-suite/`).
