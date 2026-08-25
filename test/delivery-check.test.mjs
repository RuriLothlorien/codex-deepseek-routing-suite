/**
 * Unit tests for the dev_delivery_check evidence gate (ported from upstream
 * router-standard deliveryCheck v1.24/v1.28 semantics).
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { deliveryCheck } from '../mcp/delivery-check.mjs'

function tmpFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'dcheck-'))
  const p = join(dir, name)
  writeFileSync(p, content)
  return p
}

test('delivery_check: missing file parameter fails fast', () => {
  const r = deliveryCheck({})
  assert.equal(r.ok, false)
  assert.equal(r.checks[0].name, 'file-path')
})

test('delivery_check: valid file + evidence manifest passes', () => {
  const file = tmpFile('out.md', '# done\n')
  const r = deliveryCheck({
    file,
    evidence: { items: [{ label: 'artifact', kind: 'file', target: file }] },
  })
  assert.equal(r.ok, true, JSON.stringify(r.checks, null, 2))
})

test('delivery_check: 0-byte file fails file-nonempty', () => {
  const file = tmpFile('empty.txt', '')
  const r = deliveryCheck({ file, evidence: { items: [{ label: 'a', kind: 'text', result: 'ok' }] } })
  assert.equal(r.ok, false)
  assert.ok(r.checks.some((c) => c.name === 'file-nonempty' && !c.pass))
})

test('delivery_check: non-UTF-8 file fails encoding-utf8', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dcheck-'))
  const file = join(dir, 'bad.bin')
  writeFileSync(file, Buffer.from([0xff, 0xfe, 0xfd, 0x01]))
  const r = deliveryCheck({ file, evidence: { items: [{ label: 'a', kind: 'text', result: 'ok' }] } })
  assert.equal(r.ok, false)
  assert.ok(r.checks.some((c) => c.name === 'encoding-utf8' && !c.pass))
})

test('delivery_check: empty evidence fails delivery-evidence', () => {
  const file = tmpFile('a.txt', 'x')
  const r = deliveryCheck({ file, evidence: { items: [] } })
  assert.equal(r.ok, false)
  assert.ok(r.checks.some((c) => c.name === 'delivery-evidence' && !c.pass))
})

test('delivery_check: bad kind fails', () => {
  const file = tmpFile('a.txt', 'x')
  const r = deliveryCheck({ file, evidence: { items: [{ label: 'a', kind: 'nope' }] } })
  assert.equal(r.ok, false)
  assert.ok(r.checks.some((c) => c.name === 'delivery-evidence' && !c.pass))
})

test('delivery_check: run/text evidence requires result', () => {
  const file = tmpFile('a.txt', 'x')
  const r = deliveryCheck({ file, evidence: { items: [{ label: 'run', kind: 'run' }] } })
  assert.equal(r.ok, false)
})

test('delivery_check: numeric evidence must be numeric', () => {
  const file = tmpFile('a.txt', 'x')
  const bad = deliveryCheck({ file, evidence: { items: [{ label: 'n', kind: 'numeric', result: 'not-a-number' }] } })
  assert.equal(bad.ok, false)
  const good = deliveryCheck({ file, evidence: { items: [{ label: 'n', kind: 'numeric', result: '2.07' }] } })
  assert.equal(good.ok, true)
})

test('delivery_check: image/page evidence must be reviewed', () => {
  const file = tmpFile('a.txt', 'x')
  const img = tmpFile('shot.png', 'png')
  const notReviewed = deliveryCheck({ file, evidence: { items: [{ label: 'img', kind: 'image', target: img }] } })
  assert.equal(notReviewed.ok, false)
  const reviewed = deliveryCheck({ file, evidence: { items: [{ label: 'img', kind: 'image', target: img, reviewed: true }] } })
  assert.equal(reviewed.ok, true)
})

test('delivery_check: url requires reviewed visual evidence', () => {
  const file = tmpFile('index.html', '<html></html>')
  const img = tmpFile('shot.png', 'png')
  const missing = deliveryCheck({ file, url: 'http://localhost:3000', evidence: { items: [{ label: 'img', kind: 'image', target: img }] } })
  assert.equal(missing.ok, false)
  const ok = deliveryCheck({ file, url: 'http://localhost:3000', evidence: { items: [{ label: 'img', kind: 'image', target: img, reviewed: true }] } })
  assert.equal(ok.ok, false) // page-verify advisory still fails unless requireSmoke=false
  const noSmoke = deliveryCheck({ file, url: 'http://localhost:3000', requireSmoke: false, evidence: { items: [{ label: 'img', kind: 'image', target: img, reviewed: true }] } })
  assert.equal(noSmoke.ok, true)
})

test('delivery_check: external evidence validates target or result', () => {
  const file = tmpFile('a.txt', 'x')
  const missing = deliveryCheck({ file, evidence: { items: [{ label: 'ext', kind: 'external' }] } })
  assert.equal(missing.ok, false)
  const byResult = deliveryCheck({ file, evidence: { items: [{ label: 'ext', kind: 'external', result: 'validator passed' }] } })
  assert.equal(byResult.ok, true)
  const badTarget = deliveryCheck({ file, evidence: { items: [{ label: 'ext', kind: 'external', target: 'C:/no/such/file' }] } })
  assert.equal(badTarget.ok, false)
})

test('delivery_check: numeric hint is non-blocking', () => {
  const file = tmpFile('a.txt', 'x')
  const r = deliveryCheck({ file, evidence: { items: [{ label: 'a', kind: 'file', target: file }] } })
  assert.equal(r.ok, true)
  assert.ok(r.checks.some((c) => c.name === 'numeric-assertion' && c.pass))
})
