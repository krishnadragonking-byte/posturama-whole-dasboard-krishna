/**
 * Server-only text Q&A for the "describe how you're feeling" dashboard
 * feature. Same safety posture as posture.ts: educational only, never a
 * diagnosis. Unlike the photo route, a free-text description can plausibly
 * describe something beyond general wellness (real pain, injury, numbness),
 * so the prompt is explicitly instructed to defer to a professional rather
 * than attempt to address that itself — see SYSTEM_PROMPT.
 */

export interface AskResponse {
  answer: string
  suggestions: string[]
  /** True when the model judged this beyond general wellness and deferred to a professional. */
  needsProfessional: boolean
  disclaimer: string
  isDemo?: boolean
}

export const EDUCATIONAL_DISCLAIMER = 'Educational guidance only — not medical diagnosis or treatment.'

export const ASK_SYSTEM_PROMPT = `You are Posturama's posture and movement guidance assistant. A user has
described a posture, movement, or general discomfort concern in their own words. Respond with brief,
cautious, educational guidance only.

Rules:
- This is wellness/educational guidance only, never a medical diagnosis or treatment.
- Never diagnose, name, or imply any medical condition, disease, injury, or clinical finding.
- Never claim clinical, professional, or numerically precise accuracy.
- Use uncertain, general language ("may help", "some people find", "consider") rather than definitive claims.
- Keep suggestions to simple, gentle movement/posture/ergonomic ideas — never medication, never treatment
  claims, never a promise of pain relief or a cure.
- If the description suggests anything beyond general wellness (e.g. significant or persistent pain,
  numbness, tingling, an injury, "chronic", "can't move", swelling, or anything that sounds urgent),
  set "needsProfessional" to true, say so plainly in "answer", recommend seeing a doctor, physical
  therapist, or other qualified professional, and keep "suggestions" empty — do not attempt to address
  it yourself.
- Keep "answer" short: 2-4 sentences.

Respond ONLY with a JSON object matching exactly this shape, no extra keys, no markdown, no code fences:
{
  "answer": string,
  "suggestions": string[] (0-3 short items; empty when needsProfessional is true),
  "needsProfessional": boolean
}`

const MAX_QUESTION_LENGTH = 800
const MIN_QUESTION_LENGTH = 3

export interface QuestionValidationOk {
  ok: true
  question: string
}
export interface QuestionValidationError {
  ok: false
  message: string
}

export function validateQuestion(input: unknown): QuestionValidationOk | QuestionValidationError {
  if (typeof input !== 'string') {
    return { ok: false, message: 'Please describe how you’re feeling.' }
  }
  const trimmed = input.trim()
  if (trimmed.length < MIN_QUESTION_LENGTH) {
    return { ok: false, message: 'Please add a little more detail.' }
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { ok: false, message: `Please keep this under ${MAX_QUESTION_LENGTH} characters.` }
  }
  return { ok: true, question: trimmed }
}

/** Coerces an arbitrary parsed JSON value into a safe, UI-ready AskResponse. */
export function normalizeAskResponse(raw: unknown): AskResponse {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const needsProfessional = obj.needsProfessional === true

  const answer =
    typeof obj.answer === 'string' && obj.answer.trim().length > 0
      ? obj.answer.trim().slice(0, 600)
      : needsProfessional
        ? 'This sounds like something worth checking with a doctor or physical therapist rather than general posture tips.'
        : 'Here are a few general, gentle ideas to try.'

  const suggestions = needsProfessional
    ? []
    : Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
      : []

  return {
    answer,
    suggestions,
    needsProfessional,
    disclaimer: EDUCATIONAL_DISCLAIMER,
  }
}

const DEMO_ANSWERS: readonly Omit<AskResponse, 'disclaimer' | 'isDemo'>[] = [
  {
    answer: 'Sample response — for general stiffness after long sitting, gentle movement breaks often help.',
    suggestions: ['Stand up and stretch every 30-60 minutes.', 'Gently roll your shoulders a few times.'],
    needsProfessional: false,
  },
  {
    answer:
      'Sample response — if this involves real pain, numbness, or an injury, a doctor or physical therapist can assess it properly.',
    suggestions: [],
    needsProfessional: true,
  },
]

/** Local placeholder used only when OPENAI_API_KEY isn't configured — never a real analysis. */
export function getDemoAskResponse(question: string): AskResponse {
  let hash = 0
  for (let i = 0; i < question.length; i += 7) hash = (hash + question.charCodeAt(i)) % DEMO_ANSWERS.length
  return { ...DEMO_ANSWERS[hash], disclaimer: EDUCATIONAL_DISCLAIMER, isDemo: true }
}

const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Calls OpenAI's text chat completions endpoint and returns a normalized,
 * safe-to-render AskResponse. `fetchImpl` is injectable for unit testing
 * without any network access.
 */
export async function askPostureQuestion(
  question: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AskResponse> {
  const response = await fetchImpl(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ASK_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed with status ${response.status}: ${text.slice(0, 300)}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenAI response did not include any content.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI response was not valid JSON.')
  }

  return normalizeAskResponse(parsed)
}
