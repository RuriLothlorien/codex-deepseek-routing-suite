/**
 * router-pre-tool: PreToolUse hook implementing first-turn tool anchoring.
 *
 * Before the first core tool call of a session, only the core surface is
 * allowed (bash + apply_patch, plus band-specific extras). The first allowed
 * core call promotes the session; afterwards every tool passes. Plan mode and
 * anchoring=false bypass entirely.
 */
import { bandOf, classifyTask } from '../router-core.mjs'
import {
  matchesCore, modelClass, normalizeToolName, readConfig, readSessionInput, readState,
  touchLatest, writeState,
} from './router-common.mjs'

const input = await readSessionInput()
const sessionId = input.session_id
const cwd = input.cwd || ''
const toolName = input.tool_name || ''

if (!sessionId) process.exit(0)
touchLatest(cwd, sessionId)

const cfg = readConfig()
// DSH parity: the first-turn core-tool filter applies regardless of plan
// state (the original plugin never reads plan state).
if (!cfg.anchoring) process.exit(0)

let state = readState(sessionId)
if (state.supported === false) process.exit(0)
if (state.supported !== true) {
  // No UserPromptSubmit state yet: derive support from the hook's model field.
  const mc = modelClass(model)
  if (mc === null) {
    writeState(sessionId, { supported: false, modelClass: null, model })
    process.exit(0)
  }
  state = writeState(sessionId, { supported: true, modelClass: mc, model })
}
if (state.promoted) process.exit(0)

const mode = state.override ?? (state.mode ?? classifyTask(state.firstUserText || ''))
const band = bandOf(mode)
const core = new Set(['bash', 'apply_patch'])
const extras = band === 'spec' ? cfg.specExtraTools : band === 'react' ? cfg.reactExtraTools : []
for (const tool of extras) core.add(String(tool).toLowerCase())

const normalized = normalizeToolName(toolName)
if (matchesCore(normalized, core)) {
  writeState(sessionId, { promoted: true })
  process.exit(0)
}

const extraDesc = extras.length ? ` + ${extras.join(', ')}` : ''
const reason = `router anchoring: ${band} first-turn core is bash/apply_patch${extraDesc}; the full catalog unlocks after the first core tool call`
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  },
}))
process.exit(0)
