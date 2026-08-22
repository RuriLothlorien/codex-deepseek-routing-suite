/**
 * Cross-platform installer/uninstaller test: install into a temp codex home,
 * assert layout and config markers, then uninstall and assert cleanup.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const ROOT = join(import.meta.dirname, '..')

function run(script, home) {
  return spawnSync(process.execPath, [join(ROOT, script), '--home', home], {
    encoding: 'utf8',
    cwd: ROOT,
  })
}

test('install.mjs installs into a temp codex home; uninstall.mjs removes it', () => {
  const home = mkdtempSync(join(tmpdir(), 'router-install-'))
  const r = run('install.mjs', home)
  assert.equal(r.status, 0, r.stderr || r.stdout)

  const toml = readFileSync(join(home, 'config.toml'), 'utf8')
  assert.match(toml, /# >>> dsh-router hooks: begin >>>/)
  assert.match(toml, /\[mcp_servers\.dsh-router\]/)
  assert.match(toml, /^model_instructions_file\s*=\s*"/m)
  assert.ok(existsSync(join(home, 'routing-suite', 'mcp', 'server.mjs')))
  assert.ok(existsSync(join(home, 'routing-suite', 'install.mjs')))
  assert.ok(existsSync(join(home, 'skills', 'dsh-router', 'SKILL.md')))
  assert.ok(existsSync(join(home, 'skills', 'dsh-router', 'references', 'personas.md')))
  assert.ok(existsSync(join(home, 'agents', 'router-spec.toml')))
  const cfg = JSON.parse(readFileSync(join(home, 'routing-suite', 'config.json'), 'utf8'))
  assert.equal(cfg.anchoring, true)

  const u = run('uninstall.mjs', home)
  assert.equal(u.status, 0, u.stderr || u.stdout)
  assert.ok(!existsSync(join(home, 'routing-suite')))
  assert.ok(!existsSync(join(home, 'skills', 'dsh-router')))
  assert.ok(!readFileSync(join(home, 'config.toml'), 'utf8').includes('dsh-router hooks: begin'))
})
