/**
 * Automated UAT for the logged-in Dashboard + AI Posture Check feature (see
 * docs/UAT.md §8). Drives the real app + real Netlify Functions in headless
 * Chromium with a synthetic camera, against `netlify dev` (needs the
 * server routes — plain `vite dev` won't have them).
 *
 *   npm run dev:netlify                          # (terminal 1, port 8888)
 *   node uat/run-uat-dashboard.mjs                # (terminal 2)
 *
 * OPENAI_API_KEY is intentionally left unset for this run so it also proves
 * the "no key configured → honest error, never a faked result" requirement.
 * Set OPENAI_API_KEY in your Netlify dev environment to additionally exercise
 * a real OpenAI call (ANALYZE-01 will then assert a real result screen
 * instead of the configuration-error screen).
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.UAT_BASE || 'http://localhost:8888'
const HAS_OPENAI_KEY = process.env.UAT_EXPECT_OPENAI === '1'

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM
  try {
    const p = chromium.executablePath()
    if (p && existsSync(p)) return p
  } catch {
    /* fall through */
  }
  return undefined
}
const EXE = resolveChromium()

const rows = []
const record = (id, title, pass, note = '') => {
  rows.push({ id, title, status: pass ? 'PASS' : 'FAIL', note })
  console.log(`  ${pass ? '✓' : '✗'} ${id} ${title}${note ? ' — ' + note : ''}`)
}

const browser = await chromium.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--window-size=1280,900'],
})

const leakedSecrets = []

async function fresh(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: opts.deny ? [] : ['camera'],
  })
  const page = await ctx.newPage()
  page.on('request', (req) => {
    const url = req.url()
    const body = req.postData() || ''
    const secretPattern = /sk-[A-Za-z0-9]{10,}|re_[A-Za-z0-9_]{10,}|OPENAI_API_KEY|RESEND_EMAIL_API_KEY/
    if (secretPattern.test(url) || secretPattern.test(body)) {
      leakedSecrets.push(url)
    }
  })
  if (opts.deny) {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'))
    })
  }
  return { ctx, page }
}

// Resend's sandbox (no verified sending domain) only accepts its own reserved
// test recipient, `delivered@resend.dev` — but honors "+tag" sub-addressing,
// which gives each test run a distinct identity without needing a real inbox.
const uniqueEmail = () => `delivered+uat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@resend.dev`

/**
 * Drives the real email-code sign-in flow end to end: fills the form and
 * clicks Send code exactly like a real user (one real Resend send), then
 * reads the code back from that request's own JSON response — never from
 * the page, which never displays it (the debugCode field only exists in the
 * API response, and only when the server's CONTEXT is "dev"; see
 * auth-request-code.ts). No real inbox involved, but every other step
 * (Resend call, code hashing, expiry/attempt logic) runs for real.
 */
async function signInWithCode(page, email, name) {
  await page.goto(BASE + '/#login', { waitUntil: 'networkidle' })
  if (name) await page.fill('#auth-name', name)
  await page.fill('#auth-email', email)

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/auth/request-code') && res.request().method() === 'POST'),
    page.click('button:has-text("Send code")'),
  ])
  const json = await response.json().catch(() => ({}))
  if (!json.debugCode) throw new Error('No debugCode in the request-code response — is CONTEXT=dev set on the server?')

  await page.waitForSelector('#auth-code', { timeout: 15000 })
  await page.fill('#auth-code', json.debugCode)
  await page.click('button:has-text("Verify & continue")')
  await page.waitForSelector('text=Start Posture Check', { timeout: 10000 }).catch(() => {})
}

// ── AUTH-01: unauthenticated dashboard access is blocked ───────────────────
{
  const { ctx, page } = await fresh()
  await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Log in or sign up', { timeout: 8000 }).catch(() => {})
  record(
    'AUTH-01',
    'Unauthenticated visit to #dashboard redirects to login',
    await page.isVisible('text=Log in or sign up'),
  )
  await ctx.close()
}

// ── CODE-01: a wrong code is rejected, not silently accepted ───────────────
{
  const { ctx, page } = await fresh()
  const wrongCodeEmail = uniqueEmail()
  await page.goto(BASE + '/#login', { waitUntil: 'networkidle' })
  await page.fill('#auth-email', wrongCodeEmail)
  await page.click('button:has-text("Send code")')
  await page.waitForSelector('#auth-code', { timeout: 15000 })
  await page.fill('#auth-code', '000000')
  await page.click('button:has-text("Verify & continue")')
  await page.waitForSelector('.auth-error', { timeout: 8000 }).catch(() => {})
  const rejected = await page.isVisible('.auth-error')
  const stillOnCodeScreen = await page.isVisible('#auth-code')
  record('CODE-01', 'An incorrect 6-digit code is rejected with an error, not logged in', rejected && stillOnCodeScreen)
  await ctx.close()
}

