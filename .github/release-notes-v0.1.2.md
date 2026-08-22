## 更新内容（自 v0.1.1）

- **严格模型门控**：自动识别 DeepSeek Flash / Pro 并分配对应 persona；二者皆非（其他厂商 `*-flash`/`*-pro`、`deepseek-chat`、缺失）时套件工作流整体停用——钩子不注入、不锚定，`dev_mode_subagent` 拒绝执行。
- **Flash 家族兼容**：`deepseek-v4-flash-vision-exp` 等含 `flash` 的 DeepSeek 变体纳入 Flash 分支。
- **修复**：`dev_mode_subagent` 的 `sessionId` 声明顺序隐患；`dev_router_status` 新增 `supported` 字段。
- 文档：README（中/英）新增“自动模型识别”亮点与门控说明；CHANGELOG、release 说明按版本维护。

## 安装

- **完整安装（Windows / macOS / Linux）**：解压后运行 `node install.mjs`（Windows 亦可用 `install.ps1`，macOS/Linux 可用 `./install.sh`），重启 Codex（桌面端或 CLI），信任两个新钩子（`codex /hooks` 或桌面端信任提示），新会话用 `dev_router_status` 验证。

## 文档

仓库内 `README.md` / `README.en.md` 与 `docs/architecture.md` 提供完整说明。

## 资源

- 发布包：附件 `codex-deepseek-routing-suite-v0.1.2.zip`（顶层目录 `codex-deepseek-routing-suite/`）。

---

## What's new (since v0.1.1)

- **Strict model gating**: auto-detect DeepSeek Flash / Pro and apply matching personas; anything else (other vendors' `*-flash`/`*-pro`, `deepseek-chat`, missing) disables the workflow entirely — no injection, no anchoring, subagent refused.
- **Flash family compatibility**: DeepSeek variants containing `flash` (e.g., `deepseek-v4-flash-vision-exp`) are treated as Flash.
- **Fixes**: `sessionId` declaration-order bug in `dev_mode_subagent`; `dev_router_status` now reports `supported`.
- Docs: README (zh/en) added the automatic model detection highlight and gating notes; CHANGELOG and release notes are maintained per version.

### Install

- Full install (Windows / macOS / Linux): unzip and run `node install.mjs` (or `install.ps1` on Windows, `./install.sh` on macOS/Linux), restart Codex (desktop or CLI), trust the two hooks, verify with `dev_router_status`.

### Docs

See `README.md` / `README.en.md` and `docs/architecture.md`.

### Assets

- `codex-deepseek-routing-suite-v0.1.2.zip` (top-level folder `codex-deepseek-routing-suite/`).
