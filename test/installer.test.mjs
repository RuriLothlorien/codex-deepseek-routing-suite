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
  assert.match(toml, /# >>> codex-dsh-routing-suite hooks: begin >>>/)
  assert.match(toml, /\[mcp_servers\.codex-dsh-routing-suite\]/)
  assert.match(toml, /^model_instructions_file\s*=\s*"/m)
  assert.ok(existsSync(join(home, 'codex-dsh-routing-suite', 'mcp', 'server.mjs')))
  assert.ok(existsSync(join(home, 'codex-dsh-routing-suite', 'install.mjs')))
  assert.ok(existsSync(join(home, 'skills', 'codex-dsh-routing-suite', 'SKILL.md')))
  assert.ok(existsSync(join(home, 'skills', 'codex-dsh-routing-suite', 'references', 'personas.md')))
  assert.ok(existsSync(join(home, 'agents', 'router-spec.toml')))
  const cfg = JSON.parse(readFileSync(join(home, 'codex-dsh-routing-suite', 'config.json'), 'utf8'))
  assert.equal(cfg.anchoring, true)

  const u = run('uninstall.mjs', home)
  assert.equal(u.status, 0, u.stderr || u.stdout)
  assert.ok(!existsSync(join(home, 'codex-dsh-routing-suite')))
  assert.ok(!existsSync(join(home, 'skills', 'codex-dsh-routing-suite')))
  assert.ok(!readFileSync(join(home, 'config.toml'), 'utf8').includes('codex-dsh-routing-suite hooks: begin'))
})

test('install.mjs is idempotent: repeated installs do not accumulate blank lines', () => {
  const home = mkdtempSync(join(tmpdir(), 'router-idem-'))

  let r = run('install.mjs', home)
  assert.equal(r.status, 0, r.stderr || r.stdout)
  const toml1 = readFileSync(join(home, 'config.toml'), 'utf8')

  r = run('install.mjs', home)
  assert.equal(r.status, 0, r.stderr || r.stdout)
  const toml2 = readFileSync(join(home, 'config.toml'), 'utf8')

  r = run('install.mjs', home)
  assert.equal(r.status, 0, r.stderr || r.stdout)
  const toml3 = readFileSync(join(home, 'config.toml'), 'utf8')

  assert.equal(toml2, toml1, 'second install must not change config.toml')
  assert.equal(toml3, toml2, 'third install must not change config.toml')
  assert.ok(!/\n{3,}/.test(toml3), 'config.toml must not contain 3+ consecutive newlines')
})