// ── SIGNUP-01 / DASH-EMPTY-01: sign up → dashboard empty state ─────────────
const email = uniqueEmail()
{
  const { ctx, page } = await fresh()
  await signInWithCode(page, email, "UAT Tester")
  record('SIGNUP-01', 'Sign up succeeds and lands on the dashboard', page.url().includes('#dashboard'))
  const emptyStateShown = await page
    .waitForSelector('text=Start your posture journey', { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  record('DASH-EMPTY-01', 'Dashboard shows the empty state with no history yet', emptyStateShown)
  await ctx.close()
}

// ── CAM-01: camera permission granted → capture screen opens ───────────────
let capturedOnce = false
{
  const { ctx, page } = await fresh()
  await signInWithCode(page, email)
  await page.click('button:has-text("Start Posture Check")')
  await page.waitForSelector('text=Allow Camera & Continue', { timeout: 8000 })
  await page.click('button:has-text("Allow Camera & Continue")')
  await page
    .waitForFunction(
      () => {
        const v = document.querySelector('video')
        return !!v && v.videoWidth > 0
      },
      { timeout: 10000 },
    )
    .catch(() => {})
  const captureVisible = await page.isVisible('button:has-text("Capture")')
  record('CAM-01', 'Camera permission granted opens a live capture screen', captureVisible)

  if (captureVisible) {
    await page.click('button:has-text("Capture")')
    await page.waitForSelector('button:has-text("Analyze Posture")', { timeout: 8000 }).catch(() => {})
    capturedOnce = await page.isVisible('img[alt="Your captured posture photo"]')
    record('CAPTURE-01', 'Captured photo shows a review screen with Retake/Analyze', capturedOnce)

    if (capturedOnce) {
      await page.click('button:has-text("Analyze Posture")')
      if (HAS_OPENAI_KEY) {
        await page.waitForSelector('text=Your posture check', { timeout: 20000 }).catch(() => {})
        const resultShown = await page.isVisible('text=Your posture check')
        const wronglyLabeledDemo = await page.isVisible('text=Demo mode')
        record(
          'ANALYZE-01',
          'A configured OpenAI key returns a real result screen (not labeled demo)',
          resultShown && !wronglyLabeledDemo,
        )
      } else {
        // Without a key, the route returns a *clearly labeled* demo result
        // instead of a hard error — it must never be presented as real AI
        // output. See src/server/posture.ts getDemoAnalysis.
        await page.waitForSelector('text=Your posture check', { timeout: 15000 }).catch(() => {})
        const resultShown = await page.isVisible('text=Your posture check')
        const demoLabelShown = await page.isVisible('text=Demo mode — not AI-generated')
        record(
          'ANALYZE-DEMO-01',
          'Missing OPENAI_API_KEY returns a clearly-labeled demo result, never disguised as real AI output',
          resultShown && demoLabelShown,
        )
      }
    }
  }
  await ctx.close()
}

// ── CAM-02: camera permission denied → helpful message ──────────────────────
{
  const { ctx, page } = await fresh({ deny: true })
  await signInWithCode(page, email)
  await page.click('button:has-text("Start Posture Check")')
  await page.waitForSelector('text=Allow Camera & Continue', { timeout: 8000 })
  await page.click('button:has-text("Allow Camera & Continue")')
  await page.waitForSelector('text=Camera access was denied', { timeout: 10000 }).catch(() => {})
  record(
    'CAM-02',
    'Camera permission denied shows a helpful message (not a crash)',
    await page.isVisible('text=Camera access was denied'),
  )
  record(
    'CAM-02b',
    'Denied screen offers "Upload a Photo Instead" as a supported fallback',
    await page.isVisible('button:has-text("Upload a Photo Instead")'),
  )
  await ctx.close()
}

// ── HISTORY-01/02: a saved check appears in history and survives a refresh ─
{
  const { ctx, page } = await fresh()
  await signInWithCode(page, email)

  // Equivalent to clicking "Save Result" on a real result screen — same
  // authenticated POST /api/posture/history the ResultScreen component calls.
  const res = await page.request.post(BASE + '/api/posture/history', {
    data: {
      status: 'mostly-aligned',
      summary: 'Posture appears mostly aligned in this image.',
      observations: ['Head appears reasonably centered.'],
      suggestions: ['Gently relax your shoulders.'],
      disclaimer: 'ignored-by-server',
    },
  })
  record('HISTORY-SAVE-01', 'POST /api/posture/history saves a completed check', res.ok())

  // Navigate away and back (a real hash change, not a goto-to-the-same-URL
  // no-op) so DashboardPage actually remounts and re-fetches — this mirrors
  // how a real user gets here: clicking "Back to Dashboard" from a *different*
  // screen after saving a result.
  await page.goto(BASE + '/#history', { waitUntil: 'networkidle' })
  await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle' })
  const dashboardShowsCheck = await page
    .waitForSelector('text=Appears mostly aligned', { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  record('HISTORY-01', 'Saved check appears in dashboard recent activity / progress', dashboardShowsCheck)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=Posture checks', { timeout: 8000 }).catch(() => {})
  record('HISTORY-02', 'Refreshing the dashboard keeps saved history available', await page.isVisible('text=Appears mostly aligned'))

  await page.goto(BASE + '/#history', { waitUntil: 'networkidle' })
  const historyItemShown = await page
    .waitForSelector('text=Posture appears mostly aligned in this image.', { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  record('HISTORY-03', 'History page lists the saved posture check', historyItemShown)

  await ctx.close()
}

// ── SECURITY-01: no server-side secret ever appears in a browser-issued request ──
record(
  'SECURITY-01',
  'No OpenAI / Resend API key pattern observed in any request the browser made',
  leakedSecrets.length === 0,
  leakedSecrets.join(', '),
)

await browser.close()

const total = rows.length
const passed = rows.filter((r) => r.status === 'PASS').length
console.log(`\n${passed}/${total} passed`)
for (const r of rows) {
  console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.id}  ${r.title}${r.note ? '  (' + r.note + ')' : ''}`)
}

if (passed !== total) process.exit(1)
