/**
 * Model-family routing guard: only explicit Pro ids use the Pro persona;
 * unknown/empty/flash ids default to the tested DeepSeek V4 Flash branch.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { isProModel, routerModelFor } from '../hooks/router-common.mjs'

test('routerModelFor: explicit Pro ids stay Pro', () => {
  assert.equal(routerModelFor('deepseek-v4-pro'), 'deepseek-v4-pro')
  assert.equal(routerModelFor('DeepSeek-R1'), 'DeepSeek-R1')
  assert.equal(routerModelFor('deepseek-reasoner'), 'deepseek-reasoner')
})

test('routerModelFor: flash, aliases, empty and unknown default to Flash', () => {
  assert.equal(routerModelFor('deepseek-v4-flash'), 'deepseek-v4-flash')
  assert.equal(routerModelFor('deepseek-chat'), 'deepseek-v4-flash')
  assert.equal(routerModelFor(''), 'deepseek-v4-flash')
  assert.equal(routerModelFor(undefined), 'deepseek-v4-flash')
  assert.equal(routerModelFor('custom-model'), 'deepseek-v4-flash')
})

test('isProModel only true for explicit Pro markers', () => {
  assert.equal(isProModel('deepseek-v4-pro'), true)
  assert.equal(isProModel('deepseek-r1'), true)
  assert.equal(isProModel('deepseek-v4-flash'), false)
  assert.equal(isProModel('deepseek-chat'), false)
  assert.equal(isProModel(''), false)
  assert.equal(isProModel(undefined), false)
})
