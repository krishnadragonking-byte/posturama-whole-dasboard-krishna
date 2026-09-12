import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sendVerificationEmail } from './resend'

test('sendVerificationEmail posts to Resend with the code in the body', async () => {
  let capturedUrl: string | undefined
  let capturedBody: Record<string, unknown> | undefined
  let capturedAuth: string | undefined
  const fakeFetch = (async (url, init) => {
    capturedUrl = String(url)
    capturedAuth = (init?.headers as Record<string, string>)?.Authorization
    capturedBody = JSON.parse(String(init?.body))
    return new Response('{}', { status: 200 })
  }) as typeof fetch

  await sendVerificationEmail('person@example.com', '123456', 'test-key', fakeFetch)

  assert.equal(capturedUrl, 'https://api.resend.com/emails')
  assert.equal(capturedAuth, 'Bearer test-key')
  assert.deepEqual(capturedBody?.to, ['person@example.com'])
  assert.match(String(capturedBody?.html), /123456/)
  // A plain-text alternative alongside the HTML — a text-only version is a
  // real deliverability signal, not just a nice-to-have.
  assert.match(String(capturedBody?.text), /123456/)
})

test('sendVerificationEmail throws on a non-2xx response', async () => {
  const fakeFetch = (async () => new Response('bad request', { status: 400 })) as typeof fetch
  await assert.rejects(() => sendVerificationEmail('person@example.com', '123456', 'test-key', fakeFetch))
})

test('sendVerificationEmail escapes HTML in the code (defense in depth, even though codes are always digits)', async () => {
  let capturedBody: Record<string, unknown> | undefined
  const fakeFetch = (async (_url, init) => {
    capturedBody = JSON.parse(String(init?.body))
    return new Response('{}', { status: 200 })
  }) as typeof fetch

  await sendVerificationEmail('person@example.com', '<script>', 'test-key', fakeFetch)
  assert.doesNotMatch(String(capturedBody?.html), /<script>/)
})
