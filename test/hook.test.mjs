/**
 * Hook scenario tests: feed crafted stdin JSON to each hook and assert the
 * stdout contract and persisted state. ROUTER_HOME is pointed at a fresh
 * temp directory per invocation so real state is never touched.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const HOOKS_DIR = join(import.meta.dirname, '..', 'hooks')

function runHook(name, input, { seedState, seedConfig } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'router-hook-'))
  if (seedConfig) {
    writeFileSync(join(home, 'config.json'), JSON.stringify(seedConfig), 'utf8')
  }
  const sessionId = input.session_id
  if (seedState) {
    mkdirSync(join(home, 'state'), { recursive: true })
    writeFileSync(join(home, 'state', `${sessionId}.json`), JSON.stringify(seedState), 'utf8')
  }
  const res = spawnSync(process.execPath, [join(HOOKS_DIR, name)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ROUTER_HOME: home },
  })
  let output = {}
  try { output = JSON.parse(res.stdout || '{}') } catch { /* keep {} */ }
  let state = null
  const stateDir = join(home, 'state')
  if (existsSync(stateDir)) {
    const files = readdirSync(stateDir)
    if (files.length > 0) {
      try { state = JSON.parse(readFileSync(join(stateDir, files[0]), 'utf8')) } catch { /* keep null */ }
    }
  }
  return { status: res.status, output, state, stderr: res.stderr }
}

const BASE_INPUT = {
  session_id: 'test-session-1',
  cwd: 'C:\\work',
  model: 'deepseek-v4-flash',
  permission_mode: 'default',
  turn_id: 'turn-1',
}

test('user-prompt: build task -> react band with RL persona in standard mode', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '帮我开发一个马里奥网页小游戏',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('You are a helpful software engineer assistant.'), ctx)
  assert.equal(state.band, 'react')
  assert.equal(state.mode, 1)
})

test('user-prompt: spec mode build task -> hands-on persona', () => {
  const { output } = runHook(
    'router-user-prompt.mjs',
    { ...BASE_INPUT, prompt: '帮我开发一个马里奥网页小游戏' },
    { seedConfig: { routerMode: 'spec' } },
  )
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('hands-on'), `react persona expected, got: ${ctx}`)
})

test('user-prompt: fix task -> spec band', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '修复这个仓库里的 bug',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('You are a helpful software engineer assistant.'), ctx)
  assert.equal(state.band, 'spec')
  assert.equal(state.mode, 0)
})

test('user-prompt: planning/porting task -> spec band (方案A)', () => {
  const { state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '阅读 /tmp/legacy-project，规划一个在我的Codex上完整实现的最佳移植方案',
  })
  assert.equal(state.band, 'spec')
  assert.equal(state.mode, 0)
})

test('user-prompt: ambiguous task -> weak band with classify guide', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '今天天气怎么样',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('classify this task'), `weak guide expected, got: ${ctx}`)
  assert.equal(state.band, 'weak')
  assert.equal(state.mode, 'weak')
})

test('user-prompt: spec mode weak persona includes flash anchors', () => {
  const { output } = runHook(
    'router-user-prompt.mjs',
    { ...BASE_INPUT, prompt: '今天天气怎么样' },
    { seedConfig: { routerMode: 'spec' } },
  )
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('review what you have already done'), `flash anchors expected, got: ${ctx}`)
  assert.ok(ctx.includes('classify this task'))
})

test('user-prompt: unsupported model disables workflow (no injection)', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    model: 'gpt-5',
    prompt: '帮我开发一个网页游戏',
  })
  assert.equal(output.hookSpecificOutput, undefined)
  assert.equal(state.supported, false)
})

test('pre-tool: unsupported model allows everything (workflow disabled)', () => {
  const { output } = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, model: 'gpt-5', tool_name: 'mcp__some_server__do_thing', tool_input: {} },
    {
      seedState: {
        mode: 1, band: 'react', firstUserText: '', complexity: null, promoted: false,
        override: null, model: 'gpt-5', supported: false, modelClass: null,
      },
    },
  )
  assert.equal(output.hookSpecificOutput, undefined)
})

test('pre-tool: unsupported model without prior state allows everything', () => {
  const { output } = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, model: 'gpt-5', tool_name: 'mcp__some_server__do_thing', tool_input: {} },
  )
  assert.equal(output.hookSpecificOutput, undefined)
})

test('user-prompt: complex weak task locks the deep guide', () => {
  const longPrompt = '请先通读这份材料，然后给出你的看法。'.repeat(8)
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: longPrompt,
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('Think deeply about the architecture'), ctx)
  assert.equal(state.complexity, true)
})

test('user-prompt: plan mode still injects persona (DSH parity)', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    permission_mode: 'plan',
    prompt: '修复这个仓库里的 bug，规划实施方案',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('You are a helpful software engineer assistant.'), ctx)
  assert.equal(state.band, 'spec')
})

test('user-prompt: override wins over classification', () => {
  const { output, state } = runHook(
    'router-user-prompt.mjs',
    { ...BASE_INPUT, prompt: '修复这个仓库里的 bug' },
    {
      seedState: { mode: null, band: null, firstUserText: '', complexity: null, promoted: false, override: 1, model: null },
      seedConfig: { routerMode: 'spec' },
    },
  )
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.ok(ctx.includes('hands-on'), `override react expected, got: ${ctx}`)
  assert.equal(state.override, 1)
})

