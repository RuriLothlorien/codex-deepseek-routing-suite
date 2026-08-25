# codex-dsh-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-dsh-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-dsh-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-dsh-routing-suite?style=social)

> English | [中文](README.md)

A Codex port of **[dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)**: task-aware reasoning-mode routing (spec / react / weak) via Hooks + MCP tools, with first-turn tool anchoring.

If this suite helps you, please give it a ⭐.

> ⚠️ **Model status**: designed specifically for **Codex + DeepSeek**; tested and tuned on **Codex (desktop/CLI) with DeepSeek V4 Flash**. **DeepSeek V4 Pro is NOT tested**; the Pro branch in `router-core.mjs` is inherited from the original project and should be treated as unverified. **Validation**: multi-scenario checks (plan mode, ambiguous tasks, multi-turn complex sessions) were performed in real Codex sessions; see [docs/validation-report.md](docs/validation-report.md).

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

- **Persona replacement (the only release form)**: `model_instructions_file` injects the RL sentence + routing rules (RL interface restoration); the first-turn core surface is `Bash`/`exec_command` + `apply_patch`; hooks add per-turn persona/guidance.
- **Task-aware routing + first-turn anchoring**: build → react, fix/refactor/planning → spec, ambiguous → weak; only core tools pass until the first tool call, then the full catalog unlocks.
- **Automatic model detection + Flash-branch defaults**: the slug is precisely classified as DeepSeek Flash / Pro (Flash family includes `deepseek-v4-flash-vision-exp`); weak mode uses the Flash-optimal persona (neutral + classify + recall/convergence/anti-runaway anchors, P11/P23); non-DeepSeek or unrecognized models disable the workflow entirely; the Pro branch is retained but untested.
- **Depth-adaptive guidance**: `isComplexTask` (long text or architecture keywords, including Chinese) selects deep/fast guides (P30).
- **Chinese classification adaptation**: `SPEC_RE` adds 规划/计划/方案/阅读/移植 to keep Chinese planning/porting tasks from being misrouted to react.
- **Three-preset switching (standard/spec/react)**: select the behavior package via the `preset` key in `config.json` (default `standard`) or a first-turn `#preset <name>` directive; `standard` = task routing + attention-engineering guidance, `spec` = fixed deep-think, `react` = fixed tight-loop.
- **Dual-backend mode isolation**:
  - Default: one-shot `codex exec` subprocess via `dev_mode_subagent <spec|react|weak> <task> [reasoning=...]` — full `model_instructions_file` replacement, desktop thread env stripped, hooks/memories disabled, `reasoning` maps to `model_reasoning_effort`; no multi-agent config required.
  - Optional: native agents via `spawn_agent(agent_type="router_spec"|"router_react"|"router_weak", message="<task>")` when the session has `spawn_agent`; does not force `features.multi_agent`.
  - `dev_router_status` shows `nativeAgents` installation status.
