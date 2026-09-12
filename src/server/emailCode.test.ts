import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildVerificationRecord,
  canRequestNewCode,
  checkVerificationCode,
  CODE_LENGTH,
  generateVerificationCode,
  hashVerificationCode,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  secondsUntilNextRequest,
} from './emailCode'

const SECRET = 'test-secret'

test('generateVerificationCode produces a 6-digit numeric string, zero-padded', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateVerificationCode()
    assert.equal(code.length, CODE_LENGTH)
    assert.match(code, /^\d{6}$/)
  }
})

test('hashVerificationCode is deterministic for the same code+secret, differs by secret', () => {
  const a = hashVerificationCode('123456', SECRET)
  const b = hashVerificationCode('123456', SECRET)
  const c = hashVerificationCode('123456', 'a-different-secret')
  assert.equal(a, b)
  assert.notEqual(a, c)
})

test('checkVerificationCode accepts the correct code', () => {
  const now = Date.now()
  const record = buildVerificationRecord('123456', now, SECRET)
  const result = checkVerificationCode(record, '123456', now, SECRET)
  assert.equal(result.ok, true)
})

test('checkVerificationCode rejects an incorrect code', () => {
  const now = Date.now()
  const record = buildVerificationRecord('123456', now, SECRET)
  const result = checkVerificationCode(record, '000000', now, SECRET)
  assert.equal(result.ok, false)
  assert.match(result.message ?? '', /incorrect/i)
})

test('checkVerificationCode rejects when no record exists', () => {
  const result = checkVerificationCode(null, '123456', Date.now(), SECRET)
  assert.equal(result.ok, false)
  assert.match(result.message ?? '', /request a new code/i)
})

test('checkVerificationCode rejects an expired code', () => {
  const now = Date.now()
  const record = buildVerificationRecord('123456', now - 1_000_000, SECRET)
  const result = checkVerificationCode(record, '123456', now, SECRET)
  assert.equal(result.ok, false)
  assert.match(result.message ?? '', /expired/i)
})

test('checkVerificationCode rejects once attempts are exhausted, even with the right code', () => {
  const now = Date.now()
  const record = buildVerificationRecord('123456', now, SECRET)
  record.attempts = MAX_ATTEMPTS
  const result = checkVerificationCode(record, '123456', now, SECRET)
  assert.equal(result.ok, false)
  assert.match(result.message ?? '', /too many/i)
})

test('canRequestNewCode allows a first request and blocks within the cooldown window', () => {
  const now = Date.now()
  assert.equal(canRequestNewCode(null, now), true)

  const justSent = buildVerificationRecord('123456', now, SECRET)
  assert.equal(canRequestNewCode(justSent, now), false)
  assert.equal(canRequestNewCode(justSent, now + RESEND_COOLDOWN_MS + 1), true)
})

test('secondsUntilNextRequest counts down to zero, never negative', () => {
  const now = Date.now()
  const justSent = buildVerificationRecord('123456', now, SECRET)
  assert.ok(secondsUntilNextRequest(justSent, now) > 0)
  assert.equal(secondsUntilNextRequest(justSent, now + RESEND_COOLDOWN_MS + 5000), 0)
  assert.equal(secondsUntilNextRequest(null), 0)
})
