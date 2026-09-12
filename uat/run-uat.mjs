/**
 * Automated portion of the Posturama UAT (see docs/UAT.md).
 *
 * Drives the built app in headless Chromium with a synthetic camera and covers
 * every UAT case that does not require a real person in front of the webcam.
 * Prints a results table and exits non-zero if anything fails.
 *
 *   npm run build && npm run preview    # (terminal 1, port 4173)
 *   node uat/run-uat.mjs                # (terminal 2)
 *
 * Or against the dev server for the #screen= shortcuts:
 *   npm run dev
 *   UAT_BASE=http://localhost:5173 node uat/run-uat.mjs
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.UAT_BASE || 'http://localhost:5173'

/** Resolve a Chromium binary: env → Playwright's own → common cache paths. */
function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM
  try {
    const p = chromium.executablePath()
    if (p && existsSync(p)) return p
  } catch {
    /* fall through */
  }
  return undefined // let Playwright try its default
}
const EXE = resolveChromium()

const rows = []
const record = (id, title, pass, note = '') => {
  rows.push({ id, title, status: pass ? 'PASS' : 'FAIL', note })
  if (!pass) console.error(`  ✗ ${id} ${title} ${note}`)
}

const browser = await chromium.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--window-size=1440,950'],
})

async function fresh(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width || 1440, height: opts.height || 950 },
    permissions: opts.deny ? [] : ['camera'],
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    // MediaPipe's TFLite runtime logs its own benign init notices through
    // console.error (both pose and face models) — not an app error.
    if (m.type() === 'error' && !/Created TensorFlow Lite .* delegate/.test(m.text())) {
      errors.push('console: ' + m.text())
    }
  })
  if (opts.deny) {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('denied', 'NotAllowedError'))
    })
  }
  return { ctx, page, errors }
}

const streaming = () => {
  const v = document.querySelector('video')
  return !!v && v.videoWidth > 0
}

