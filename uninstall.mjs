#!/usr/bin/env node
/**
 * Cross-platform uninstaller for codex-deepseek-routing-suite.
 * Usage:
 *   node uninstall.mjs [--home <codex-home>] [--dry-run]
 */
import {
  copyFileSync, existsSync, lstatSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'

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
const configPath = join(codexHome, 'config.toml')
const dst = join(codexHome, 'routing-suite')
const skillDst = join(codexHome, 'skills', 'dsh-router')
const agentsDst = join(codexHome, 'agents')
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

function removeInside(target, base) {
  const t = resolve(target)
  const b = resolve(base) + sep
  if (!t.startsWith(b)) throw new Error(`Refusing to remove outside ${base}: ${t}`)
  if (!existsSync(t)) return
  const st = lstatSync(t)
  if (st.isSymbolicLink()) rmSync(t, { force: true })
  else rmSync(t, { recursive: true, force: true })
}

console.log('[1/4] Cleaning config.toml')
if (existsSync(configPath)) {
  if (!args.dryRun) {
    const backup = `${configPath}.bak-${stamp}`
    copyFileSync(configPath, backup)
    console.log(`  backup: ${backup}`)
    let text = readFileSync(configPath, 'utf8')
    for (const marker of ['hooks', 'mcp', 'instructions']) {
      const begin = `# >>> dsh-router ${marker}: begin >>>`
      const end = `# >>> dsh-router ${marker}: end <<<`
      const pattern = `${begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      text = text.replace(new RegExp(pattern), '')
    }
    writeFileSync(configPath, `${text.trimEnd()}\n`, 'utf8')
  }
}

console.log('[2/4] Removing native agents (router_* only)')
if (!args.dryRun) {
  for (const agent of ['router-spec.toml', 'router-react.toml', 'router-weak.toml']) {
    const p = join(agentsDst, agent)
    if (existsSync(p)) rmSync(p, { force: true })
  }
}

console.log('[3/4] Removing runtime and skill')
if (!args.dryRun) {
  removeInside(dst, codexHome)
  removeInside(skillDst, codexHome)
}

console.log('[4/4] Done. Restart Codex. Config backup kept for recovery.')
