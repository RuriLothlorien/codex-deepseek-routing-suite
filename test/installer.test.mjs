/**
 * Cross-platform installer/uninstaller test: install into a temp codex home,
 * assert layout and config markers, then uninstall and assert cleanup.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
  assert.ok(!existsSync(join(home, 'codex-deepseek-routing-suite')))
  assert.ok(!existsSync(join(home, 'routing-suite')))
  assert.ok(!existsSync(join(home, 'skills', 'codex-dsh-routing-suite')))
  assert.ok(!existsSync(join(home, 'skills', 'codex-deepseek-routing-suite')))
  assert.ok(!existsSync(join(home, 'skills', 'dsh-router')))
  assert.ok(!readFileSync(join(home, 'config.toml'), 'utf8').includes('codex-dsh-routing-suite hooks: begin'))
  assert.ok(!readFileSync(join(home, 'config.toml'), 'utf8').includes('codex-deepseek-routing-suite hooks: begin'))
  assert.ok(!readFileSync(join(home, 'config.toml'), 'utf8').includes('dsh-router hooks: begin'))
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

test('install.mjs migrates previous codex-deepseek-routing-suite layout to codex-dsh-routing-suite', () => {
  const home = mkdtempSync(join(tmpdir(), 'router-migrate-'))

  // Simulate a previous install (codex-deepseek-routing-suite) with legacy markers.
  const prevDst = join(home, 'codex-deepseek-routing-suite')
  mkdirSync(join(prevDst, 'mcp'), { recursive: true })
  writeFileSync(join(prevDst, 'mcp', 'server.mjs'), 'previous')
  const prevSkill = join(home, 'skills', 'codex-deepseek-routing-suite')
  mkdirSync(join(prevSkill, 'references'), { recursive: true })
  writeFileSync(join(prevSkill, 'SKILL.md'), 'previous skill')
  writeFileSync(join(home, 'config.toml'), [
    'model = "deepseek-v4-flash"',
    '# >>> codex-deepseek-routing-suite hooks: begin >>>',
    '[[hooks.UserPromptSubmit]]',
    '# >>> codex-deepseek-routing-suite hooks: end <<<',
    '# >>> dsh-router hooks: begin >>>',
    '[[hooks.UserPromptSubmit]]',
    '# >>> dsh-router hooks: end <<<',
    '',
  ].join('\n'))

  const r = run('install.mjs', home)
  assert.equal(r.status, 0, r.stderr || r.stdout)

  assert.ok(!existsSync(prevDst), 'previous runtime dir must be migrated')
  assert.ok(existsSync(join(home, 'codex-dsh-routing-suite', 'mcp', 'server.mjs')))
  assert.ok(!existsSync(prevSkill), 'previous skill dir must be removed')
  assert.ok(existsSync(join(home, 'skills', 'codex-dsh-routing-suite', 'SKILL.md')))

  const toml = readFileSync(join(home, 'config.toml'), 'utf8')
  assert.ok(!toml.includes('codex-deepseek-routing-suite hooks: begin'), 'previous markers must be removed')
  assert.ok(!toml.includes('dsh-router hooks: begin'), 'legacy markers must be removed')
  assert.match(toml, /# >>> codex-dsh-routing-suite hooks: begin >>>/)
  assert.match(toml, /\[mcp_servers\.codex-dsh-routing-suite\]/)
})
