# codex-deepseek-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-deepseek-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-deepseek-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-deepseek-routing-suite?style=social)

> English | [中文](README.md)

A Codex port of **[dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)**: task-aware reasoning-mode routing (spec / react / weak) via Hooks + MCP tools, with first-turn tool anchoring.

If this suite helps you, please give it a ⭐.

> ⚠️ **Model status**: designed specifically for **Codex + DeepSeek**; tested and tuned on **Codex (desktop/CLI) with DeepSeek V4 Flash**. **DeepSeek V4 Pro is NOT tested**; the Pro branch in `router-core.mjs` is inherited from the original project and should be treated as unverified.

## Acknowledgments

Thanks to **风神插件 (Fengshen plugin)** by [yjh051108](https://github.com/yjh051108). This suite is a port of [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) (MIT); original attribution is in NOTICE.

## Why (when Codex/ChatGPT is the agent for DeepSeek)

Measured on DeepSeek (P1-P30 in the original project), when Codex/ChatGPT acts as DeepSeek's agent, these adaptations are not optional:

- Behavior along the persona axis collapses into stable bands (spec / mixed trap / react); V4 Flash is threshold-like (0-0.5 all spec, jumps at 0.75+).
- The first request commits the path: persona and tool-schema surface decide the whole trajectory; mid-session mode switches are mostly ineffective and invalidate the prefix cache.
- RL interface restoration matters: shell + editor only yields 100% action with shorter reasoning; the full catalog dilutes first-turn attention, and first-turn prefill is the most expensive (cache hits are ~10x cheaper).
- Ambiguous tasks are better left to weak internal routing; Flash and Pro need different optimal personas (neutral + classify + anchors vs spec sentence + few-shot).

This suite turns those measurements into defaults for Codex + DeepSeek: band-based classification, first-turn anchoring, per-turn near-field injection, Flash-branch personas by default, Chinese planning/porting classification fixes, and depth-adaptive guidance.

## Highlights

- The only release form: `model_instructions_file` replaces the built-in identity (RL sentence + routing rules), with per-turn persona/guidance injected by hooks.
- Four MCP tools + self-test: `dev_router_status` / `dev_router_mode` / `dev_mode_subagent` / `dev_router_test`.
- Zero runtime dependencies: hooks and the MCP server are zero-dependency Node scripts; install/uninstall are idempotent and reversible.
- Optional native multi-agent backend: `router_spec` / `router_react` / `router_weak` custom agents.
- Direct Codex install; if you manage configs with CC Switch, you can optionally sync with the [CCSwitch-operations](https://github.com/RuriLothlorien/CCSwitch-operations) skill.

## How it works

- `UserPromptSubmit` hook: records the first user message, classifies the session, and returns persona + guidance (`additionalContext`) per turn.
- `PreToolUse` hook: only core tools pass before the first tool call, then `promoted=true` unlocks the full catalog.
- Session state is persisted under `~/.codex/routing-suite/state/`, so resume/continuation does not lose it.
- The MCP server reads/writes the same state: view or switch modes, run self-tests, and spawn isolated subprocesses.

## DeepSeek-specific adaptations

Designed for Codex + DeepSeek and tested on **DeepSeek V4 Flash**:

- Flash-branch personas are the default: weak mode uses the Flash optimum (neutral + classify-then-act + recall/convergence/anti-runaway anchors, P11/P23). The Pro branch from the original project is retained but untested.
- RL interface restoration: `model_instructions_file` injects the RL sentence plus routing rules; the first-turn core surface is `Bash`/`exec_command` + `apply_patch` (the Codex equivalent of the original shell + str_replace_editor RL shape).
- Depth-adaptive guidance via `isComplexTask` (long text or architecture keywords, including Chinese): deep guide for complex tasks, fast guide for simple ones (P30).
- Chinese task classification adaptation: `SPEC_RE` adds 规划/计划/方案/阅读/移植 to keep Chinese planning/porting tasks from being misrouted to react.
- Mode-isolated subprocesses use `model_instructions_file` replacement, strip desktop thread env vars, and disable hooks/memories; `reasoning` maps to `model_reasoning_effort`.
- Strict model gating: the model slug precisely distinguishes Flash / Pro; the Flash family includes `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp`. Any other model (e.g., `deepseek-chat`, other models, missing) disables the suite workflow entirely (no injection, no anchoring, subagent refused).
- Measurements cited (P11/P23/P24/P30) come from the original project's DSH environment; this port is tested on Codex + V4 Flash.

## Repository structure

```text
codex-deepseek-routing-suite/
├─ hooks/                  # UserPromptSubmit + PreToolUse hooks
├─ mcp/server.mjs          # zero-dependency MCP server (dev_router_*)
├─ skills/dsh-router/      # skill manual and persona references
├─ agents/                 # optional native agents (router_*)
├─ instructions/base.md    # base instructions for persona replacement
├─ test/                   # 32 tests in the repo (31 in-session self-test)
├─ docs/architecture.md    # mechanism mapping, contracts, model status
├─ install.mjs / uninstall.mjs  # cross-platform install/uninstall (recommended)
├─ install.sh / uninstall.sh    # macOS/Linux POSIX entrypoints
├─ install.ps1 / uninstall.ps1  # Windows PowerShell versions
├─ LICENSE / NOTICE / CHANGELOG.md
└─ README.md / README.en.md
```

## Install

Full install (hooks + MCP + skill + agents; Windows / macOS / Linux):

```sh
node install.mjs        # cross-platform (recommended); on Windows PowerShell: .\install.ps1
./install.sh            # macOS/Linux (POSIX entrypoint for the Node installer)
```

Then restart Codex (desktop or CLI), trust the two new hooks (`codex /hooks` or the desktop trust prompt), and verify with `dev_router_status` in a new session.

Skill-only usage: copy or symlink `skills/dsh-router` into `~/.codex/skills/` (or your agent's skills directory).

## Dual-backend mode isolation

| Backend | How to trigger | Dependency |
|---|---|---|
| MCP exec (default) | `dev_mode_subagent <spec\|react\|weak> <task> [reasoning=...]` | none (one-shot `codex exec` subprocess) |
| Native multi-agent (optional) | `spawn_agent(agent_type="router_spec"\|"router_react"\|"router_weak", message="<task>")` | session has `spawn_agent`; **does not force** `features.multi_agent` |

`dev_router_status` shows whether the three agents are installed via its `nativeAgents` field.

## Uninstall

```sh
node uninstall.mjs      # cross-platform (recommended); on Windows PowerShell: .\uninstall.ps1
./uninstall.sh          # macOS/Linux (POSIX entrypoint for the Node uninstaller)
```

## Docs

- `docs/architecture.md` — mechanism mapping, contracts, and model status.
- `CHANGELOG.md` — version history.

## Compatibility

- Upstream source: ported from the **dsh-router-standard** preset (preset package v0.2.0) in [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) (upstream component tag v0.3.0); `router-core.mjs` is that preset's core, plus the Chinese classification keyword extension.
- Codex desktop / CLI (tested on 0.149+); Node >= 22; entrypoints: `node install.mjs` (cross-platform), `./install.sh` (macOS/Linux), `.\install.ps1` (Windows).
- Platforms: Windows / macOS / Linux.
- Agent forms: Codex desktop and CLI both work (they share the same hooks/MCP/skill configuration); desktop is tested, CLI uses the same mechanism.
- Model: designed for Codex + DeepSeek; tested on V4 Flash; V4 Pro untested.
- License: MIT (original attribution in NOTICE).

## License

MIT (see NOTICE for original project attribution).
