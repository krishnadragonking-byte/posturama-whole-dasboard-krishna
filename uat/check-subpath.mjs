/**
 * Deploy smoke test — proves the built `dist/` works when served from a
 * sub-path (GitHub Pages `/<repo>/`, an S3 key prefix, …), including the
 * on-device MediaPipe WASM + model loading and no 4xx.
 *
 *   npm run build
 *   node uat/check-subpath.mjs
 */
import http from 'node:http'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PREFIX = '/krishna-posturama-neck-posture/'
const PORT = 4891

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.json': 'application/json',
}

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0])
  if (!p.startsWith(PREFIX)) {
    res.writeHead(404)
    return res.end('outside prefix')
  }
  p = p.slice(PREFIX.length) || 'index.html'
  if (p.endsWith('/')) p += 'index.html'
  try {
    const buf = await readFile(join(DIST, normalize(p)))
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' })
    res.end(buf)
  } catch {
    res.writeHead(404)
    res.end('404: ' + p)
  }
})
await new Promise((r) => server.listen(PORT, r))

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const ctx = await browser.newContext({ permissions: ['camera'], viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const problems = []
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  // MediaPipe's TFLite runtime logs its own benign init notices through
  // console.error (both pose and face models) — not an app error.
  if (/Created TensorFlow Lite .* delegate/.test(m.text())) return
  // Chromium separately logs a "Failed to load resource: 404" console error
  // for the expected auth/me 404 (see the response listener above) — same
  // benign, backend-less-test-target cause, would otherwise double-report it.
  if (/Failed to load resource.*404/.test(m.text()) && /auth\/me/.test(m.location()?.url ?? '')) return
  problems.push('console: ' + m.text())
})
page.on('response', (r) => {
  // This smoke test serves dist/ with a bare static file server — no
  // Netlify Functions backend. AuthProvider's GET /api/auth/me (used
  // app-wide to drive the nav's logged-in state and the login/signup
  // redirect) has nothing to talk to here and 404s; the app already
  // handles that gracefully (falls back to "unauthenticated", no crash —
  // see AuthContext.tsx). On a real deploy target (Netlify) this function
  // exists, so this is a gap in what this static-only test can exercise,
  // not an app bug.
  if (r.status() === 404 && r.url().endsWith('/api/auth/me')) return
  if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`)
})

const url = `http://localhost:${PORT}${PREFIX}`
let ok = true
const step = async (label, fn) => {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
  } catch (e) {
    ok = false
    console.error(`  ✗ ${label} — ${e.message}`)
  }
}

console.log(`\nServing dist/ at ${url}\n`)
await step('index.html loads from the sub-path (Home page)', async () => {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Better movement. More play.', { timeout: 10000 })
})
await step('Home → Neck Posture opens the existing module', async () => {
  await page.click('button:has-text("Try Neck Posture")')
  await page.waitForSelector('text=Practice Better Posture', { timeout: 10000 })
})
await step('assets (JS/CSS) resolve — app is interactive', async () => {
  await page.click('button:has-text("Allow Camera")')
})
await step('camera preview streams', () =>
  page.waitForFunction(() => {
    const v = document.querySelector('video')
    return !!v && v.videoWidth > 0
  }, { timeout: 15000 }),
)
await step('MediaPipe WASM + pose model load from the sub-path', () =>
  page.waitForSelector('text=No person detected', { timeout: 30000 }),
)
await page.waitForTimeout(2000)

await step('Home → Couple Smile opens from the sub-path', async () => {
  await page.goto(url + '#couple-smile', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Couple Smile 😊', { timeout: 10000 })
  await page.click('button:has-text("Start Challenge")')
  await page.click('button:has-text("Allow Camera")')
})
await step('MediaPipe WASM + face model load from the sub-path', () =>
  page.waitForSelector("text=We can't see anyone yet.", { timeout: 30000 }),
)
await page.waitForTimeout(2000)
await step('no 4xx / console / page errors', () => {
  if (problems.length) throw new Error('\n    ' + problems.join('\n    '))
})

await browser.close()
server.close()
console.log(ok ? '\n✅ dist/ is deploy-ready for any sub-path host\n' : '\n❌ deploy check failed\n')
process.exit(ok ? 0 : 1)