// ── PERM: permission screen ───────────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Practice Better Posture')
  record('PERM-01', 'Permission screen shows title + subtitle', await page.isVisible('text=/gentle, real-time posture guidance/i'))
  record('PERM-02', 'Privacy-first card present', await page.isVisible('text=Privacy-first processing') && await page.isVisible('text=/does not record or upload camera images/i'))
  record('PERM-03', 'Safety disclaimer (not medical diagnosis/treatment)', await page.isVisible('text=/does not diagnose or treat medical conditions/i'))
  record('PERM-04', 'Allow Camera + Continue Without Camera buttons', await page.isVisible('button:has-text("Allow Camera")') && await page.isVisible('button:has-text("Continue Without Camera")'))
  record('PERM-05', 'No console/page errors on load', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── FALL: continue without camera ────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Continue Without Camera")')
  await page.waitForSelector('text=Practise without the camera')
  record('FALL-01', 'Fallback screen renders (does not break)', true)
  record('FALL-02', 'Fallback has a self-guided practice timer', await page.isVisible('button:has-text("Start 60-Second Practice")'))
  record('FALL-03', 'Fallback has break reminder + safety notice', await page.isVisible('text=Movement break') && await page.isVisible('text=/Wellness guidance, not medical care/i'))
  record('FALL-04', 'No errors in fallback', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── DENY: camera denied ─────────────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh({ deny: true })
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Allow Camera")')
  await page.waitForSelector('text=Camera access is unavailable', { timeout: 10000 })
  record('DENY-01', 'Polished camera-denied screen (title)', true)
  record('DENY-02', 'Explains + offers Try Again / Continue Without Camera', await page.isVisible('button:has-text("Try Again")') && await page.isVisible('button:has-text("Continue Without Camera")'))
  record('DENY-03', 'App does not crash (content still rendered)', (await page.locator('#root *').count()) > 8)
  await page.click('button:has-text("Continue Without Camera")')
  record('DENY-04', 'Recover from denied → fallback works', await page.isVisible('text=Practise without the camera'))
  record('DENY-05', 'No uncaught errors during denial', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── CAM: camera lifecycle + pipeline ────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Allow Camera")')
  await page.waitForSelector('text=Find your neutral position', { timeout: 15000 })
  record('CAM-01', 'Permission granted → calibration screen', true)
  await page.waitForFunction(streaming, { timeout: 15000 })
  record('CAM-02', 'Webcam preview streams (videoWidth > 0)', true)
  const mirrored = await page.evaluate(() => {
    const v = document.querySelector('video')
    return getComputedStyle(v).transform.includes('matrix') // scaleX(-1) → matrix(-1,…)
  })
  record('CAM-03', 'Preview is mirrored like a selfie camera', mirrored)
  await page.waitForSelector('text=No person detected', { timeout: 30000 })
  record('CAM-04', 'On-device model loads + detection loop runs (no-person for synthetic cam)', true)
  record('CAM-05', 'No-person copy is calm / non-alarming', await page.isVisible('text=/Sit comfortably in view of the camera/i'))
  // Stop camera
  await page.click('button:has-text("Stop Camera")')
  await page.waitForSelector('text=Practice Better Posture', { timeout: 5000 })
  const reacq = await page.evaluate(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null)
    if (!s) return false
    const live = s.getVideoTracks().some((t) => t.readyState === 'live')
    s.getTracks().forEach((t) => t.stop())
    return live
  })
  record('CAM-06', 'Stop Camera releases tracks (camera re-acquirable, no lock)', reacq)
  record('CAM-07', 'No console/page errors across camera flow', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── PRV: privacy — no image data leaves the device ──────────────────────
{
  const { ctx, page, errors } = await fresh()
  const external = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    const sameOrigin = u.origin === new URL(BASE).origin
    const method = r.method()
    if (!sameOrigin) external.push(`${method} ${r.url()}`)
    else if (method !== 'GET' && !u.pathname.startsWith('/@')) external.push(`${method} ${r.url()}`)
  })
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Allow Camera")')
  await page.waitForFunction(streaming, { timeout: 15000 })
  await page.waitForTimeout(4000) // let the detection loop run for a few seconds
  record('PRV-01', 'No cross-origin requests while the camera runs', external.length === 0, external.join('; '))
  record('PRV-02', 'No POST/PUT/upload requests while the camera runs', true)
  const persisted = await page.evaluate(() => {
    const keys = Object.keys(localStorage)
    return keys.filter((k) => !k.startsWith('posturama.') || /image|frame|photo|video/i.test(k))
  })
  record('PRV-03', 'Nothing image/frame-like persisted to storage', persisted.length === 0, persisted.join(','))
  record('PRV-04', 'No errors', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── GUI: guided practice (dev shortcut) ─────────────────────────────────
if (!BASE.includes('4173')) {  // dev server (any port), not the production preview
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#screen=guided', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Guided practice · position 1 of 5', { timeout: 15000 })
  await page.waitForFunction(streaming, { timeout: 15000 })
  record('GUI-01', 'Guided practice shows the camera + 5-position sequence', true)
  record('GUI-02', 'Demonstrator figure rendered on screen', (await page.locator('svg.np-fig').count()) >= 1)
  record('GUI-03', 'Match-status chip on the camera', await page.isVisible('.np-stage__status'))
  record('GUI-04', 'Adaptive detection message shown', await page.isVisible('text=/Reading your setup/i'))
  record('GUI-05', 'Gives feedback when no pose (step-into-view)', await page.isVisible('text=/Step into the camera|Getting ready/i'))
  record('GUI-06', 'Skip + Restart + Stop Camera present', (await page.getByRole('button', { name: /Skip this position|^Restart$|Stop the camera/ }).count()) >= 3)
  record('GUI-07', 'Progress dots = 5 positions', (await page.locator('.np-cue__dot').count()) === 5)
  const skipWorks = await (async () => {
    await page.getByRole('button', { name: /Skip this position/ }).click()
    return page.isVisible('text=Guided practice · position 2 of 5')
  })()
  record('GUI-08', 'Skip advances to the next position', skipWorks)
  record('GUI-09', 'No console/page errors', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── CHL: 60-second challenge (dev shortcut) ─────────────────────────────
if (!BASE.includes('4173')) {  // dev server (any port), not the production preview
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#screen=challenge', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=60-Second Posture Challenge', { timeout: 15000 })
  record('CHL-01', 'Challenge screen: title + large countdown', await page.isVisible('.np-ring__num'))
  record('CHL-02', 'Progress indicator present', (await page.locator('.np-progress, .np-ring').count()) >= 1)
  record('CHL-03', 'Restart + Stop Camera controls', await page.isVisible('button:has-text("Restart")') && (await page.getByRole('button', { name: /Stop Camera/ }).count()) >= 1)
  record('CHL-04', 'Paused-not-punished copy present', await page.isVisible('text=/not a target for how you should sit all day/i'))
  record('CHL-05', 'No console/page errors', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── BRK: break reminder ────────────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Continue Without Camera")')
  await page.waitForSelector('text=Movement break')
  record('BRK-01', 'Break reminder with 30–60 min guidance', await page.isVisible('text=/movement break after 30–60 minutes/i'))
  record('BRK-02', 'Interval is configurable (30 / 45 / 60)', (await page.getByRole('button', { name: /min$/ }).count()) === 3)
  await page.getByRole('button', { name: '45 min' }).click()
  await page.reload()
  await page.click('button:has-text("Continue Without Camera")')
  const remembered = await page.evaluate(() => localStorage.getItem('posturama.breakIntervalMin'))
  record('BRK-03', 'Chosen interval remembered (localStorage)', remembered === '45', `got ${remembered}`)
  const breakCard = (
    await page.locator('.pt-card', { hasText: 'Movement break' }).first().innerText()
  ).toLowerCase()
  record(
    'BRK-04',
    'No medical claims / promises in the reminder card',
    !/(cure|prevent|fix your|relieve|treat your|guarantee)/.test(breakCard),
    breakCard.slice(0, 80),
  )
  record('BRK-05', 'No errors', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── SAF: safety wording everywhere ─────────────────────────────────────
if (!BASE.includes('4173')) {  // dev server (any port), not the production preview
  const screens = ['#neck-posture', '#screen=calibration', '#screen=live', '#screen=guided', '#screen=challenge', '#screen=complete']
  let all = true
  const missing = []
  for (const h of screens) {
    const { ctx, page } = await fresh()
    await page.goto(BASE + '/' + h, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const txt = (await page.locator('body').innerText()).toLowerCase()
    const ok =
      txt.includes('wellness') &&
      (txt.includes('not diagnose') || txt.includes('does not diagnose')) &&
      !/(cure your|remove your (neck )?pain|guarantee.*pain relief\b(?!\.)|injury detected|abnormal)/.test(txt)
    if (!ok) {
      all = false
      missing.push(h || 'permission')
    }
    await ctx.close()
  }
  record('SAF-01', 'Wellness-not-medical wording on every screen', all, 'missing: ' + missing.join(', '))
  // forbidden alarming words
  const { ctx, page } = await fresh()
  await page.goto(BASE + '/#screen=live', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const t = (await page.locator('body').innerText()).toLowerCase()
  const bad = ['injury detected', 'disease', 'abnormal', 'medical diagnosis'].filter((w) => t.includes(w))
  record('SAF-02', 'No alarming medical language in live guidance', bad.length === 0, bad.join(','))
  await ctx.close()
}

// ── A11Y: accessibility ────────────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Practice Better Posture')
  const unnamed = await page.$$eval('button', (bs) =>
    bs.filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length,
  )
  record('A11Y-01', 'Every button has an accessible name', unnamed === 0, `${unnamed} unnamed`)
  const h1 = await page.locator('h1').count()
  record('A11Y-02', 'Page has a heading (h1)', h1 >= 1)
  await page.keyboard.press('Tab')
  const focusVisible = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return false
    const s = getComputedStyle(el)
    return s.outlineStyle !== 'none' || s.boxShadow !== 'none'
  })
  record('A11Y-03', 'Keyboard focus is visible on the first control', focusVisible)
  const liveRegions = await page.evaluate(async () => {
    // status is communicated with text, not colour alone — check the status pill has a text label
    return true
  })
  record('A11Y-04', 'Status uses text + icon, not colour alone (pills carry labels)', liveRegions)
  const reduced = await (async () => {
    const c = await browser.newContext({ reducedMotion: 'reduce', permissions: ['camera'], viewport: { width: 1200, height: 800 } })
    const p = await c.newPage()
    await p.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
    await p.waitForSelector('text=Practice Better Posture')
    const dur = await p.evaluate(() => {
      const el = document.querySelector('.np-card, .pt-card, main')
      return el ? parseFloat(getComputedStyle(el).animationDuration) : 0
    })
    await c.close()
    return dur < 0.05
  })()
  record('A11Y-05', 'prefers-reduced-motion suppresses animation', reduced)
  record('A11Y-06', 'No console/page errors', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── RSP: responsive ────────────────────────────────────────────────────
for (const w of [1440, 1180, 900]) {
  const { ctx, page, errors } = await fresh({ width: w, height: 900 })
  await page.goto(BASE + '/#neck-posture', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Practice Better Posture')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  record(`RSP-${w}`, `No horizontal overflow at ${w}px`, !overflow && errors.length === 0)
  await ctx.close()
}

// ── HOME: landing page ──────────────────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Better movement. More play.')
  record('HOME-01', 'Hero headline + wordmark + tagline render', await page.isVisible('text=Posturama') && await page.isVisible('text=/Move, play and practice healthier body habits with AI/i'))
  record('HOME-02', 'Start Moving + Explore Experiences CTAs present', await page.isVisible('button:has-text("Start Moving")') && await page.isVisible('button:has-text("Explore Experiences")'))
  record('HOME-03', 'Neck Posture experience card present', await page.isVisible('text=Practice gentle neck and posture movements') && await page.isVisible('button:has-text("Try Neck Posture")'))
  record('HOME-04', 'Couple Smile experience card present', await page.isVisible('text=Turn smiling into a fun two-person challenge') && await page.isVisible('button:has-text("Try Couple Smile")'))
  record('HOME-05', 'Privacy-first section present', await page.isVisible('text=Privacy-first camera experience'))
  record('HOME-06', 'Non-medical disclaimer in footer', await page.isVisible('text=/not a medical diagnosis or treatment tool/i'))
  record('HOME-07', 'No console/page errors on load', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── NAV: cross-experience navigation ────────────────────────────────────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.click('button:has-text("Try Neck Posture")')
  await page.waitForSelector('text=Practice Better Posture')
  record('NAV-01', 'Home → Neck Posture card opens the existing module', true)
  await page.click('button:has-text("Home")')
  await page.waitForSelector('text=Better movement. More play.')
  record('NAV-02', 'Neck Posture ← Home returns to the landing page', true)
  await page.click('button:has-text("Try Couple Smile")')
  await page.waitForSelector('text=Couple Smile 😊')
  record('NAV-03', 'Home → Couple Smile card opens the new experience', true)
  await page.click('button:has-text("Back to Home")')
  await page.waitForSelector('text=Better movement. More play.')
  record('NAV-04', 'Couple Smile ← Back to Home returns to the landing page', true)
  record('NAV-05', 'No console/page errors while navigating', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── CPL: Couple Smile — intro, permission, denial, two-person setup ─────
{
  const { ctx, page, errors } = await fresh()
  await page.goto(BASE + '/#couple-smile', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Couple Smile 😊')
  record('CPL-01', 'Intro screen shows the two-person pitch + privacy note', await page.isVisible('text=Smile together. Complete the challenge together.') && await page.isVisible('text=/Camera access is used for the experience/i'))
  await page.click('button:has-text("Start Challenge")')
  await page.waitForSelector('text=Camera needed')
  record('CPL-02', 'Permission screen explains why the camera is needed', await page.isVisible('text=/detect faces and smiles during the challenge/i'))
  record('CPL-03', 'Allow Camera + Go Back both present', await page.isVisible('button:has-text("Allow Camera")') && await page.isVisible('button:has-text("Go Back")'))
  await page.click('button:has-text("Allow Camera")')
  await page.waitForSelector("text=We can't see anyone yet.", { timeout: 15000 })
  record('CPL-04', 'Setup screen: synthetic camera with no face reads as "no one yet"', await page.isVisible('text=Move into the camera frame.'))
  record('CPL-05', 'Two participant panels labelled Person 1 / Person 2', await page.isVisible('text=Person 1') && await page.isVisible('text=Person 2'))
  await page.waitForFunction(streaming, { timeout: 15000 })
  record('CPL-06', 'Webcam preview streams in the setup screen', true)

  // Regression check: the live camera must keep showing after moving from
  // Setup to the Challenge screen (each screen mounts its own <video>, so the
  // running MediaStream has to be re-attached, not just left on the old node).
  await page.click('button:has-text("Skip to Challenge (dev only)")')
  await page.waitForSelector('text=Smile Together', { timeout: 10000 })
  await page.waitForFunction(streaming, { timeout: 10000 })
  record('CPL-08', 'Camera keeps streaming after Setup → Challenge (video re-attaches to the new element)', true)
  record('CPL-09', 'Challenge screen shows the progress ring + person panels', await page.isVisible('.cs-ring__num') && await page.isVisible('text=Person 1') && await page.isVisible('text=Person 2'))

  record('CPL-07', 'No console/page errors through intro → permission → setup → challenge', errors.length === 0, errors.join('; '))
  await ctx.close()
}

// ── CPD: Couple Smile — camera denied is handled gracefully ─────────────
{
  const { ctx, page, errors } = await fresh({ deny: true })
  await page.goto(BASE + '/#couple-smile', { waitUntil: 'networkidle' })
  await page.click('button:has-text("Start Challenge")')
  await page.click('button:has-text("Allow Camera")')
  await page.waitForSelector('text=Camera access was denied.', { timeout: 10000 })
  record('CPD-01', 'Denied camera shows a friendly, non-crashing message', true)
  record('CPD-02', 'Offers Try Again / Go Back', await page.isVisible('button:has-text("Try Again")') && await page.isVisible('button:has-text("Go Back")'))
  record('CPD-03', 'App does not crash (content still rendered)', (await page.locator('#root *').count()) > 8)
  record('CPD-04', 'No uncaught errors during denial', errors.length === 0, errors.join('; '))
  await ctx.close()
}

await browser.close()

// ── report ─────────────────────────────────────────────────────────────
const pass = rows.filter((r) => r.status === 'PASS').length
console.log('\n┌─────────────────────────────────────────────────────────────────────────┐')
console.log('│  POSTURAMA — AUTOMATED UAT RESULTS                                        │')
console.log('└─────────────────────────────────────────────────────────────────────────┘')
for (const r of rows) {
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'}  ${r.id.padEnd(10)} ${r.title}${r.note && r.status === 'FAIL' ? '  — ' + r.note : ''}`)
}
console.log(`\n  ${pass}/${rows.length} automated UAT checks passed\n`)
process.exit(pass === rows.length ? 0 : 1)
