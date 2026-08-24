## 更新内容（自 v0.1.3）

- **全局改名**：套件正式命名为 `codex-dsh-routing-suite`——技能、运行时目录（`~/.codex/codex-dsh-routing-suite`）、`config.toml` 标记块、MCP 服务器名与 persona 身份统一；上游 `dsh-routing-suite` / `dsh-router-standard` 署名与 `dev_router_*` 工具名保持不变。
- 安装器为全新安装形态（不包含旧版本迁移逻辑）；仓库测试 40 例。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-dsh-routing-suite-v0.1.4.zip`（顶层目录 `codex-dsh-routing-suite/`）。

---

## What's new (since v0.1.3)

- **Global rename**: the suite is now officially `codex-dsh-routing-suite` — skill, runtime directory (`~/.codex/codex-dsh-routing-suite`), `config.toml` marker blocks, MCP server name, and persona identity are unified; upstream `dsh-routing-suite` / `dsh-router-standard` attribution and the `dev_router_*` tool names are unchanged.
- The installer targets fresh installs only (no old-version migration logic); 40 repo tests.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-dsh-routing-suite-v0.1.4.zip` (top-level folder `codex-dsh-routing-suite/`).
