/**
 * dsh-router MCP server (stdio, zero dependencies).
 *
 * Tools:
 *   dev_router_status(session_id?)     - current mode/band/persona/core/state
 *   dev_router_mode(mode, session_id?) - set or clear a session mode override
 *   dev_router_test()                  - run unit + hook scenario tests
 *   dev_mode_subagent(mode, task, cwd?) - run one task in an isolated persona
 *     via a one-shot `codex exec` subprocess (model_instructions_file
 *     replacement, hooks disabled). No multi-agent feature is used.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import {
  bandFor, bandOf, coreFor, parseMode, personaFor, testinessFor,
} from '../router-core.mjs'
import {
  LATEST_DIR, PERSONA_DIR, ROUTER_HOME, TMP_DIR, ensureDirs, readConfig, readState,
  resolveLatestSessionId, statePath, writeState,
} from '../hooks/router-common.mjs'

const TOOLS = [
  {
    name: 'dev_router_status',
    description: 'Show the dsh-router routing state for a session: mode, band, persona, first-turn core tools, promotion, override, anchoring and routerMode.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Optional session id; defaults to the most recently active session.' },
      },
    },
  },
  {
    name: 'dev_router_mode',
    description: 'Set the session reasoning mode override: spec / weak / mixed / react, a 0-100 number, a 0.0-1.0 number, or auto to clear the override. The next model request applies it.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'spec / weak / mixed / react / 0-100 / 0.0-1.0 / auto' },
        session_id: { type: 'string', description: 'Optional session id; defaults to the most recently active session.' },
      },
      required: ['mode'],
    },
  },
  {
    name: 'dev_router_test',
    description: 'Run the dsh-router unit tests and hook scenario tests; returns a PASS/FAIL summary.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'dev_mode_subagent',
    description: 'Run one task in a DIFFERENT reasoning mode inside a fresh one-shot Codex subprocess with its own persona (model_instructions_file replacement, hooks disabled). Modes: spec (plan-first) / weak (internal routing) / react (doer) / balanced. The current session is untouched. Returns the subprocess final message.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'spec / weak / react / balanced (or 0-100)' },
        task: { type: 'string', description: 'the task to hand to the mode-isolated subprocess' },
        cwd: { type: 'string', description: 'working directory for the subprocess (defaults to the MCP server cwd)' },
        reasoning: { type: 'string', description: 'optional model_reasoning_effort override for the subprocess (minimal/low/medium/high/xhigh/max/ultra); defaults to the inherited config' },
      },
      required: ['mode', 'task'],
    },
  },
]

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    handle(msg).catch((error) => {
      if (msg.id !== undefined) send(msg.id, { error: { code: -32603, message: String(error?.message || error) } })
    })
  }
})

async function handle(msg) {
  switch (msg.method) {
    case 'initialize':
      send(msg.id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'dsh-router', version: '0.1.0' },
      })
      break
    case 'notifications/initialized':
    case 'notifications/cancelled':
      break
    case 'ping':
      send(msg.id, {})
      break
    case 'tools/list':
      send(msg.id, { tools: TOOLS })
      break
    case 'tools/call': {
      const { name, arguments: args } = msg.params || {}
      try {
        const result = await callTool(name, args || {})
        send(msg.id, result)
      } catch (error) {
        send(msg.id, {
          content: [{ type: 'text', text: `tool error: ${error?.message || String(error)}` }],
          isError: true,
        })
      }
      break
    }
    default:
      send(msg.id, { error: { code: -32601, message: `unknown method: ${msg.method}` } })
  }
}

function send(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
}

function textResult(text) {
  return { content: [{ type: 'text', text }] }
}

function resolveSession(requested) {
  if (requested && existsSync(statePath(requested))) return requested
  const latest = resolveLatestSessionId()
  return latest || 'unknown'
}

/** Session cwd from the latest pointer (hooks write it per session). */
function resolveSessionCwd(sessionId) {
  ensureDirs()
  let fallback = null
  let fallbackTime = 0
  for (const file of readdirSync(LATEST_DIR)) {
    if (!file.endsWith('.json')) continue
    try {
      const obj = JSON.parse(readFileSync(join(LATEST_DIR, file), 'utf8'))
      if (!obj.cwd) continue
      const st = statSync(join(LATEST_DIR, file))
      if (st.mtimeMs > fallbackTime) {
        fallbackTime = st.mtimeMs
        fallback = obj.cwd
      }
      if (obj.sessionId === sessionId) return obj.cwd
    } catch { /* skip unreadable */ }
  }
  return fallback
}

