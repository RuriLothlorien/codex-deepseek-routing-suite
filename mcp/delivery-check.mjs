/**
 * dev_delivery_check: delivery evidence gate.
 *
 * Ported from upstream dsh-routing-suite router-standard deliveryCheck
 * (v1.24 numeric evidence / v1.28 numeric hint semantics). Pure Node,
 * zero dependencies: validates a deliverable file (exists/nonempty/UTF-8)
 * and an evidence manifest before a task may be declared delivered.
 */
import { readFileSync, statSync } from 'node:fs'

const ALLOWED_KINDS = new Set(['file', 'page', 'image', 'run', 'test', 'text', 'external', 'numeric'])

export function deliveryCheck(args = {}) {
  const file = String(args.file || '').trim()
  const checks = []
  if (!file) {
    return { ok: false, checks: [{ name: 'file-path', pass: false, detail: 'missing file parameter' }] }
  }

  try {
    const st = statSync(file)
    checks.push({ name: 'file-exists', pass: true, detail: `${file} (${st.size} bytes)` })
    checks.push(st.size > 0
      ? { name: 'file-nonempty', pass: true, detail: `${st.size} bytes` }
      : { name: 'file-nonempty', pass: false, detail: 'file is 0 bytes' })
  } catch (e) {
    return { ok: false, checks: [...checks, { name: 'file-exists', pass: false, detail: String((e && e.message) || e) }] }
  }

  try {
    const head = readFileSync(file).subarray(0, 65536)
    new TextDecoder('utf-8', { fatal: true }).decode(head)
    checks.push({ name: 'encoding-utf8', pass: true, detail: 'UTF-8 decode OK (head 64KB)' })
  } catch (e) {
    checks.push({ name: 'encoding-utf8', pass: false, detail: String((e && e.message) || e) })
  }

  const requireSmoke = args.requireSmoke !== false
  const url = String(args.url || '').trim()
  if (url && requireSmoke) {
    checks.push({
      name: 'page-verify',
      pass: false,
      detail: 'visual verify the page with bash (headless Chrome/playwright screenshot) + reviewed visual evidence — dev_delivery_check gates the evidence, not a built-in browser',
    })
  }

  const ev = args.evidence
  if (!ev || !Array.isArray(ev.items) || ev.items.length === 0) {
    checks.push({
      name: 'delivery-evidence',
      pass: false,
      detail: 'missing evidence items — provide at least one evidence item: {label, kind, target?, result?, reviewed?}',
    })
  } else {
    const failures = []
    for (const it of ev.items) {
      const label = String(it?.label || '').trim()
      const kind = String(it?.kind || '').trim()
      if (!label) { failures.push('empty label'); continue }
      if (!ALLOWED_KINDS.has(kind)) { failures.push(`bad kind: ${kind}`); continue }
      if (kind === 'run' || kind === 'text') {
        if (!String(it?.result || '').trim()) failures.push(`${kind} evidence without result`)
        continue
      }
      if (kind === 'numeric') {
        const res = String(it?.result ?? '').trim()
        if (!res || !/^-?[\d.eE+-]+$/.test(res)) failures.push('numeric evidence needs a numeric result (e.g. minr=2.07, H=0.00)')
        continue
      }
      if (kind === 'external') {
        const hasTarget = String(it?.target || '').trim() !== ''
        const hasResult = String(it?.result || '').trim() !== ''
        if (!hasTarget && !hasResult) failures.push('external evidence needs target (file) or result (output summary)')
        if (hasTarget) {
          try {
            const st = statSync(String(it.target))
            if (!st.isFile() || st.size <= 0) failures.push(`external target not valid file: ${it.target}`)
          } catch { failures.push(`external target missing: ${it.target}`) }
        }
        continue
      }
      const t = String(it?.target || '').trim()
      if (!t) { failures.push(`${kind} evidence without target`); continue }
      try {
        const st = statSync(t)
        if (!st.isFile() || st.size <= 0) failures.push(`target not valid file: ${t}`)
      } catch { failures.push(`target missing: ${t}`) }
      if ((kind === 'page' || kind === 'image') && it?.reviewed !== true) failures.push(`visual not reviewed: ${label}`)
    }
    if (url) {
      const hasReviewedVisual = (ev.items || []).some(
        (it) => ['page', 'image', 'external'].includes(String(it?.kind)) && it?.reviewed === true,
      )
      if (!hasReviewedVisual) failures.push('page deliverable needs at least one reviewed visual evidence (page/image/external)')
    }
    checks.push({
      name: 'delivery-evidence',
      pass: failures.length === 0,
      detail: failures.length === 0 ? `evidence accepted (${ev.items.length} item(s))` : failures.join('; '),
    })
    const noNumeric = (ev.items || []).every((it) => String(it?.kind) !== 'numeric')
    if (noNumeric) {
      checks.push({
        name: 'numeric-assertion',
        pass: true,
        detail: 'hint: if this deliverable has a measurable invariant (conserved qty / radius / count / compile-ok), add a numeric evidence item (kind=numeric, result=<number>) to turn "I think it works" into "I verified it". Non-blocking.',
      })
    }
  }

  return { ok: checks.every((c) => c.pass), checks }
}

export function deliveryCheckText(result) {
  return [
    result.ok
      ? 'Delivery gate SATISFIED — evidence manifest accepted.'
      : 'Delivery gate NOT satisfied — do NOT report completion; fix the failing checks and re-run dev_delivery_check.',
    '',
    ...result.checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`),
  ].join('\n')
}
