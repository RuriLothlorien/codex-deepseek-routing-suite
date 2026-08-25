## 更新内容（自 v0.1.4）

**大版本更新：追随上游（`yjh051108/dsh-routing-suite` main：router-standard v34 / router-spec v10 / router-react v17）**

- **三预设切换**：`config.json` 新增 `preset`（默认 `standard`）+ 首轮 `#preset <name>` / `\#preset <name>` 指令（仅当前会话）；`standard`=任务路由 + 注意力工程引导，`spec`=固定深思考，`react`=固定快循环；`dev_router_status` 输出 `preset`。
- **上游引导层对齐**：standard 并入注意力工程五支柱（防局部最优 / 质疑假设 / 注意力回收 / proactivity / 压上下文）；spec、react 各并入上游深思考 / 快循环引导。
- **交付证据门禁**：新增 MCP 工具 `dev_delivery_check`（8 类证据清单 + numeric 不变量 + 页面 reviewed 视觉证据）。
- **记忆策略**：不新增 engram 类工具；用 **Codex 原生记忆**做上下文资产化（引导层）。
- **修复**：`ROUTER_HOME` 指向新路径（改名遗漏）、支持 `\#preset` 转义、全套件命名统一 `codex-dsh-routing-suite`。
- 测试：仓库 58 例。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-dsh-routing-suite-v1.0.0.zip`（顶层目录 `codex-dsh-routing-suite/`）。

---

## What's new (since v0.1.4)

**Major release following upstream (`yjh051108/dsh-routing-suite` main: router-standard v34 / router-spec v10 / router-react v17)**

- **Three-preset switching**: new `preset` key in `config.json` (default `standard`) plus a first-turn `#preset <name>` / `\#preset <name>` directive (current session only); `standard` = task routing + attention-engineering guidance, `spec` = fixed deep-think, `react` = fixed tight-loop; `dev_router_status` reports `preset`.
- **Upstream guidance-layer alignment**: `standard` adopts the attention-engineering pillars (anti-local-optima / doubt-the-hypothesis / attention recycling / proactivity / lean meta); `spec` and `react` adopt the upstream deep-think and tight-loop guides.
- **Delivery evidence gate**: new MCP tool `dev_delivery_check` (8 evidence kinds + numeric invariants + reviewed visual evidence for pages).
- **Memory strategy**: no new engram tools; use **Codex native memories** for context assetization (guidance layer).
- **Fixes**: `ROUTER_HOME` now points to the new path (rename miss), `\#preset` escaped directives are honored, and the whole suite is uniformly named `codex-dsh-routing-suite`.
- Tests: 58 repo tests.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-dsh-routing-suite-v1.0.0.zip` (top-level folder `codex-dsh-routing-suite/`).
