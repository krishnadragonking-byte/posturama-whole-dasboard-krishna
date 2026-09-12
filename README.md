# Posturama — Webcam Neck-Posture Guidance + AI Dashboard

A privacy-first, on-device webcam posture-practice experience, plus a
logged-in dashboard with a server-side AI posture check:

**Camera permission → Calibration → Live guidance → Guided practice *or* 60-second challenge → Completion → Break reminder**

*Guided practice* is a copy-the-figure sequence. A soft humanoid demonstrator
shows five easy positions, one at a time; the sequence **adapts** to what the
camera sees (legs in view → knee lifts; at a desk → gentle side-bends). As you
move, the camera frame + a status chip give clear **"✓ Correct" / "✗ Not yet" /
"Almost…"** feedback with the specific fix, and your own tracked skeleton turns
green when you match. Hold a correct position ~1 s and it advances. Every
position can be skipped; nothing is punished.

Built with React + TypeScript + Vite. All landmark detection for **Neck
Posture** and **Couple Smile** runs in the browser via MediaPipe Tasks Vision
(WebAssembly) — **those webcam frames are never uploaded, recorded, or
persisted.** A runtime privacy guard blocks the ML runtime's telemetry, and
production builds ship a `connect-src 'self'` CSP.

## The Dashboard + AI Posture Check

A separate, opt-in, logged-in experience at `#dashboard` (see [`src/features/dashboard/`](src/features/dashboard/),
[`src/features/posture-check/`](src/features/posture-check/), [`src/features/auth/`](src/features/auth/),
[`src/features/history/`](src/features/history/)):

