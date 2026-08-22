#!/usr/bin/env node
/**
 * Cross-platform installer for codex-deepseek-routing-suite.
 *
 * Works on Windows, macOS, and Linux. Installs into ~/.codex by default;
 * pass --home <dir> to use a different codex home (also used by tests).
 * Pass --dry-run to print the plan without writing anything.
 *
 * Usage:
 *   node install.mjs [--home <codex-home>] [--dry-run]
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const out = { home: null, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--home') out.home = argv[++i]
    else if (argv[i] === '--dry-run') out.dryRun = true
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const codexHome = resolve(args.home || join(homedir(), '.codex'))
const dst = join(codexHome, 'routing-suite')
const skillDst = join(codexHome, 'skills', 'dsh-router')
const agentsDst = join(codexHome, 'agents')
const configPath = join(codexHome, 'config.toml')
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

function step(n, msg) {
  console.log(`[${n}] ${args.dryRun ? '(dry-run) ' : ''}${msg}`)
}

function removeInside(target, base) {
  const t = resolve(target)
  const b = resolve(base) + sep
  if (!t.startsWith(b)) throw new Error(`Refusing to remove outside ${base}: ${t}`)
  if (!existsSync(t)) return
  const st = lstatSync(t)
  if (st.isSymbolicLink()) rmSync(t, { force: true })
  else rmSync(t, { recursive: true, force: true })
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    const s = join(src, name)
    const d = join(dest, name)
    const st = lstatSync(s)
    if (st.isDirectory()) copyTree(s, d)
    else copyFileSync(s, d)
  }
}

function detectCli() {
  const envCli = process.env.CODEX_CLI_PATH
  if (envCli && existsSync(envCli)) return envCli
  const isWin = process.platform === 'win32'
  if (isWin) {
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
  }
  const exe = isWin ? 'codex.exe' : 'codex'
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, exe)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function setMarkerBlock(text, marker, block, { insertTop = false } = {}) {
  const begin = `# >>> dsh-router ${marker}: begin >>>`
  const end = `# >>> dsh-router ${marker}: end <<<`
  const trimmed = block.trimEnd()
  if (text.includes(begin)) {
    // Consume the trailing whitespace left after the old end marker so
    // repeated installs do not accumulate blank lines in config.toml.
    const re = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}\\s*`)
    return text.replace(re, `${trimmed}\n\n`)
  }
  if (insertTop) {
    const lines = text.split(/\r?\n/)
    let pos = lines.findIndex((l) => l.trimStart().startsWith('['))
    if (pos < 0) pos = lines.length
    const head = lines.slice(0, pos)
    const rest = lines.slice(pos)
    const joined = [...head, '', trimmed, '', ...rest].join('\n')
    return joined.endsWith('\n') ? joined : `${joined}\n`
  }
  return `${text.trimEnd()}\n\n${trimmed}\n`
}

function mergeConfigToml(configPath, runtimeDir) {
  let text = ''
  if (existsSync(configPath)) text = readFileSync(configPath, 'utf8')
  const fs = runtimeDir.replace(/\\/g, '/')

  const hooksBlock = `# >>> dsh-router hooks: begin >>>
[[hooks.UserPromptSubmit]]
[[hooks.UserPromptSubmit.hooks]]
type = "command"
command = "node ${fs}/hooks/router-user-prompt.mjs"
command_windows = "node ${fs}/hooks/router-user-prompt.mjs"
timeout = 10
additionalContextLimit = 4096

[[hooks.PreToolUse]]
matcher = "*"
[[hooks.PreToolUse.hooks]]
type = "command"
command = "node ${fs}/hooks/router-pre-tool.mjs"
command_windows = "node ${fs}/hooks/router-pre-tool.mjs"
timeout = 10
# >>> dsh-router hooks: end <<<`

  const mcpBlock = `# >>> dsh-router mcp: begin >>>
[mcp_servers.dsh-router]
type = "stdio"
command = "node"
args = ["${fs}/mcp/server.mjs"]
startup_timeout_sec = 30
tool_timeout_sec = 120
# >>> dsh-router mcp: end <<<`

  const instructionsBlock = `# >>> dsh-router instructions: begin >>>
model_instructions_file = "${fs}/instructions/base.md"
# >>> dsh-router instructions: end <<<`

  text = setMarkerBlock(text, 'hooks', hooksBlock)
  text = setMarkerBlock(text, 'mcp', mcpBlock)
  text = setMarkerBlock(text, 'instructions', instructionsBlock, { insertTop: true })
  // Safety net: collapse any 3+ newline runs (legacy accumulated blank lines)
  // and keep a single trailing newline.
  return `${text.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

step(1, `Backing up ${configPath}`)
if (existsSync(configPath) && !args.dryRun) {
  const backup = `${configPath}.bak-${stamp}`
  copyFileSync(configPath, backup)
  console.log(`  backup: ${backup}`)
}

step(2, `Copying runtime to ${dst}`)
if (!args.dryRun) {
  for (const sub of ['hooks', 'mcp', 'instructions', 'test', 'personas', 'tmp', 'state', 'latest', 'agents']) {
    mkdirSync(join(dst, sub), { recursive: true })
  }
  copyFileSync(join(root, 'router-core.mjs'), join(dst, 'router-core.mjs'))
  copyFileSync(join(root, 'install.mjs'), join(dst, 'install.mjs'))
  copyFileSync(join(root, 'uninstall.mjs'), join(dst, 'uninstall.mjs'))
  copyTree(join(root, 'hooks'), join(dst, 'hooks'))
  copyFileSync(join(root, 'mcp', 'server.mjs'), join(dst, 'mcp', 'server.mjs'))
  copyFileSync(join(root, 'instructions', 'base.md'), join(dst, 'instructions', 'base.md'))
  copyTree(join(root, 'test'), join(dst, 'test'))
  copyTree(join(root, 'agents'), join(dst, 'agents'))
}

step(3, `Installing skill to ${skillDst}`)
if (!args.dryRun) {
  removeInside(skillDst, codexHome)
  mkdirSync(skillDst, { recursive: true })
  copyFileSync(join(root, 'skills', 'dsh-router', 'SKILL.md'), join(skillDst, 'SKILL.md'))
  copyTree(join(root, 'skills', 'dsh-router', 'references'), join(skillDst, 'references'))
}

step(4, 'Installing native agents (optional backend; multi_agent stays off)')
if (!args.dryRun) {
  mkdirSync(agentsDst, { recursive: true })
  for (const agent of ['router-spec.toml', 'router-react.toml', 'router-weak.toml']) {
    copyFileSync(join(root, 'agents', agent), join(agentsDst, agent))
  }
}

step(5, `Writing ${join(dst, 'config.json')}`)
if (!args.dryRun) {
  const cfgPath = join(dst, 'config.json')
  let cfg = {}
  try {
    if (existsSync(cfgPath)) cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  } catch { /* fresh */ }
  cfg.anchoring = true
  if (!('routerMode' in cfg)) cfg.routerMode = 'standard'
  if (!('specExtraTools' in cfg)) cfg.specExtraTools = []
  if (!('reactExtraTools' in cfg)) cfg.reactExtraTools = []
  cfg.codexCli = detectCli()
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8')
}

step(6, `Merging ${configPath}`)
if (!args.dryRun) {
  writeFileSync(configPath, mergeConfigToml(configPath, dst), 'utf8')
}

step(7, 'Done')
console.log('')
console.log('Next steps:')
console.log('  1. Restart Codex (desktop app or CLI).')
console.log('  2. Trust the two new hooks (CLI: codex /hooks; desktop: trust prompt).')
console.log('  3. Open a new session and call dev_router_status to verify.')
console.log('  model_instructions_file persona replacement is active (the only form).')
