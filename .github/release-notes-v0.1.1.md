## 更新内容（自 v0.1.0）

- **跨平台安装**：新增 `install.mjs` / `uninstall.mjs`（Windows / macOS / Linux，支持 `--home` 与 `--dry-run`）；macOS/Linux 提供 `install.sh` / `uninstall.sh`；Windows 保留 `install.ps1` / `uninstall.ps1`。
- **Agent 形态**：明确 Codex 桌面端与 CLI 兼容（共用同一套 hooks/MCP/技能配置）。
- `dev_mode_subagent`：CLI 探测补充 PATH 回退（macOS/Linux）。
- 文档：README 中英同步；`docs/architecture.md` 新增“平台与 Agent 形态兼容”。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.1.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## What's new (since v0.1.0)

- **Cross-platform install**: added `install.mjs` / `uninstall.mjs` (Windows / macOS / Linux, with `--home` and `--dry-run`); `install.sh` / `uninstall.sh` for macOS/Linux; Windows keeps `install.ps1` / `uninstall.ps1`.
- **Agent forms**: Codex desktop and CLI are both supported (shared hooks/MCP/skill configuration).
- `dev_mode_subagent`: added PATH-based CLI discovery fallback (macOS/Linux).
- Docs: README zh/en synced; `docs/architecture.md` gained a platform and agent-form compatibility section.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.1.zip` (top-level folder `codex-deepseek-routing-suite/`).
