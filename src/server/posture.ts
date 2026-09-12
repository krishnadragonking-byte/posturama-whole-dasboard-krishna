/**
 * Server-only OpenAI vision integration for the posture-check dashboard
 * feature. This module never runs in the browser — it's only ever imported
 * by Netlify Function handlers, which read OPENAI_API_KEY from the server
 * environment. The key is never accepted from, or echoed back to, the client.
 *
 * The model is instructed to return conservative, educational, non-diagnostic
 * observations only (see SYSTEM_PROMPT) and the response is normalized so a
 * malformed or partial model reply can never crash the caller or leak
 * unexpected fields to the UI.
 */

export type PostureStatus = 'aligned' | 'mostly-aligned' | 'needs-adjustment'

export interface PostureAnalysis {
  status: PostureStatus
  summary: string
  observations: string[]
  suggestions: string[]
  disclaimer: string
  /**
   * True only for the local placeholder result returned when OPENAI_API_KEY
   * isn't configured (see getDemoAnalysis) — never set on a real OpenAI
   * response. The UI must show this prominently; never present a demo result
   * as if it came from the AI model.
   */
  isDemo?: boolean
  /**
   * True when the optional user-typed description (see analyzePostureImage's
   * `context` param) suggested something beyond general wellness — the model
   * is instructed to defer to a professional rather than address it, and
   * `suggestions` is hard-forced empty in that case (see normalizeAnalysis).
   */
  needsProfessional?: boolean
}

export const EDUCATIONAL_DISCLAIMER = 'Educational guidance only — not medical diagnosis or treatment.'

export const SYSTEM_PROMPT = `You are Posturama's posture-guidance assistant. You look at a single photo a
user has taken of themselves — optionally alongside a short note they typed describing what they're
noticing — and give brief, cautious, educational observations about their visible posture in that image
only.

Rules:
- This is wellness/educational guidance, never a medical diagnosis or treatment.
- Never mention or imply any medical condition, diagnosis, disease, or injury.
- Never claim clinical, professional, or numerically precise accuracy.
- Use uncertain, observational language: "appears", "may", "in this image", "seems".
- Focus only on visibly observable posture characteristics: head position relative to
  shoulders, shoulder levelness, general upper-body alignment.
- Keep suggestions simple, gentle, and non-prescriptive (e.g. relax shoulders, center
  head, take movement breaks) — never claim they will fix, cure, or treat anything.
- If the image does not clearly show a person's head and upper body, say so plainly in
  "summary" and keep "observations" minimal.
- If the user's note (when present) describes anything beyond general wellness — significant or
  persistent pain, numbness, tingling, an injury, "chronic", swelling, or anything urgent-sounding —
  set "needsProfessional" to true, say so plainly in "summary", recommend seeing a doctor or physical
  therapist, and leave "suggestions" empty. Otherwise set "needsProfessional" to false.

Respond ONLY with a JSON object matching exactly this shape, no extra keys, no markdown,
no code fences:
{
  "status": "aligned" | "mostly-aligned" | "needs-adjustment",
  "summary": string (one short sentence, e.g. "Posture appears mostly aligned in this image."),
  "observations": string[] (2-4 short, specific observations),
  "suggestions": string[] (2-3 short, gentle suggestions; empty when needsProfessional is true),
  "needsProfessional": boolean
}`

const STATUS_VALUES: readonly PostureStatus[] = ['aligned', 'mostly-aligned', 'needs-adjustment']

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/

