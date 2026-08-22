# codex-deepseek-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-deepseek-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-deepseek-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-deepseek-routing-suite?style=social)

> English | [中文](README.md)

A Codex port of **dsh-routing-suite**: task-aware reasoning-mode routing (spec / react / weak) via Hooks + MCP tools, with first-turn tool anchoring.

> ⚠️ **Model status**: tested and tuned on **Codex (desktop/CLI) with DeepSeek V4 Flash** only. **DeepSeek V4 Pro and other models/hosts are NOT tested**; the Pro branch in `router-core.mjs` is inherited from the original project and should be treated as unverified.

## Highlights

- Classifies each session from its first user message: build → react, fix/refactor/planning → spec, ambiguous → weak.
- First-turn hard anchoring: only `Bash`/`exec_command` and `apply_patch` until the first core tool call, then the full catalog unlocks.
- Per-turn persona + near-field guidance injection; plan-mode behavior matches the original DSH preset.
- Dual-backend mode isolation: one-shot `codex exec` subprocess (default) or optional native `router_*` agents — no forced multi-agent config.
- `model_instructions_file` persona replacement is the only release form.
- Zero runtime dependencies; idempotent install/uninstall; no CC Switch dependency.

## Install

Full install (hooks + MCP + skill + agents):

```powershell
.\install.ps1
```

Then restart Codex, trust the two new hooks (`codex /hooks` or the desktop trust prompt), and verify with `dev_router_status` in a new session.

Skill-only usage: copy or symlink `skills/dsh-router` into `~/.codex/skills/` (or your agent's skills directory).

## Docs

- `docs/architecture.md` — mechanism mapping, contracts, and model status.
- `CHANGELOG.md` — version history.

## License

MIT (see NOTICE for original project attribution).