function fmtMode(mode) {
  return typeof mode === 'string' ? mode : Number(mode).toFixed(2)
}

function coreList(mode, cfg) {
  const band = bandOf(mode)
  const extras = band === 'spec' ? cfg.specExtraTools : band === 'react' ? cfg.reactExtraTools : []
  return [...new Set(['bash', 'apply_patch', ...extras])]
}

async function callTool(name, args) {
  const cfg = readConfig()
  if (name === 'dev_router_status') {
    const sessionId = resolveSession(args.session_id)
    const state = readState(sessionId)
    const mode = state.override ?? state.mode
    const persona = cfg.routerMode === 'standard'
      ? 'You are a helpful software engineer assistant.'
      : personaFor(mode ?? 'weak', state.model || 'deepseek-v4-flash')
    return textResult([
      `session=${sessionId}`,
      `router-mode=${cfg.routerMode} (standard=RL sentence / spec=classified persona)`,
      `mode=${mode == null ? 'unclassified' : fmtMode(mode)} (band=${bandFor(mode ?? 'weak')})`,
      `persona=${persona.replace(/\n/g, ' / ')}`,
      `core=[${coreList(mode ?? 'weak', cfg).join(', ')}]`,
      `promoted=${state.promoted}`,
      `override=${state.override == null ? 'no' : fmtMode(state.override)}`,
      `anchoring=${cfg.anchoring}`,
      `nativeAgents=${existsSync(join(ROUTER_HOME, 'agents', 'router-spec.toml')) ? 'installed' : 'missing'}`,
      `model=${state.model || 'unknown'}`,
    ].join('\n'))
  }
  if (name === 'dev_router_mode') {
    const parsed = parseMode(args.mode)
    if (parsed === null) {
      return textResult(`invalid mode "${args.mode}": use spec/weak/mixed/react, 0-100, 0.0-1.0, or auto`)
    }
    const sessionId = resolveSession(args.session_id)
    if (parsed === 'auto') {
      const state = readState(sessionId)
      const next = { ...state }
      delete next.override
      writeState(sessionId, next)
      return textResult(`mode=auto (cleared override) - next request applies`)
    }
    writeState(sessionId, { override: parsed })
    return textResult(`mode=${fmtMode(parsed)} (band=${bandFor(parsed)}) - next request applies`)
  }
  if (name === 'dev_router_test') {
    return runTests()
  }
  if (name === 'dev_mode_subagent') {
    return runModeSubagent(args, cfg)
  }
  return textResult(`unknown tool: ${name}`)
}

function runTests() {
  const res = spawnSync(
    process.execPath,
    ['--test', 'test/router.test.mjs', 'test/hook.test.mjs', 'test/agents.test.mjs'],
    { cwd: ROUTER_HOME, env: { ...process.env, ROUTER_HOME }, encoding: 'utf8', timeout: 90_000 },
  )
  const tail = String(res.stdout || '').split('\n').filter((l) => /^(ℹ|✔|✖)/.test(l)).slice(-12).join('\n')
  const ok = res.status === 0
  return textResult(`${ok ? 'PASS' : 'FAIL'} (exit ${res.status})\n${tail}\n${String(res.stderr || '').slice(-400)}`)
}

