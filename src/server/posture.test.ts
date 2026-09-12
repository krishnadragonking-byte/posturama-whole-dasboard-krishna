import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  analyzePostureImage,
  EDUCATIONAL_DISCLAIMER,
  getDemoAnalysis,
  normalizeAnalysis,
  validateAnalysisContext,
  validatePostureImage,
} from './posture'

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function dataUrl(base64: string, mime = 'image/png') {
  return `data:${mime};base64,${base64}`
}

test('validatePostureImage rejects non-strings and empty values', () => {
  assert.equal(validatePostureImage(undefined).ok, false)
  assert.equal(validatePostureImage(null).ok, false)
  assert.equal(validatePostureImage('').ok, false)
  assert.equal(validatePostureImage(42).ok, false)
})

test('validatePostureImage rejects malformed data URLs', () => {
  const result = validatePostureImage('not-a-data-url')
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /format/i)
})

test('validatePostureImage rejects images that are too small to be real', () => {
  const result = validatePostureImage(dataUrl('QQ=='))
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /empty/i)
})

test('validatePostureImage rejects oversized payloads', () => {
  const huge = 'A'.repeat(12 * 1024 * 1024)
  const result = validatePostureImage(dataUrl(huge))
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /too large/i)
})

test('validatePostureImage accepts a well-formed, reasonably sized data URL', () => {
  // Repeat the unpadded body past the 1000-byte floor, then re-pad once at the end
  // so the padding `=` only ever appears where the regex expects it.
  const unpadded = TINY_PNG_BASE64.replace(/=+$/, '')
  const body = unpadded.repeat(40)
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4)
  const result = validatePostureImage(dataUrl(padded))
  assert.equal(result.ok, true)
})

test('normalizeAnalysis fills in safe defaults for a completely empty response', () => {
  const result = normalizeAnalysis({})
  assert.equal(result.status, 'mostly-aligned')
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
  assert.ok(result.observations.length > 0)
  assert.ok(result.suggestions.length > 0)
})

test('normalizeAnalysis rejects an invalid status rather than trusting it', () => {
  const result = normalizeAnalysis({ status: 'diagnosed with kyphosis', summary: 'x' })
  assert.equal(result.status, 'mostly-aligned')
})

test('normalizeAnalysis passes through a well-formed response', () => {
  const result = normalizeAnalysis({
    status: 'needs-adjustment',
    summary: 'Shoulders appear uneven in this image.',
    observations: ['Head appears tilted slightly to the left.'],
    suggestions: ['Try leveling your shoulders gently.'],
  })
  assert.equal(result.status, 'needs-adjustment')
  assert.equal(result.summary, 'Shoulders appear uneven in this image.')
  assert.deepEqual(result.observations, ['Head appears tilted slightly to the left.'])
  assert.deepEqual(result.suggestions, ['Try leveling your shoulders gently.'])
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('normalizeAnalysis strips non-string entries and caps list length', () => {
  const result = normalizeAnalysis({
    status: 'aligned',
    summary: 'ok',
    observations: ['a', 42, null, 'b', 'c', 'd', 'e', 'f', 'g'],
    suggestions: 'not-an-array',
  })
  assert.ok(result.observations.every((s) => typeof s === 'string'))
  assert.ok(result.observations.length <= 6)
  assert.ok(result.suggestions.length > 0)
})

test('analyzePostureImage returns a normalized analysis on a successful OpenAI response', async () => {
  const fakeFetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: 'aligned',
                summary: 'Posture appears well aligned in this image.',
                observations: ['Head appears centered over the shoulders.'],
                suggestions: ['Keep taking movement breaks.'],
              }),
            },
          },
        ],
      }),
      { status: 200 },
    )) as typeof fetch

  const result = await analyzePostureImage(dataUrl(TINY_PNG_BASE64), 'sk-test', { fetchImpl: fakeFetch })
  assert.equal(result.status, 'aligned')
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('analyzePostureImage throws when OpenAI responds with a non-2xx status', async () => {
  const fakeFetch = (async () => new Response('rate limited', { status: 429 })) as typeof fetch
  await assert.rejects(() => analyzePostureImage(dataUrl(TINY_PNG_BASE64), 'sk-test', { fetchImpl: fakeFetch }))
})

