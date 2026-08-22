## 更新内容（自 v0.1.3）

- **全套件命名对齐**：技能、运行时目录（`~/.codex/codex-deepseek-routing-suite`）、`config.toml` 标记块、MCP 服务器名与 persona 身份统一为 `codex-deepseek-routing-suite`；旧 `dsh-router` 布局由安装器自动迁移（运行时目录改名保留会话状态、旧技能目录移除、旧标记块清理）。
- 兼容：上游 `dsh-routing-suite` / `dsh-router-standard` 署名与 `dev_router_*` 工具名保持不变。
- 测试：新增旧版 → 新版迁移回归；仓库测试 41 例。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.4.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## What's new (since v0.1.3)

- **Full suite naming alignment**: skill, runtime directory (`~/.codex/codex-deepseek-routing-suite`), `config.toml` marker blocks, MCP server name, and persona identity are now all `codex-deepseek-routing-suite`; the installer auto-migrates the legacy `dsh-router` layout (renames the runtime directory while preserving session state, removes the old skill directory, and cleans old marker blocks).
- Compatibility: upstream `dsh-routing-suite` / `dsh-router-standard` attribution and the `dev_router_*` tool names are unchanged.
- Tests: added a legacy-to-new migration regression; 41 repo tests.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.4.zip` (top-level folder `codex-deepseek-routing-suite/`).