test('user-prompt: #preset react directive fixes react behavior and strips directive', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '#preset react 帮我开发一个网页游戏',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.equal(state.preset, 'react')
  assert.equal(state.mode, 1)
  assert.equal(state.band, 'react')
  assert.equal(state.firstUserText, '帮我开发一个网页游戏')
  assert.ok(ctx.includes('hands-on'), ctx)
  assert.ok(ctx.includes('Think-act loop'), ctx)
})

test('user-prompt: #preset=spec directive fixes deep-think behavior', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '#preset=spec 修复这个仓库里的 bug',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.equal(state.preset, 'spec')
  assert.equal(state.mode, 0)
  assert.equal(state.band, 'spec')
  assert.equal(state.firstUserText, '修复这个仓库里的 bug')
  assert.ok(ctx.includes('Deep-think first'), ctx)
})

test('user-prompt: unknown #preset name is ignored', () => {
  const { state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '#preset turbo 帮我开发一个网页游戏',
  })
  assert.equal(state.preset, 'standard')
  assert.equal(state.firstUserText, '#preset turbo 帮我开发一个网页游戏')
  assert.equal(state.mode, 1)
})

test('user-prompt: config preset=spec locks spec without directive', () => {
  const { output, state } = runHook(
    'router-user-prompt.mjs',
    { ...BASE_INPUT, prompt: '帮我开发一个网页游戏' },
    { seedConfig: { preset: 'spec' } },
  )
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.equal(state.preset, 'spec')
  assert.equal(state.mode, 0)
  assert.equal(state.band, 'spec')
  assert.ok(ctx.includes('Deep-think first'), ctx)
})

test('user-prompt: standard preset keeps routing and adds attention guide', () => {
  const { output, state } = runHook('router-user-prompt.mjs', {
    ...BASE_INPUT,
    prompt: '帮我开发一个马里奥网页小游戏',
  })
  const ctx = output.hookSpecificOutput?.additionalContext || ''
  assert.equal(state.preset, 'standard')
  assert.equal(state.mode, 1)
  assert.equal(state.band, 'react')
  assert.ok(ctx.includes('Attention engineering'), ctx)
  assert.ok(ctx.includes('Codex native memories'), ctx)
  assert.ok(ctx.includes('dev_delivery_check'), ctx)
})

test('user-prompt: first prompt is locked for the session', () => {
  const seeded = {
    mode: null, band: null, firstUserText: '修复这个仓库里的 bug',
    complexity: false, promoted: false, override: null, model: 'deepseek-v4-flash',
  }
  const { output, state } = runHook(
    'router-user-prompt.mjs',
    { ...BASE_INPUT, prompt: '帮我开发一个网页游戏' },
    { seedState: seeded },
  )
  assert.equal(state.firstUserText, '修复这个仓库里的 bug')
  assert.equal(state.band, 'spec')
})

test('pre-tool: denies non-core tool before promotion', () => {
  const { output, state } = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, tool_name: 'mcp__some_server__do_thing', tool_input: {} },
    { seedState: { mode: 1, band: 'react', firstUserText: '', complexity: null, promoted: false, override: null, model: 'deepseek-v4-flash', supported: true, modelClass: 'flash' } },
  )
  assert.equal(output.hookSpecificOutput?.permissionDecision, 'deny')
  assert.match(output.hookSpecificOutput?.permissionDecisionReason || '', /router anchoring/)
  assert.equal(state.promoted, false)
})

test('pre-tool: core call promotes, then everything is allowed', () => {
  const seed = { mode: 1, band: 'react', firstUserText: '', complexity: null, promoted: false, override: null, model: 'deepseek-v4-flash', supported: true, modelClass: 'flash' }
  const first = runHook('router-pre-tool.mjs', { ...BASE_INPUT, tool_name: 'apply_patch', tool_input: {} }, { seedState: seed })
  assert.equal(first.output.hookSpecificOutput, undefined)
  assert.equal(first.state.promoted, true)
  const second = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, tool_name: 'mcp__some_server__do_thing', tool_input: {} },
    { seedState: { ...seed, promoted: true } },
  )
  assert.equal(second.output.hookSpecificOutput, undefined)
})

test('pre-tool: anchoring=false allows everything', () => {
  const { output } = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, tool_name: 'mcp__some_server__do_thing', tool_input: {} },
    { seedState: { mode: 1, band: 'react', firstUserText: '', complexity: null, promoted: false, override: null, model: 'deepseek-v4-flash', supported: true, modelClass: 'flash' }, seedConfig: { anchoring: false } },
  )
  assert.equal(output.hookSpecificOutput, undefined)
})

test('pre-tool: plan mode still anchors until first core call (DSH parity)', () => {
  const seed = { mode: 1, band: 'react', firstUserText: '', complexity: null, promoted: false, override: null, model: 'deepseek-v4-flash', supported: true, modelClass: 'flash' }
  const denied = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, permission_mode: 'plan', tool_name: 'mcp__some_server__do_thing', tool_input: {} },
    { seedState: seed },
  )
  assert.equal(denied.output.hookSpecificOutput?.permissionDecision, 'deny')
  assert.equal(denied.state.promoted, false)
  const promoted = runHook(
    'router-pre-tool.mjs',
    { ...BASE_INPUT, permission_mode: 'plan', tool_name: 'apply_patch', tool_input: {} },
    { seedState: seed },
  )
  assert.equal(promoted.output.hookSpecificOutput, undefined)
  assert.equal(promoted.state.promoted, true)
})