test('analyzePostureImage throws when the model reply is not valid JSON', async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 })) as typeof fetch
  await assert.rejects(() => analyzePostureImage(dataUrl(TINY_PNG_BASE64), 'sk-test', { fetchImpl: fakeFetch }))
})

test('analyzePostureImage sends the user-typed context in the prompt when provided', async () => {
  let sentBody: { messages?: Array<{ content?: unknown }> } | undefined
  const fakeFetch = (async (_url, init) => {
    sentBody = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        choices: [
          { message: { content: JSON.stringify({ status: 'aligned', summary: 'x', observations: [], suggestions: [] }) } },
        ],
      }),
      { status: 200 },
    )
  }) as typeof fetch

  await analyzePostureImage(dataUrl(TINY_PNG_BASE64), 'sk-test', {
    context: 'my neck feels stiff',
    fetchImpl: fakeFetch,
  })
  const userMessage = sentBody?.messages?.[1]
  const content = (userMessage?.content ?? []) as Array<{ type: string; text?: string }>
  const textPart = content.find((p) => p.type === 'text')
  assert.match(textPart?.text ?? '', /my neck feels stiff/)
})

test('normalizeAnalysis: needsProfessional forces an empty suggestions list', () => {
  const result = normalizeAnalysis({
    status: 'needs-adjustment',
    summary: 'See a professional.',
    observations: ['a'],
    suggestions: ['this should be dropped'],
    needsProfessional: true,
  })
  assert.equal(result.needsProfessional, true)
  assert.deepEqual(result.suggestions, [])
})

test('normalizeAnalysis: never trusts a non-boolean needsProfessional as true', () => {
  const result = normalizeAnalysis({ needsProfessional: 'yes', suggestions: ['a'] })
  assert.equal(result.needsProfessional, false)
  assert.deepEqual(result.suggestions, ['a'])
})

test('getDemoAnalysis always flags isDemo: true', () => {
  const result = getDemoAnalysis(dataUrl(TINY_PNG_BASE64))
  assert.equal(result.isDemo, true)
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
  assert.ok(['aligned', 'mostly-aligned', 'needs-adjustment'].includes(result.status))
  assert.ok(result.observations.length > 0)
  assert.ok(result.suggestions.length > 0)
})

test('getDemoAnalysis is deterministic for the same input', () => {
  const a = getDemoAnalysis(dataUrl(TINY_PNG_BASE64))
  const b = getDemoAnalysis(dataUrl(TINY_PNG_BASE64))
  assert.deepEqual(a, b)
})

test('normalizeAnalysis (a real OpenAI response) never sets isDemo', () => {
  const result = normalizeAnalysis({ status: 'aligned', summary: 'x', observations: ['a'], suggestions: ['b'] })
  assert.equal(result.isDemo, undefined)
})

test('validateAnalysisContext treats absent/empty as fine — the note is optional', () => {
  assert.deepEqual(validateAnalysisContext(undefined), { ok: true, context: undefined })
  assert.deepEqual(validateAnalysisContext(null), { ok: true, context: undefined })
  assert.deepEqual(validateAnalysisContext(''), { ok: true, context: undefined })
  assert.deepEqual(validateAnalysisContext('   '), { ok: true, context: undefined })
})

test('validateAnalysisContext rejects non-strings and overly long input', () => {
  assert.equal(validateAnalysisContext(42).ok, false)
  assert.equal(validateAnalysisContext('a'.repeat(1000)).ok, false)
})

test('validateAnalysisContext trims and accepts reasonable input', () => {
  const result = validateAnalysisContext('  my neck hurts  ')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.context, 'my neck hurts')
})
