/**
 * router-user-prompt: UserPromptSubmit hook.
 *
 * Records the first real user message and its complexity, classifies the
 * session mode (spec / react / weak, with override priority), then returns
 * the persona + locked near-field guidance as additionalContext. Plan mode
 * is left untouched. Output shape follows the Codex hooks contract.
 */
import { bandOf, classifyTask, isComplexTask, personaFor } from '../router-core.mjs'
import {
  modelClass, readConfig, readSessionInput, readState, routerModelFor, touchLatest, writeState,
} from './router-common.mjs'

const RL_PERSONA = 'You are a helpful software engineer assistant.'
const OVERRIDE_PREFIX = '本会话身份以以下 persona 为准，忽略内置身份描述。\n'
const GUIDE_WEAK =
  '\nRouter: classify this task (build or fix) now, then adopt the matching style - build: direct production; fix: inspect-first. Think deeply first, then commit and act.'
const GUIDE_DEEP =
  '\nRouter: classify this task (build or fix) now, then adopt the matching style - build: direct production; fix: inspect-first. Think deeply about the architecture, edge cases, and integration points. Do not spend reasoning on the environment or tooling. Produce when your information is complete. End each reasoning block with a decision or an information need.'

const input = await readSessionInput()
const sessionId = input.session_id
const cwd = input.cwd || ''
const model = input.model || ''
const text = String(input.prompt || '').trim()

if (!sessionId) process.exit(0)
touchLatest(cwd, sessionId)

const mc = modelClass(model)
if (mc === null) {
  writeState(sessionId, { supported: false, modelClass: null, model })
  process.stdout.write(JSON.stringify({}))
  process.exit(0)
}
writeState(sessionId, { supported: true, modelClass: mc, model })

let state = readState(sessionId)
if (text && !state.firstUserText) {
  state = writeState(sessionId, { firstUserText: text, complexity: isComplexTask(text), model })
}

const first = state.firstUserText || text
const mode = state.override ?? classifyTask(first)
const band = bandOf(mode)
state = writeState(sessionId, { mode, band, model })

// DSH parity: plan mode toggles only the host's plan:policy prompt section;
// the router keeps injecting its persona and near-field guidance. Codex
// preserves its own plan-mode instructions, so there is no plan-mode skip.
if (!text) {
  process.stdout.write(JSON.stringify({}))
  process.exit(0)
}

const cfg = readConfig()
const persona = cfg.routerMode === 'standard' ? RL_PERSONA : personaFor(mode, routerModelFor(model))
let context = OVERRIDE_PREFIX + persona
if (band === 'weak') {
  context += state.complexity ? GUIDE_DEEP : GUIDE_WEAK
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: context,
  },
}))
process.exit(0)