function discoverCli() {
  const envCli = process.env.CODEX_CLI_PATH
  if (envCli && existsSync(envCli)) return envCli
  const binRoot = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'OpenAI', 'Codex', 'bin')
  if (existsSync(binRoot)) {
    let newest = null
    let newestTime = 0
    for (const dir of readdirSync(binRoot)) {
      const candidate = join(binRoot, dir, 'codex.exe')
      if (!existsSync(candidate)) continue
      try {
        const st = statSync(candidate)
        if (st.mtimeMs > newestTime) {
          newestTime = st.mtimeMs
          newest = candidate
        }
      } catch { /* skip */ }
    }
    if (newest) return newest
  }
  return null
}

async function runModeSubagent(args, cfg) {
  const parsed = parseMode(args.mode)
  if (parsed === null || parsed === 'auto') {
    return textResult(`invalid mode "${args.mode}": use spec / weak / react / balanced / 0-100`)
  }
  const cli = cfg.codexCli || discoverCli()
  if (!cli) return textResult('no codex CLI found: set codexCli in config.json or install Codex CLI')
  const task = String(args.task || '').trim()
  if (!task) return textResult('task is required')

  mkdirSync(PERSONA_DIR, { recursive: true })
  mkdirSync(TMP_DIR, { recursive: true })
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const personaFile = join(PERSONA_DIR, `${String(args.mode).toLowerCase()}-${stamp}.md`)
  const outFile = join(TMP_DIR, `subagent-${stamp}.txt`)
  const persona = personaFor(parsed, 'deepseek-v4-flash')
  writeFileSync(personaFile, persona, 'utf8')

  const sessionId = resolveSession(undefined)
  const cwd = args.cwd
    ? resolve(String(args.cwd))
    : (resolveSessionCwd(sessionId) || process.cwd())
  const configArg = `model_instructions_file="${personaFile.replace(/\\/g, '/')}"`
  const execArgs = [
    'exec',
    '--skip-git-repo-check',
    '--disable', 'hooks',
    '--disable', 'memories',
    '-C', cwd,
    '-c', configArg,
    '--output-last-message', outFile,
  ]
  if (args.reasoning && /^(minimal|low|medium|high|xhigh|max|ultra)$/i.test(String(args.reasoning))) {
    execArgs.push('-c', `model_reasoning_effort="${String(args.reasoning).toLowerCase()}"`)
  }
  execArgs.push(task)
  // The desktop app exports CODEX_THREAD_ID / CODEX_INTERNAL_ORIGINATOR_OVERRIDE
  // etc. to every child process; codex exec then attaches the current thread's
  // context and the subprocess is no longer isolated. Strip CODEX_* so the
  // one-shot session is genuinely fresh (persona-only, verified by probe).
  const childEnv = { ...process.env }
  for (const key of Object.keys(childEnv)) {
    if (/^CODEX_/i.test(key)) delete childEnv[key]
  }
  return new Promise((resolvePromise) => {
    const child = spawn(cli, execArgs, {
      cwd,
      shell: false,
      windowsHide: true,
      env: childEnv,
      // The MCP server's own stdin is the JSON-RPC pipe; the subprocess must
      // not inherit it or codex exec waits for stdin and never runs.
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      child.kill()
    }, 110_000)

    let stderrTail = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      stderrTail = (stderrTail + chunk).slice(-2000)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      cleanup(personaFile, outFile)
      resolvePromise(textResult(`subprocess error: ${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      let out = ''
      try {
        if (existsSync(outFile)) out = readFileSync(outFile, 'utf8').trim()
      } catch { /* ignore */ }
      cleanup(personaFile, outFile)
      const head = out.slice(0, 6000)
      const truncated = out.length > 6000 ? '\n...(truncated)' : ''
      if (code !== 0 && !out) {
        resolvePromise(textResult(`[mode-subagent ${bandFor(parsed)} | exit ${code}]\n${stderrTail.slice(-1500) || 'no output'}`))
      } else {
        resolvePromise(textResult(`[mode-subagent ${bandFor(parsed)}]\n${head}${truncated}`))
      }
    })
  })
}

function cleanup(...paths) {
  for (const p of paths) {
    try { rmSync(p, { force: true }) } catch { /* ignore */ }
  }
}
