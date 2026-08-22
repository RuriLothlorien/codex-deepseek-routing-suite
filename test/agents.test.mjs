/**
 * Native multi-agent backend validation: the three router_* custom agent
 * files must exist and carry the required TOML fields. This backend is
 * OPTIONAL and never forces features.multi_agent on; it is only used when a
 * session actually has spawn_agent tools.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const AGENTS_DIR = join(import.meta.dirname, '..', 'agents')

test('native agents: router_spec/router_react/router_weak files exist with required fields', () => {
  const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.toml'))
  assert.deepEqual(files.sort(), ['router-react.toml', 'router-spec.toml', 'router-weak.toml'])
  const names = new Set()
  for (const file of files) {
    const text = readFileSync(join(AGENTS_DIR, file), 'utf8')
    for (const field of ['name =', 'description =', 'developer_instructions =', 'model =', 'model_reasoning_effort =']) {
      assert.ok(text.includes(field), `${file} missing ${field}`)
    }
    const name = /^name\s*=\s*"([^"]+)"/m.exec(text)?.[1]
    assert.ok(name, `${file} has a name`)
    names.add(name)
  }
  assert.deepEqual([...names].sort(), ['router_react', 'router_spec', 'router_weak'])
})
