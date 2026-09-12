import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  askPostureQuestion,
  EDUCATIONAL_DISCLAIMER,
  getDemoAskResponse,
  normalizeAskResponse,
  validateQuestion,
} from './ask'

test('validateQuestion rejects non-strings', () => {
  assert.equal(validateQuestion(undefined).ok, false)
  assert.equal(validateQuestion(42).ok, false)
  assert.equal(validateQuestion(null).ok, false)
})

test('validateQuestion rejects too-short input', () => {
  const result = validateQuestion('hi')
  assert.equal(result.ok, false)
})

test('validateQuestion rejects overly long input', () => {
  const result = validateQuestion('a'.repeat(1000))
  assert.equal(result.ok, false)
})

test('validateQuestion trims and accepts reasonable input', () => {
  const result = validateQuestion('  My neck feels stiff after sitting all day.  ')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.question, 'My neck feels stiff after sitting all day.')
})

test('normalizeAskResponse: needsProfessional forces an empty suggestions list', () => {
  const result = normalizeAskResponse({
    answer: 'See a professional.',
    suggestions: ['this should be dropped'],
    needsProfessional: true,
  })
  assert.equal(result.needsProfessional, true)
  assert.deepEqual(result.suggestions, [])
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('normalizeAskResponse: passes through a well-formed general-wellness response', () => {
  const result = normalizeAskResponse({
    answer: 'Try a few gentle stretches.',
    suggestions: ['Stand up every hour.', 'Roll your shoulders.'],
    needsProfessional: false,
  })
  assert.equal(result.needsProfessional, false)
  assert.deepEqual(result.suggestions, ['Stand up every hour.', 'Roll your shoulders.'])
})

test('normalizeAskResponse: fills in safe defaults for a malformed response', () => {
  const result = normalizeAskResponse({})
  assert.equal(result.needsProfessional, false)
  assert.ok(result.answer.length > 0)
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('normalizeAskResponse: never trusts a non-boolean needsProfessional as true', () => {
  const result = normalizeAskResponse({ needsProfessional: 'yes', suggestions: ['a'] })
  assert.equal(result.needsProfessional, false)
  assert.deepEqual(result.suggestions, ['a'])
})

test('getDemoAskResponse always flags isDemo: true and includes the disclaimer', () => {
  const result = getDemoAskResponse('my back hurts')
  assert.equal(result.isDemo, true)
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('getDemoAskResponse is deterministic for the same input', () => {
  const a = getDemoAskResponse('same question')
  const b = getDemoAskResponse('same question')
  assert.deepEqual(a, b)
})

test('askPostureQuestion returns a normalized response on success', async () => {
  const fakeFetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: 'Gentle movement breaks may help.',
                suggestions: ['Take a short walk.'],
                needsProfessional: false,
              }),
            },
          },
        ],
      }),
      { status: 200 },
    )) as typeof fetch

  const result = await askPostureQuestion('stiff neck', 'sk-test', fakeFetch)
  assert.equal(result.needsProfessional, false)
  assert.equal(result.disclaimer, EDUCATIONAL_DISCLAIMER)
})

test('askPostureQuestion throws on a non-2xx response', async () => {
  const fakeFetch = (async () => new Response('down', { status: 500 })) as typeof fetch
  await assert.rejects(() => askPostureQuestion('stiff neck', 'sk-test', fakeFetch))
})
