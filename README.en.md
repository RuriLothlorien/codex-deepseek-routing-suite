# codex-deepseek-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-deepseek-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-deepseek-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-deepseek-routing-suite?style=social)

> English | [中文](README.md)

A Codex port of **[dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)**: task-aware reasoning-mode routing (spec / react / weak) via Hooks + MCP tools, with first-turn tool anchoring.

> ⚠️ **Model status**: designed specifically for **Codex + DeepSeek**; tested and tuned on **Codex (desktop/CLI) with DeepSeek V4 Flash**. **DeepSeek V4 Pro is NOT tested**; the Pro branch in `router-core.mjs` is inherited from the original project and should be treated as unverified.

## Why DeepSeek-specific optimizations

Measured on DeepSeek (P1-P30 in the original project), these adaptations are not optional:

- Behavior along the persona axis collapses into stable bands (spec / mixed trap / react); V4 Flash is threshold-like (0-0.5 all spec, jumps at 0.75+).
- The first request commits the path: persona and tool-schema surface decide the whole trajectory; mid-session mode switches are mostly ineffective and invalidate the prefix cache.
- RL interface restoration matters: shell + editor only yields 100% action with shorter reasoning; the full catalog dilutes first-turn attention, and first-turn prefill is the most expensive (cache hits are ~10x cheaper).
- Ambiguous tasks are better left to weak internal routing; Flash and Pro need different optimal personas (neutral + classify + anchors vs spec sentence + few-shot).

This suite turns those measurements into defaults for Codex + DeepSeek: band-based classification, first-turn anchoring, per-turn near-field injection, Flash-branch personas by default, Chinese planning/porting classification fixes, and depth-adaptive guidance.

## Highlights

- Classifies each session from its first user message: build → react, fix/refactor/planning → spec, ambiguous → weak.
- First-turn hard anchoring: only `Bash`/`exec_command` and `apply_patch` until the first core tool call, then the full catalog unlocks.
- Per-turn persona + near-field guidance injection; plan-mode behavior matches the original DSH preset.
- Dual-backend mode isolation: one-shot `codex exec` subprocess (default) or optional native `router_*` agents — no forced multi-agent config.
- `model_instructions_file` persona replacement is the only release form.
- Zero runtime dependencies; idempotent install/uninstall; no CC Switch dependency.

## DeepSeek-specific adaptations

Designed for Codex + DeepSeek and tested on **DeepSeek V4 Flash**:

- Flash-branch personas are the default: weak mode uses the Flash optimum (neutral + classify-then-act + recall/convergence/anti-runaway anchors, P11/P23). The Pro branch from the original project is retained but untested.
- RL interface restoration: `model_instructions_file` injects the RL sentence plus routing rules; the first-turn core surface is `Bash`/`exec_command` + `apply_patch` (the Codex equivalent of the original shell + str_replace_editor RL shape).
- Depth-adaptive guidance via `isComplexTask` (long text or architecture keywords, including Chinese): deep guide for complex tasks, fast guide for simple ones (P30).
- Chinese task classification adaptation: `SPEC_RE` adds 规划/计划/方案/阅读/移植 to keep Chinese planning/porting tasks from being misrouted to react.
- Mode-isolated subprocesses use `model_instructions_file` replacement, strip desktop thread env vars, and disable hooks/memories; `reasoning` maps to `model_reasoning_effort`.
- Measurements cited (P11/P23/P24/P30) come from the original project's DSH environment; this port is tested on Codex + V4 Flash.

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

## Acknowledgments

Thanks to the original author [yjh051108](https://github.com/yjh051108) and the **风神插件 (Fengshen plugin)**. This suite is a port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) (MIT); original attribution is in NOTICE.

## License

MIT (see NOTICE for original project attribution).
