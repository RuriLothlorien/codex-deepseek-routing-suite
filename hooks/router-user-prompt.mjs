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

const PRESET_RE = /^#preset[=\s]+(standard|spec|react)\b/i

/** Per-preset guidance (portable layer from upstream router-standard/spec/react). */
const PRESET_GUIDES = {
  standard:
    '\nAttention engineering: keep the WHOLE deliverable working while iterating; if one detail stalls several rounds, preserve a working version, finish the rest, re-attack it fresh. On verification failure, first question your hypothesis and the new evidence, then check gates. Assetize context: keep task goal + current decision + live evidence in focus; sink settled exploration into memory; drop stale threads. Act proactively on reversible next steps and report actions with evidence. Keep meta instructions lean.',
  spec:
    '\nDeep-think first: the long first-turn reasoning chain is a feature, not a defect. Read and understand before acting; keep all context; produce a decision-complete plan before touching code.',
  react:
    '\nThink-act loop: write → verify → fix, keeping the loop tight. Do not build test harnesses, scaffolding, or ceremony the user did not ask for. Finish with a usable deliverable and a short summary.',
}

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
const cfg = readConfig()
if (text && !state.firstUserText) {
  let firstText = text
  let sessionPreset = null
  const m = text.match(PRESET_RE)
  if (m) {
    sessionPreset = m[1].toLowerCase()
    firstText = text.replace(PRESET_RE, '').trim()
  }
  const lockedPreset = sessionPreset || cfg.preset || 'standard'
  state = writeState(sessionId, {
    firstUserText: firstText,
    complexity: isComplexTask(firstText),
    model,
    preset: lockedPreset,
  })
}

const first = state.firstUserText || text
const effectivePreset = state.preset || cfg.preset || 'standard'
let mode
let band
if (effectivePreset === 'spec') {
  mode = 0
  band = 'spec'
} else if (effectivePreset === 'react') {
  mode = 1
  band = 'react'
} else {
  mode = state.override ?? classifyTask(first)
  band = bandOf(mode)
}
state = writeState(sessionId, { mode, band, model })

// DSH parity: plan mode toggles only the host's plan:policy prompt section;
// the router keeps injecting its persona and near-field guidance. Codex
// preserves its own plan-mode instructions, so there is no plan-mode skip.
if (!text) {
  process.stdout.write(JSON.stringify({}))
  process.exit(0)
}

let persona
let context
if (effectivePreset === 'spec') {
  persona = personaFor(0, routerModelFor(model))
  context = OVERRIDE_PREFIX + persona + PRESET_GUIDES.spec
} else if (effectivePreset === 'react') {
  persona = personaFor(1, routerModelFor(model))
  context = OVERRIDE_PREFIX + persona + PRESET_GUIDES.react
} else {
  persona = cfg.routerMode === 'standard' ? RL_PERSONA : personaFor(mode, routerModelFor(model))
  context = OVERRIDE_PREFIX + persona
  if (band === 'weak') {
    context += state.complexity ? GUIDE_DEEP : GUIDE_WEAK
  }
  context += PRESET_GUIDES.standard
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: context,
  },
}))
process.exit(0)