- **Four MCP tools + self-test**: `dev_router_status` / `dev_router_mode` / `dev_mode_subagent` / `dev_router_test`.
- **Zero runtime dependencies**: zero-dependency Node hooks/MCP; idempotent install/uninstall; direct Codex install (optional CC Switch sync via [CCSwitch-operations](https://github.com/RuriLothlorien/CCSwitch-operations)).
- Measurements cited (P11/P23/P24/P30) come from the original project's DSH environment; this port is tested on Codex + V4 Flash.

## Usage (preset switching)

The suite ships three presets that define a session's behavior package; the default is `standard`.

### 1. Persistent default: config.json

Edit `~/.codex/codex-dsh-routing-suite/config.json`:

```json
{ "preset": "standard" }
```

Values: `standard` (default; task routing + attention-engineering guidance), `spec` (fixed deep-think), `react` (fixed tight-loop). Changes apply to **new sessions**.

### 2. Per-session shortcut: first-turn directive

Start the first message of a new session with:

```text
#preset spec fix the bug in this repo
#preset react build a web page
#preset standard help me review this project
```

- The directive is honored only on the **first real user message** and applies to the **current session only**.
- `#preset=<name>` is also accepted; an unknown preset name is treated as plain text.
- The directive text does not participate in task classification.
- Without a `#preset` directive in the first message, the session uses the `preset` value from `config.json` (default `standard`). Precedence: **first-turn directive > config.json > built-in default `standard`**.

### 3. Behavior of the three presets

| preset | Behavior |
|---|---|
| `standard` (default) | Auto-routes tasks to spec / react / weak; persona follows the route; appends attention-engineering guidance (anti-local-optima / doubt-the-hypothesis / attention recycling / proactivity / lean meta) |
| `spec` | Fixed deep-think: read before writing, think the first turn through (long reasoning is a feature); persona = SPEC |
| `react` | Fixed tight loop: write → verify → fix, no ceremony; persona = REACT |

### 4. Verify

Run `dev_router_status` in a new session; the `preset=standard|spec|react` line shows the active preset.

## How it works

- `UserPromptSubmit` hook: records the first user message, classifies the session, and returns persona + guidance (`additionalContext`) per turn.
- `PreToolUse` hook: only core tools pass before the first tool call, then `promoted=true` unlocks the full catalog.
- Session state is persisted under `~/.codex/codex-dsh-routing-suite/state/`, so resume/continuation does not lose it.
- The MCP server reads/writes the same state: view or switch modes, run self-tests, and spawn isolated subprocesses.
- **Presets**: `standard` (default; task routing + attention-engineering guidance) / `spec` (fixed deep-think) / `react` (fixed tight-loop); the first-turn `#preset <name>` directive applies to the current session only — change the default by editing the `preset` key in `config.json`.

### Security analysis

- Fully local: hooks and the MCP server are zero-dependency local Node scripts; routing itself (classification, injection, anchoring, state) makes no network requests and sends no telemetry.
- Data boundaries: state is written only under `~/.codex/codex-dsh-routing-suite/state/` (session id, first message text, mode/complexity/promotion); no keys or tokens are read or stored.
- Least privilege: `UserPromptSubmit` only returns injected text; `PreToolUse` only returns allow/deny decisions and never executes commands for you; `model_instructions_file` points to a read-only Markdown file.
- Auditable and reversible: behavior can be reviewed in session transcripts; `config.json` and state files are human-inspectable; `uninstall.mjs` / `uninstall.sh` / `uninstall.ps1` remove the config markers, runtime, skill, and agents.
- Trust chain: the two hooks only run after you explicitly trust them (`codex /hooks` or the desktop prompt); all install/hook code is open source and reviewable.
- Subagent isolation: `dev_mode_subagent` runs in a local one-shot `codex exec` subprocess with desktop thread env stripped, hooks/memories disabled, and temp persona files removed afterwards; it reuses your existing codex CLI / DeepSeek API path and adds no credential storage.
- Model gating fallback: non-DeepSeek or unrecognized models automatically disable the workflow, reducing unintended intervention.

## Repository structure

```text
codex-dsh-routing-suite/
├─ hooks/                  # UserPromptSubmit + PreToolUse hooks
├─ mcp/server.mjs          # zero-dependency MCP server (dev_router_*)
├─ skills/codex-dsh-routing-suite/      # skill manual and persona references
├─ agents/                 # optional native agents (router_*)
├─ instructions/base.md    # base instructions for persona replacement
├─ test/                   # 39 tests in the repo (38 in-session self-test)
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

> **Optional**: to use the native-agents subagent backend (`spawn_agent`), manually enable Codex's multi-agent feature — set `features.multi_agent = true` in `~/.codex/config.toml` (or enable it in the desktop settings). The installer does **not** modify this setting automatically; the default `dev_mode_subagent` (one-shot `codex exec` subprocess) works without it.

## Uninstall

```sh
node uninstall.mjs      # cross-platform (recommended); on Windows PowerShell: .\uninstall.ps1
./uninstall.sh          # macOS/Linux (POSIX entrypoint for the Node uninstaller)
```

## Docs

- `docs/architecture.md` — mechanism mapping, contracts, and model status.
- `docs/validation-report.md` — validation test report (Chinese).
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
