## 更新内容（自 v0.1.2）

- **修复**：安装器重复运行会在 `~/.codex/config.toml` 中累积空白行（`install.mjs` / `install.ps1` 替换标记块时未消费残留换行）。现在替换时归一化空白，并清理 3+ 连续换行；`uninstall.mjs` / `uninstall.ps1` 同步清理卸载后残留空行。
- 影响平台：Windows / macOS / Linux（`install.sh` 委托 `install.mjs`，同一修复）。
- 测试：新增安装器幂等回归（连续安装 config.toml 不变、无 3+ 连续换行）；仓库测试 40 例。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.3.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## What's new (since v0.1.2)

- **Fix**: repeated installer runs accumulated blank lines in `~/.codex/config.toml` (`install.mjs` / `install.ps1` did not consume leftover newlines when replacing marker blocks). Replacement now normalizes whitespace and collapses 3+ consecutive newlines; `uninstall.mjs` / `uninstall.ps1` also clean up leftover blank lines after removing marker blocks.
- Platforms affected and fixed: Windows / macOS / Linux (`install.sh` delegates to `install.mjs`, same fix).
- Tests: added installer idempotency regression (config unchanged across repeated installs, no 3+ consecutive newlines); 40 repo tests.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.3.zip` (top-level folder `codex-deepseek-routing-suite/`).