export interface ImageValidationOk {
  ok: true
}
export interface ImageValidationError {
  ok: false
  message: string
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MIN_IMAGE_BYTES = 1000

/** Validates a client-supplied data URL without ever logging its content. */
export function validatePostureImage(image: unknown): ImageValidationOk | ImageValidationError {
  if (typeof image !== 'string' || image.length === 0) {
    return { ok: false, message: 'No image was provided.' }
  }
  const match = DATA_URL_RE.exec(image)
  if (!match) {
    return { ok: false, message: 'Unsupported image format. Please retake the photo.' }
  }
  const approxBytes = (match[2].length * 3) / 4
  if (approxBytes < MIN_IMAGE_BYTES) {
    return { ok: false, message: 'Image appears to be empty. Please retake the photo.' }
  }
  if (approxBytes > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image is too large. Please retake the photo.' }
  }
  return { ok: true }
}

const MAX_CONTEXT_LENGTH = 800
const MIN_CONTEXT_LENGTH = 3

export interface ContextValidationOk {
  ok: true
  context: string | undefined
}
export interface ContextValidationError {
  ok: false
  message: string
}

/** Validates the optional "describe what you're feeling" note that can accompany a photo. */
export function validateAnalysisContext(input: unknown): ContextValidationOk | ContextValidationError {
  if (input === undefined || input === null || input === '') {
    return { ok: true, context: undefined }
  }
  if (typeof input !== 'string') {
    return { ok: false, message: 'Invalid description.' }
  }
  const trimmed = input.trim()
  if (trimmed.length === 0) return { ok: true, context: undefined }
  if (trimmed.length < MIN_CONTEXT_LENGTH) {
    return { ok: false, message: 'Please add a little more detail, or leave it blank.' }
  }
  if (trimmed.length > MAX_CONTEXT_LENGTH) {
    return { ok: false, message: `Please keep this under ${MAX_CONTEXT_LENGTH} characters.` }
  }
  return { ok: true, context: trimmed }
}

/** Coerces an arbitrary parsed JSON value into a safe, UI-ready PostureAnalysis. */
export function normalizeAnalysis(raw: unknown): PostureAnalysis {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const status: PostureStatus = STATUS_VALUES.includes(obj.status as PostureStatus)
    ? (obj.status as PostureStatus)
    : 'mostly-aligned'

  const needsProfessional = obj.needsProfessional === true

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim().length > 0
      ? obj.summary.trim().slice(0, 300)
      : needsProfessional
        ? 'This sounds like something worth checking with a doctor or physical therapist.'
        : 'Posture guidance is available below.'

  const observations = Array.isArray(obj.observations)
    ? obj.observations.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 6)
    : []

  const suggestions = needsProfessional
    ? []
    : Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 6)
      : []

  return {
    status,
    summary,
    observations: observations.length > 0 ? observations : ['No specific observations were returned for this image.'],
    suggestions:
      suggestions.length > 0 || needsProfessional
        ? suggestions
        : ['Take a moment to relax your shoulders and gently center your head.'],
    disclaimer: EDUCATIONAL_DISCLAIMER,
    needsProfessional,
  }
}

const DEMO_VARIANTS: readonly Omit<PostureAnalysis, 'disclaimer' | 'isDemo'>[] = [
  {
    status: 'aligned',
    summary: 'Sample result — head and shoulders appear well aligned in this image.',
    observations: [
      'Head appears reasonably centered over the shoulders.',
      'Shoulders appear roughly level.',
    ],
    suggestions: ['Keep taking regular movement breaks.', 'Keep your screen roughly at eye level.'],
  },
  {
    status: 'mostly-aligned',
    summary: 'Sample result — posture appears mostly aligned in this image.',
    observations: [
      'Head appears slightly forward of the shoulders.',
      'Upper body appears generally upright.',
    ],
    suggestions: ['Try gently drawing your head back over your shoulders.', 'Relax your shoulders down and back.'],
  },
  {
    status: 'needs-adjustment',
    summary: 'Sample result — shoulders appear slightly uneven in this image.',
    observations: ['One shoulder appears a little higher than the other.', 'Head appears tilted slightly to one side.'],
    suggestions: ['Try gently leveling your shoulders.', 'Take a short break and reset your position.'],
  },
]

/**
 * Local placeholder result used only when OPENAI_API_KEY isn't configured, so
 * the app has something to show while you set one up — never presented as a
 * real analysis (`isDemo: true`, and the UI must label it as such). Picks
 * among a few fixed variants deterministically from the image's own bytes,
 * purely so repeated demo captures don't all look identical; this has
 * nothing to do with the actual photo content.
 */
export function getDemoAnalysis(imageDataUrl: string): PostureAnalysis {
  let hash = 0
  for (let i = 0; i < imageDataUrl.length; i += 97) {
    hash = (hash + imageDataUrl.charCodeAt(i)) % DEMO_VARIANTS.length
  }
  const variant = DEMO_VARIANTS[hash]
  return { ...variant, disclaimer: EDUCATIONAL_DISCLAIMER, isDemo: true }
}

const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export interface AnalyzeOptions {
  /**
   * The optional "describe what you're feeling" note the user may type
   * alongside the photo — never required, never sent unless the user
   * explicitly submits it with the photo.
   */
  context?: string
  /** Injectable for unit testing without any network access. */
  fetchImpl?: typeof fetch
}

/**
 * Calls OpenAI's vision-capable chat completions endpoint and returns a
 * normalized, safe-to-render PostureAnalysis.
 */
export async function analyzePostureImage(
  imageDataUrl: string,
  apiKey: string,
  options: AnalyzeOptions = {},
): Promise<PostureAnalysis> {
  const { context, fetchImpl = fetch } = options
  const promptText = context
    ? `The user describes: "${context}". Give brief, educational posture guidance for this image, taking their description into account per the rules above.`
    : 'Give brief, educational posture guidance for this image.'

  const response = await fetchImpl(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
          ],
        },
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

  return normalizeAnalysis(parsed)
}