- **Auth** — passwordless: enter an email, get a 6-digit code by email (via
  [Resend](https://resend.com)), enter the code. The same flow serves both new
  and returning users — the first correct code for an email creates the
  account. No password is ever stored. Session is a server-verified cookie
  (HttpOnly, signed, 30-day). See [`src/server/auth.ts`](src/server/auth.ts),
  [`src/server/emailCode.ts`](src/server/emailCode.ts) (code hashing, expiry,
  rate limiting), and [`src/server/resend.ts`](src/server/resend.ts).
- **Posture Check** — an explicit consent screen *before* any camera access →
  live capture → review → **one** photo sent once to a secure server route →
  AI-assisted, educational-only guidance. The photo is used in memory for
  that one request and is **not** stored; only the guidance (status, summary,
  observations, suggestions) is saved to history.
- **Secure AI route** — `POST /api/posture/analyze` (a Netlify Function, see
  [`netlify/functions/posture-analyze.ts`](netlify/functions/posture-analyze.ts))
  is the *only* place that talks to OpenAI. It reads `OPENAI_API_KEY` from the
  server environment — never sent to, or readable from, the browser. Without a
  key configured, it returns a clearly-flagged **demo result** (`isDemo: true`)
  instead of a real analysis, so the flow is still usable while you set one
  up — the UI shows a prominent "Demo mode — not AI-generated" notice (result
  screen, dashboard, and history all label demo entries) and it is never
  presented as if it came from the AI model. See `getDemoAnalysis` in
  [`src/server/posture.ts`](src/server/posture.ts).
- **History + progress** — every saved check is a Netlify Blobs record with
  status/summary/observations/suggestions/date — never the image. The
  dashboard's stats (total checks, active days, latest check) are computed
  from that real saved history, never fabricated.
- **Guidance is always educational** — every screen carries "Educational
  guidance only — not medical diagnosis or treatment," and the AI prompt
  (see [`src/server/posture.ts`](src/server/posture.ts)) is instructed to use
  uncertain, observational language and never claim diagnostic or clinical
  accuracy.

### Running it locally

The dashboard needs the server routes, which plain `vite dev` doesn't serve.
Use the Netlify CLI (already a dev dependency):

```bash
cp .env.example .env   # fill in OPENAI_API_KEY, SESSION_SECRET, and RESEND_EMAIL_API_KEY
npm run dev:netlify    # http://localhost:8888 — full stack (Vite + Netlify Functions + Blobs)
```

`npm run dev` (plain Vite, port 5173) still works for the on-device Neck
Posture / Couple Smile modules and any UI-only iteration, but `/api/*` calls
will 404 there — use `dev:netlify` whenever you're touching auth, the
dashboard, history, or the AI posture check.

An automated Playwright UAT for this feature lives at
[`uat/run-uat-dashboard.mjs`](uat/run-uat-dashboard.mjs) — run it against a
running `dev:netlify` server: `UAT_BASE=http://localhost:8888 node uat/run-uat-dashboard.mjs`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173  (predev fetches the on-device model once)
```

Other scripts:

| command | what it does |
| --- | --- |
| `npm run setup` | vendor the MediaPipe WASM runtime + download the pose model into `public/` |
| `npm run dev` | start the Vite-only dev server (runs `setup` first) — no `/api/*` routes |
| `npm run dev:netlify` | start the **full stack** (Vite + Netlify Functions + Blobs) via Netlify Dev — needed for auth/dashboard/AI posture check |
| `npm run build` | type-check + production build (runs `setup` first) |
| `npm run typecheck` | `tsc` only (covers the app, the server routes, and Netlify Functions) |
| `npm run test` | unit tests — posture math, feedback, challenge + practice clocks, guided-pose checks, privacy guard, **plus auth/session/OpenAI-response/history-validation/progress-stats logic for the dashboard** |
| `npm run uat` | automated UAT for Neck Posture / Couple Smile / Home (Playwright + synthetic camera) — see [`docs/UAT.md`](docs/UAT.md) |
| `node uat/run-uat-dashboard.mjs` | automated UAT for the Dashboard + AI Posture Check — run against `dev:netlify` (see below) |
| `npm run lint` | oxlint |

**Testing:** `npm test` (96 unit) + `npm run uat` (80 UAT, dev) + the dashboard's
own Playwright UAT = automated coverage across both the on-device modules and
the server-backed dashboard. The formal acceptance plan, results, defect log
and a manual webcam script for Neck Posture / Couple Smile are in
[`docs/UAT.md`](docs/UAT.md). Run the UAT with the app already serving:
`npm run dev` then `UAT_BASE=http://localhost:5173 npm run uat`.

For the dashboard: `npm run dev:netlify` (terminal 1), then in terminal 2
`UAT_BASE=http://localhost:8888 node uat/run-uat-dashboard.mjs`. It covers
unauthenticated-access blocking, sign-in-by-code (including a rejected wrong
code), the empty state, camera granted/denied, capture → review, the
clearly-labeled demo result returned when `OPENAI_API_KEY` is unset, saving a
result, history surviving a refresh, and a check that no OpenAI/Resend key
ever appears in a browser-issued request.

Since sign-in emails a real code via Resend, the test drives the real send
(to `delivered+<unique>@resend.dev`, Resend's own reserved sandbox test
address — safe to hit repeatedly, no real inbox involved) and reads the code
back from that request's own JSON response, which includes a `debugCode`
field only when Netlify's `CONTEXT` env var is `"dev"` (true for local
`netlify dev`, never for a deployed site) — see `auth-request-code.ts`. The
UI itself never displays this field; real users only ever get the code by
email.

> The first `setup` needs internet to download `pose_landmarker_lite.task`
> (~5.5 MB) from Google's public model bucket. After that everything is local.
> These binaries are git-ignored and regenerated by `setup`.

Dev-only visual gallery of the data-driven states: open `/#gallery`.

## Deploy

The build uses a **relative base path** (`base: './'` in `vite.config.ts`), so
`dist/` works served from a domain root *or* any sub-path — no config needed.
The MediaPipe WASM + model end up in `dist/mediapipe/` (~17 MB); **that folder
must be uploaded too.**

| Host | How |
| --- | --- |
| **GitHub Pages** | Settings → Pages → Source = **GitHub Actions**. The included [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes on every push to `main`. (Do **not** point Pages at the repo root — `index.html` there is the dev entry and will 404 on `/src/main.tsx`.) **Static-only — the Dashboard's auth/history/AI routes won't work here.** |
| **Netlify** | Connect the repo — [`netlify.toml`](netlify.toml) sets build `npm run build`, publish `dist`, and deploys `netlify/functions/` automatically. **This is the only listed target where the Dashboard's server routes actually run.** Set `OPENAI_API_KEY`, `SESSION_SECRET`, and `RESEND_EMAIL_API_KEY` under Site configuration → Environment variables before going live (see below). |
| **Cloudflare Pages / Vercel / any static host / S3** | Works for the static app (`npm run build`, upload `dist/` including `dist/mediapipe/`), but the Dashboard's `/api/*` routes are Netlify Functions and won't run unless ported to that host's own functions format. |

### Deploying the Dashboard's server routes

The Dashboard needs two environment variables set on the Netlify site
(**Site configuration → Environment variables** — never in a committed file):

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only OpenAI key for `POST /api/posture/analyze`. Without it, that route returns a clearly-labeled demo result (never disguised as a real analysis — see above) instead of calling OpenAI. |
| `SESSION_SECRET` | Signs the session cookie **and** the emailed verification codes (see [`src/server/auth.ts`](src/server/auth.ts) / [`src/server/emailCode.ts`](src/server/emailCode.ts)). Use a long random value, different per environment. |
| `RESEND_EMAIL_API_KEY` | Server-only [Resend](https://resend.com) key for `POST /api/auth/request-code`. Without it, requesting a code returns a clear configuration error instead of pretending an email was sent. The default sender (`onboarding@resend.dev`) only delivers to your own Resend account email until you verify a sending domain — see Resend's dashboard. |

Posture-check history is stored in [Netlify Blobs](https://docs.netlify.com/blobs/overview/),
which is automatically available to Netlify Functions on a deployed site — no
separate database to provision.

The CI/host build runs `prebuild` → `npm run setup`, which needs one-time network
access to `storage.googleapis.com` to fetch the pose model. If your build
environment blocks that, run `npm run build` locally and deploy the `dist/`
folder directly.

**Common 404 causes:** deploying the repo instead of `dist/` (GitHub Pages);
not uploading `dist/mediapipe/`; or a host that rewrites unknown paths — this app
uses hash routing only (`#gallery`, `#screen=…`), so it needs **no** SPA
catch-all redirect.

## Where the code lives

Everything is under [`src/features/neck-posture/`](src/features/neck-posture/):

```
NeckPostureModule.tsx     state machine (permission → … → complete)
constants.ts              ALL thresholds + timings, centralised & commented
lib/
  postureMath.ts          pure geometry: forward-head, tilt, shoulder balance
  challengeClock.ts       pure 60-second timer transitions
  practiceClock.ts        pure guided-practice hold → advance transitions
  feedback.ts             picks the single primary message
  smoothing.ts            exponential moving average
  privacyGuard.ts         blocks the ML runtime's telemetry (nothing leaves the device)
  poses.ts / cues.ts      the live "follow-along" ghost figure + cue loops
  frontPoses.ts           front-facing skeleton for guided practice
  guidedPoses.ts          7 guided positions + match checkers; seated & standing sets
  poseMatch.ts            forgiving "are you doing the pose?" geometry
hooks/
  useCamera.ts            getUserMedia lifecycle + track cleanup
  usePoseLandmarker.ts    loads the on-device model
  usePostureEngine.ts     camera + model + detection loop + overlay
  useCalibration.ts       countdown + baseline capture
  useChallenge.ts         drives challengeClock from rAF
  usePostureReading.ts    engine output + baseline → categories + feedback
  useGuidedCues.ts        rotates the follow-along positions, pins to corrections
  useGuidedPractice.ts    guided-practice sequence: match → hold → advance
components/
  DemoFigure.tsx          side-profile humanoid demonstrator (live follow-along)
  FrontDemoFigure.tsx     front-facing "copy me" humanoid figure (guided practice)
  JourneyStepper.tsx      header progress rail
  GuidedPracticeScreen.tsx
  CueStrip.tsx            "position N of 5" control
  … one component per screen / widget

Dev shortcuts (dev build only): `/#gallery` shows every state; `/#screen=guided`
(or `live`, `challenge`, `calibration`, `complete`) jumps straight to a screen.
```

The design system primitives are in [`src/design-system/`](src/design-system/);
tokens are in [`src/index.css`](src/index.css).

The Dashboard + AI Posture Check feature is split across:

```
src/server/                 pure, unit-tested server logic (no Netlify/Node coupling in the API surface)
  auth.ts                   password hashing (scrypt), signed session tokens, cookie helpers
  posture.ts                OpenAI vision prompt + call + response normalization
  history.ts                history record shape + input validation
netlify/functions/          thin Netlify Function handlers (import from src/server/*)
  auth-signup.ts / auth-login.ts / auth-logout.ts / auth-me.ts
  posture-analyze.ts        POST /api/posture/analyze — the only place that calls OpenAI
  posture-history.ts        GET/POST /api/posture/history
src/features/
  auth/                     AuthContext, LoginPage, SignupPage
  dashboard/                DashboardPage, progress stats (computeProgress)
  posture-check/            consent → camera → capture → review → analyze → result state machine
  history/                  HistoryPage + the useHistory hook shared with the dashboard
src/lib/                    api.ts (fetch wrapper), postureTypes.ts (client-side result/history types)
```

## Safety

Posturama is for general wellness and movement guidance. It does not diagnose or
treat medical conditions and does not guarantee pain relief. It is not a
replacement for professional care. The AI Posture Check specifically is
educational guidance only, phrased with uncertain, observational language
("appears", "may", "in this image") — it never claims medical, clinical, or
numerically precise accuracy.
