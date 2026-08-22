/**
 * router-common: shared state/config/IO helpers for dsh-router hooks and MCP.
 * Zero external dependencies. All paths derive from ROUTER_HOME (default
 * ~/.codex/routing-suite) so tests can point it at a temp directory.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const ROUTER_HOME = process.env.ROUTER_HOME || join(homedir(), '.codex', 'routing-suite')
export const STATE_DIR = join(ROUTER_HOME, 'state')
export const LATEST_DIR = join(ROUTER_HOME, 'latest')
export const PERSONA_DIR = join(ROUTER_HOME, 'personas')
export const TMP_DIR = join(ROUTER_HOME, 'tmp')
export const CONFIG_PATH = join(ROUTER_HOME, 'config.json')

export const DEFAULT_CONFIG = {
  anchoring: true,
  routerMode: 'standard',
  specExtraTools: [],
  reactExtraTools: [],
  codexCli: null,
}

export function ensureDirs() {
  for (const dir of [STATE_DIR, LATEST_DIR, PERSONA_DIR, TMP_DIR]) mkdirSync(dir, { recursive: true })
}

export function readConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function statePath(sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_')
  return join(STATE_DIR, `${safe}.json`)
}

export function readState(sessionId) {
  ensureDirs()
  const p = statePath(sessionId)
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf8'))
      if (parsed && typeof parsed === 'object') return parsed
    } catch { /* fall through to fresh state */ }
  }
  const fresh = {
    routerMode: readConfig().routerMode,
    mode: null,
    band: null,
    firstUserText: '',
    complexity: null,
    promoted: false,
    override: null,
    model: null,
  }
  writeFileSync(p, JSON.stringify(fresh, null, 2), 'utf8')
  return fresh
}

export function writeState(sessionId, patch) {
  ensureDirs()
  const next = { ...readState(sessionId), ...patch }
  writeFileSync(statePath(sessionId), JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function touchLatest(cwd, sessionId) {
  ensureDirs()
  const key = createHash('sha1').update(String(cwd || '')).digest('hex').slice(0, 16)
  writeFileSync(join(LATEST_DIR, `${key}.json`), JSON.stringify({ cwd: cwd || '', sessionId }, null, 2), 'utf8')
}

export function resolveLatestSessionId() {
  ensureDirs()
  let best = null
  let bestMtime = 0
  for (const file of readdirSync(LATEST_DIR)) {
    if (!file.endsWith('.json')) continue
    try {
      const st = statSync(join(LATEST_DIR, file))
      if (st.mtimeMs > bestMtime) {
        bestMtime = st.mtimeMs
        best = JSON.parse(readFileSync(join(LATEST_DIR, file), 'utf8')).sessionId
      }
    } catch { /* skip unreadable */ }
  }
  return best
}

export function readSessionInput() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
    process.stdin.resume()
  })
}

/** Canonical hook tool names: Bash/exec_command -> bash, apply_patch family -> apply_patch. */
export function normalizeToolName(name) {
  const n = String(name || '')
  if (n === 'Bash' || n === 'exec_command' || n === 'shell' || n === 'unified_exec') return 'bash'
  if (n === 'apply_patch' || n === 'Edit' || n === 'Write') return 'apply_patch'
  return n.toLowerCase()
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Match a normalized tool name against a core set that may contain `*` patterns. */
export function matchesCore(normalized, coreSet) {
  if (coreSet.has(normalized)) return true
  for (const pattern of coreSet) {
    if (typeof pattern === 'string' && pattern.includes('*')) {
      const re = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
      if (re.test(normalized)) return true
    }
  }
  return false
}
