/**
 * Model-family routing: precise Flash/Pro classification; anything else
 * returns null and disables the suite workflow entirely.
 * Flash family includes vision-exp variants (e.g. deepseek-v4-flash-vision-exp).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { isProModel, modelClass, routerModelFor } from '../hooks/router-common.mjs'

test('modelClass: precise flash/pro classification', () => {
  assert.equal(modelClass('deepseek-v4-flash'), 'flash')
  assert.equal(modelClass('deepseek-v4-flash-128k'), 'flash')
  assert.equal(modelClass('deepseek-v4-flash-vision-exp'), 'flash')
  assert.equal(modelClass('deepseek-v4-pro'), 'pro')
  assert.equal(modelClass('deepseek-reasoner'), 'pro')
  assert.equal(modelClass('DeepSeek-R1'), 'pro')
})

test('modelClass: non-DeepSeek/unknown/empty => null (workflow disabled)', () => {
  assert.equal(modelClass('deepseek-chat'), null)
  assert.equal(modelClass('gpt-5'), null)
  assert.equal(modelClass('gpt-5-flash'), null)
  assert.equal(modelClass('claude-3-flash'), null)
  assert.equal(modelClass('qwen-flash'), null)
  assert.equal(modelClass('xxx-flash'), null)
  assert.equal(modelClass('xxx-pro'), null)
  assert.equal(modelClass('v4-flash'), null)
  assert.equal(modelClass('custom-model'), null)
  assert.equal(modelClass(''), null)
  assert.equal(modelClass(undefined), null)
})

test('routerModelFor: canonical ids for supported models, null otherwise', () => {
  assert.equal(routerModelFor('deepseek-v4-flash'), 'deepseek-v4-flash')
  assert.equal(routerModelFor('deepseek-v4-flash-vision-exp'), 'deepseek-v4-flash')
  assert.equal(routerModelFor('deepseek-v4-pro'), 'deepseek-v4-pro')
  assert.equal(routerModelFor('deepseek-chat'), null)
  assert.equal(routerModelFor('gpt-5-flash'), null)
  assert.equal(routerModelFor(''), null)
})

test('isProModel only true for explicit Pro markers', () => {
  assert.equal(isProModel('deepseek-v4-pro'), true)
  assert.equal(isProModel('deepseek-r1'), true)
  assert.equal(isProModel('deepseek-v4-flash'), false)
  assert.equal(isProModel('deepseek-v4-flash-vision-exp'), false)
  assert.equal(isProModel('deepseek-chat'), false)
  assert.equal(isProModel(''), false)
})
