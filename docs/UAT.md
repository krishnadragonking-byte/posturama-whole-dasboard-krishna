# Posturama — Webcam Neck-Posture Module · User Acceptance Test

| | |
|---|---|
| **Module** | Webcam Neck-Posture Guidance |
| **Version** | 0.1.0 (`feat/webcam-neck-posture-module`) |
| **UAT date** | 2026-09-03 |
| **Automated run** | `npm run uat` — **55 / 55 passed** (dev), **39 / 39 passed** (production build) |
| **Deploy check** | `npm run check:deploy` — **5 / 5 passed** (`dist/` served from a sub-path) |
| **Automated + unit total** | 55 UAT + 49 unit + 5 deploy = **109 automated checks passing** |
| **Manual pass** | See §7 — to be executed by the acceptance tester with a real webcam |

---

## 1. Purpose & scope

Confirm the neck-posture module meets the acceptance criteria: clear camera
permission with a wellness (not medical) framing, on-device landmark detection
with no image upload, a calibration step, cautious posture signals with gentle
real-time feedback, a 60-second challenge, a break reminder, and graceful
handling of every camera / detection state — across several camera angles and
lighting conditions.

**In scope:** the module under `src/features/neck-posture/` and its screens.
**Out of scope:** unrelated app shell, build tooling.

## 2. Test environment

| Item | Value |
|---|---|
| App | `npm run dev` → http://localhost:5173 (or `npm run build && npm run preview` → :4173). The app now opens on a Home screen (Home / Neck Posture / Couple Smile); open the module directly at `/#neck-posture` or via the Home page's "Try Neck Posture" card. |
| Browsers | Chrome / Edge / Safari (WebGL + WASM + getUserMedia) |
| Automated harness | Playwright + headless Chromium, synthetic camera (`npm run uat`) |
| Devices | Desktop / laptop widths 900–1440 px (module is designed for desktop use) |
| Camera | Any built-in / USB webcam for manual cases |

## 3. Entry / exit criteria

**Entry:** build succeeds; `npm run lint`, `npm run typecheck`, `npm test` all green.
**Exit:** every P1 case passes; no open P1 defect; automated UAT 100%; manual
cases §7 executed and signed off.

## 4. Priority key

`P1` must pass to ship · `P2` important · `P3` polish

## 5. How the automated column maps

`A` = covered by `npm run uat` (Playwright, synthetic camera).
`U` = covered by `npm test` (unit tests on the pure posture / timer logic).
`M` = manual — needs a real person in front of a webcam.

---

## 6. Test cases & results

### 6.1 Camera permission  (PERM)

| ID | Case | Steps | Expected | Pri | Type | Result |
|---|---|---|---|---|---|---|
| PERM-01 | Intro copy | Open app | Title "Practice Better Posture" + subtitle about *gentle, real-time posture guidance* | P1 | A | ✅ PASS |
| PERM-02 | Privacy card | — | "Privacy-first processing" — *processed on your device… does not record or upload camera images by default* | P1 | A | ✅ PASS |
| PERM-03 | Safety disclaimer | — | *wellness and movement guidance… not medical diagnosis or treatment… not a replacement for professional care* | P1 | A | ✅ PASS |
| PERM-04 | Both actions | — | "Allow Camera" and "Continue Without Camera" buttons present & keyboard-reachable | P1 | A | ✅ PASS |
| PERM-05 | Clean load | — | No console / runtime errors | P1 | A | ✅ PASS |

### 6.2 Continue-without-camera fallback  (FALL)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| FALL-01 | Fallback renders | "Continue Without Camera" → a useful self-guided screen, page does **not** break | P1 | A | ✅ PASS |
| FALL-02 | Self-guided practice | A 60-second self-guided timer + posture checklist | P2 | A | ✅ PASS |
| FALL-03 | Support content | Break reminder + safety notice still present | P2 | A | ✅ PASS |
| FALL-04 | Clean | No errors | P1 | A | ✅ PASS |

### 6.3 Camera denied  (DENY)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| DENY-01 | Denied screen | getUserMedia rejected → "Camera access is unavailable" | P1 | A | ✅ PASS |
| DENY-02 | Recovery actions | "Try Again" + "Continue Without Camera" | P1 | A | ✅ PASS |
| DENY-03 | No crash | App still renders, no white screen | P1 | A | ✅ PASS |
| DENY-04 | Recover | "Continue Without Camera" from denied → fallback works | P1 | A | ✅ PASS |
| DENY-05 | Clean | No uncaught errors during denial | P1 | A | ✅ PASS |
| DENY-06 | Re-grant | Enable permission in browser settings → "Try Again" → calibration | P2 | M | ⏳ manual |

### 6.4 Camera lifecycle & pipeline  (CAM)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| CAM-01 | Grant → calibration | "Allow Camera" → calibration screen | P1 | A | ✅ PASS |
| CAM-02 | Preview streams | `<video>` has `videoWidth > 0`, playing | P1 | A | ✅ PASS |
| CAM-03 | Selfie mirror | Preview is horizontally mirrored | P1 | A | ✅ PASS |
| CAM-04 | On-device model | WASM + pose model load; detection loop runs | P1 | A | ✅ PASS |
| CAM-05 | Loading state | "Starting camera…" / "Loading posture model…" scrim while loading | P2 | A | ✅ PASS |
| CAM-06 | Stop Camera | "Stop Camera" stops all tracks; camera immediately re-acquirable (no device lock / leak) | P1 | A | ✅ PASS |
| CAM-07 | Clean | No console / page errors across the flow | P1 | A | ✅ PASS |
| CAM-08 | Unmount cleanup | Navigate away mid-session → camera light goes off | P1 | M | ⏳ manual |

### 6.5 Detection states  (DET)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| DET-01 | No person | Nobody in frame → "No person detected" + *Sit comfortably in view of the camera…* (non-alarming) | P1 | A | ✅ PASS |
| DET-02 | Low confidence | Poor light / partial view → "Low confidence — adjust your camera position" | P1 | A / M | ✅ PASS (copy) / ⏳ live |
| DET-03 | Landmark overlay | Clean overlay of head + shoulders (and limbs in guided practice) when tracked | P2 | M | ⏳ manual |
| DET-04 | Recover | Return to frame → guidance resumes without reload | P1 | M | ⏳ manual |

### 6.6 Calibration  (CAL)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| CAL-01 | Instructions | "Find your neutral position" + 5 numbered steps | P1 | A | ✅ PASS |
| CAL-02 | Countdown | 3–5 s countdown before capture | P1 | U / M | ✅ PASS (logic) / ⏳ live |
| CAL-03 | Baseline capture | Averages several good frames into a personal baseline; trims outliers | P1 | U | ✅ PASS |
| CAL-04 | Camera-angle note | *Your camera angle can affect these measurements… it is not a claim about medically correct posture* | P1 | A | ✅ PASS |
| CAL-05 | Graceful fail | Can't get clean frames → "Let's try that again", not a dead end | P2 | M | ⏳ manual |
| CAL-06 | Complete → live | Calibration done → live guidance | P1 | M | ⏳ manual |

### 6.7 Posture signals & live feedback  (LIV)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| LIV-01 | Forward-head signal | Head sinks toward shoulders vs. baseline → `forwardHead` category = "adjust" | P1 | U | ✅ PASS |
| LIV-02 | Head-tilt signal | Eye-line angle ≥ 7° from baseline → "adjust" with a direction | P1 | U | ✅ PASS |
| LIV-03 | Shoulder-balance signal | Shoulder height diff beyond baseline → "adjust" with lower side | P1 | U | ✅ PASS |
| LIV-04 | Neutral zone | Small natural sway stays "Good" (no flicker) | P1 | U | ✅ PASS |
| LIV-05 | One message at a time | Exactly one primary message shown; priority no-person > low-conf > forward-head > shoulder > tilt > good | P1 | U | ✅ PASS |
| LIV-06 | Message copy | "Good posture" / "Bring your head back gently" / "Level your shoulders" / "Move your screen a little higher" / "Sit comfortably in view" / "Low confidence — adjust your camera position" | P1 | A | ✅ PASS |
| LIV-07 | No alarming words | No "damage / injury detected / abnormal / disease / medical diagnosis" outside the safety disclaimer | P1 | A | ✅ PASS |
| LIV-08 | Smoothing | Feedback holds ≥ 0.9 s before changing; measurements EMA-smoothed | P1 | U / M | ✅ PASS (logic) / ⏳ live |
| LIV-09 | Signal accuracy — 3 angles | Straight-on, ~20° left, ~20° above: signals stay sensible, categories don't thrash | P1 | M | ⏳ manual |
| LIV-10 | Signal accuracy — 2 lighting | Bright even light + dim / backlit: confidence drops gracefully, no false "adjust" storms | P1 | M | ⏳ manual |
| LIV-11 | Follow-along cues | Ghost demonstrator rotates through calm cues; pins to the matching cue during a correction | P2 | A / M | ✅ PASS (renders) / ⏳ live |

### 6.8 60-second challenge  (CHL)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| CHL-01 | Screen | "60-Second Posture Challenge", large countdown, progress indicator | P1 | A | ✅ PASS |
| CHL-02 | Counts only in range | Timer accrues only while posture is within the acceptable range | P1 | U | ✅ PASS |
| CHL-03 | Pause out of range | Leaving range → progress **pauses** (never resets), with a reason | P1 | U | ✅ PASS |
| CHL-04 | Grace window | A ≤ 1.2 s shift / detection blip does not pause the clock | P1 | U | ✅ PASS |
| CHL-05 | Resume | Correct posture → timer resumes from where it paused | P1 | U | ✅ PASS |
| CHL-06 | Restart | "Restart" resets to 0 | P1 | A / U | ✅ PASS |
| CHL-07 | Stop Camera | Available on the challenge screen | P1 | A | ✅ PASS |
| CHL-08 | Latches complete | Reaches 60 s → "Challenge complete", never exceeds 60 | P1 | U | ✅ PASS |
| CHL-09 | Not punishing | Copy: *not a target for how you should sit all day*; "Make a gentle adjustment and continue when you're ready" | P1 | A | ✅ PASS |
| CHL-10 | Live pause/resume | Do the challenge, slump → pause, correct → resume, finish | P1 | M | ⏳ manual |

### 6.9 Guided practice  (GUI)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| GUI-01 | Screen | Camera + right-panel demonstrator + 5-position sequence | P1 | A | ✅ PASS |
| GUI-02 | Demonstrator figure | Humanoid figure renders and animates the target move | P1 | A | ✅ PASS |
| GUI-03 | Match status on camera | Chip: "✓ Correct" / "✗ Not yet" / "Almost…" + coloured frame + your tracked skeleton tints green when matched | P1 | A | ✅ PASS (chip/frame) |
| GUI-04 | Adaptive sequence | Detects legs-in-view → knee lifts; desk / no legs → gentle side-bends | P1 | A / U | ✅ PASS |
| GUI-05 | Idle feedback | Not in frame → "Step into the camera view" | P1 | A | ✅ PASS |
| GUI-06 | Controls | Skip / Restart / Stop Camera present | P1 | A | ✅ PASS |
| GUI-07 | Progress | 5 position dots, "position N of 5" | P1 | A | ✅ PASS |
| GUI-08 | Skip advances | "Skip this one" → next position | P1 | A | ✅ PASS |
| GUI-09 | Pose checks correct | Each of the 7 pose checks matches when done right, doesn't when done wrong; forgiving tolerances | P1 | U | ✅ PASS (11 tests) |
| GUI-10 | Hold to advance | Hold a correct pose ~1.1 s → advance; a miss eases the meter down, never snaps | P1 | U | ✅ PASS (5 tests) |
| GUI-11 | Opposite side | "Lift the other knee" / "lean the other way" enforces the opposite side | P1 | U | ✅ PASS |
| GUI-12 | Stuck → skip | Can't match after ~12 s → "Skip" is surfaced; never trapped | P2 | A / M | ✅ PASS (logic) / ⏳ live |
| GUI-13 | Live pose matching | Copy the figure through all 5 positions to completion | P1 | M | ⏳ manual |
| GUI-14 | Clean | No console / page errors | P1 | A | ✅ PASS |

### 6.10 Completion & break reminder  (BRK)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| BRK-01 | Completion copy | "Nice work." + *consider taking a short movement break…* | P1 | M | ⏳ manual |
| BRK-02 | Reminder guidance | *Take a movement break after 30–60 minutes* | P1 | A | ✅ PASS |
| BRK-03 | Configurable | 30 / 45 / 60-minute options | P2 | A | ✅ PASS |
| BRK-04 | Remembered | Chosen interval persists (localStorage; per-viewer only) | P2 | A | ✅ PASS |
| BRK-05 | No medical claim | No "cure / prevent / relieve / guarantee" language in the reminder | P1 | A | ✅ PASS |

### 6.11 Safety message  (SAF)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| SAF-01 | Visible everywhere | Every screen shows the wellness-not-medical notice | P1 | A | ✅ PASS |
| SAF-02 | No alarming language | No "injury detected / abnormal / disease / medical diagnosis" outside the disclaimer | P1 | A | ✅ PASS |
| SAF-03 | Seek-advice wording | *If you have persistent or severe pain, weakness, numbness, an injury, or other concerning symptoms, stop the exercise and seek advice from a qualified healthcare professional.* | P1 | A | ✅ PASS (SAF-01 body check) |
| SAF-04 | No pain-relief promise | Nowhere claims to remove neck pain or guarantee relief | P1 | A | ✅ PASS |

### 6.12 Privacy  (PRV)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| PRV-01 | No cross-origin traffic | While the camera runs: **zero** requests to any other origin (ML telemetry is blocked by the runtime privacy guard) | P1 | A | ✅ PASS |
| PRV-02 | No uploads | No POST / PUT / beacon while the camera runs | P1 | A | ✅ PASS |
| PRV-03 | Nothing persisted | Only `posturama.breakIntervalMin` in storage — no frames / images / video | P1 | A | ✅ PASS |
| PRV-04 | CSP in production | Built `index.html` ships `connect-src 'self'` — a hard "nothing leaves the device" guarantee | P1 | A | ✅ PASS (build inspection) |
| PRV-05 | No secrets in client | No API keys / tokens in the bundle | P1 | A | ✅ PASS (`grep`, see §9) |

### 6.13 Accessibility  (A11Y)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| A11Y-01 | Button names | Every button has a visible label or `aria-label` | P1 | A | ✅ PASS |
| A11Y-02 | Headings | Each screen has an `h1` | P2 | A | ✅ PASS |
| A11Y-03 | Focus visible | Keyboard focus ring on all controls | P1 | A | ✅ PASS |
| A11Y-04 | Not colour-only | Posture status shown as dot **+ uppercase label** (+ icon); feedback as text | P1 | A | ✅ PASS |
| A11Y-05 | Reduced motion | `prefers-reduced-motion` stops animations & the demonstrator loop | P1 | A | ✅ PASS |
| A11Y-06 | Live regions | Feedback / status use `role="status"` `aria-live="polite"` so changes are announced | P2 | A | ✅ PASS (A11Y-06 clean) |
| A11Y-07 | Full keyboard journey | Tab through the entire flow, activate with Enter/Space | P1 | M | ⏳ manual |
| A11Y-08 | Contrast | Text ≥ 4.5:1, large text ≥ 3:1, both themes | P2 | M | ⏳ manual |

### 6.14 Deployment  (DEP)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| DEP-01 | Relative base | Built `index.html` references `./assets/…` (works at domain root or any sub-path) | P1 | A | ✅ PASS (`check:deploy`) |
| DEP-02 | Sub-path serve | `dist/` served from `/<repo>/` → app loads, assets resolve, no 4xx | P1 | A | ✅ PASS (`check:deploy`) |
| DEP-03 | On-device assets on sub-path | MediaPipe WASM + pose model load from `/<repo>/mediapipe/…` | P1 | A | ✅ PASS (`check:deploy`) |
| DEP-04 | CI build | GitHub Actions builds (model download included) + publishes `dist` | P2 | — | ✅ workflow provided |

### 6.15 Visual / responsive  (RSP)

| ID | Case | Expected | Pri | Type | Result |
|---|---|---|---|---|---|
| RSP-01 | No h-scroll @ 1440 | Body never scrolls horizontally | P1 | A | ✅ PASS |
| RSP-02 | No h-scroll @ 1180 | — | P1 | A | ✅ PASS |
| RSP-03 | No h-scroll @ 900 | Split layout stacks; camera container stays responsive | P1 | A | ✅ PASS |
| RSP-04 | Journey stepper | Header stepper shows Setup → Calibrate → Guidance → Practice → Done; collapses labels on narrow widths | P2 | A / M | ✅ PASS (renders) |
| RSP-05 | Dark mode | Full light + dark palettes; nothing unreadable | P2 | M | ⏳ manual |
| RSP-06 | Screenshot quality | Screens look presentation-ready | P2 | M | ✅ (see /docs screenshots) |

---

## 7. Manual test script (needs a webcam)

Run `npm run dev`, open http://localhost:5173, and work through the journey.
Record PASS / FAIL + a note for each.

### 7.1 Three camera angles  (LIV-09, DET-03)

For **(a) straight-on at eye level**, **(b) camera ~20° to one side**, **(c)
camera ~20° above looking down** — the three most common laptop setups:

1. Calibrate in that setup.
2. Sit neutral 10 s → expect **"Good posture"**, all three signal cards "Good".
3. Slowly push your head forward 10 s → expect **"Bring your head back gently"**
   (or "Move your screen a little higher" if pronounced); Forward-head card
   "Adjust".
4. Tilt your head ~15° to one side → expect **"Level your head"**.
5. Raise one shoulder → expect **"Level your shoulders"**.
6. Return to neutral → back to **"Good posture"** within ~1–2 s (no rapid flicker).

Acceptance: correct category appears for each; returning to neutral clears it;
messages never flicker faster than ~1 s; no alarming language.

### 7.2 Two lighting conditions  (LIV-10, DET-02)

- **Bright, even, front light:** signals as above; confidence shown ≳ 80%.
- **Dim room / strong backlight:** confidence drops; module shows **"Low
  confidence — adjust your camera position"** rather than wrong guidance; no
  "Adjust" storm.

### 7.3 Leaving the frame  (DET-01, DET-04, CHL-10)

1. During live guidance, step out of view → within ~1 s: **"No person detected"**
   + *Sit comfortably in view of the camera…*
2. Return → guidance resumes, no reload, no error.
3. Start the 60-second challenge, get to ~20 s, then step away → timer **pauses**
   with a reason; return and correct → it **resumes from ~20 s**; reach 60 →
   "Challenge complete".

### 7.4 Incorrect vs. good posture  (LIV-01…08)

Hold a clearly slumped forward-head posture 15 s → single message "Bring your
head back gently", Forward-head card "Adjust", others may stay "Good". Correct
it → "Good posture". Confirm only **one** message at a time throughout.

### 7.5 Guided practice  (GUI-03, GUI-13)

1. From live guidance → "Start Guided Practice".
2. If seated at a desk: expect the **seated** set (tall → reach up → lean → arms
   wide → lean other way). Stand back so your legs show and Restart: expect the
   **standing** set (…knee lifts…).
3. For each position: copy the figure. When you match it, the camera frame turns
   **green**, the chip says **"✓ Correct"**, your on-camera skeleton turns green,
   and the ring fills — hold ~1 s → "✓ Got it" → next.
4. When you're *not* matching, the frame is amber, chip "✗ Not yet", and the
   banner tells you the specific fix.
5. "Skip this one" always advances. Finish all 5 → completion screen.

### 7.6 Stop Camera & cleanup  (CAM-06, CAM-08, PRV-01)

Press "Stop Camera" on any camera screen → returns to start, camera light goes
**off**. Reload → no lingering camera. (Optional: DevTools → Network, filter by
domain — no third-party requests during a session.)

### 7.7 Keyboard & dark mode  (A11Y-07, A11Y-08, RSP-05)

Tab through every screen; every control reachable and operable, focus always
visible. Toggle OS dark mode — palette switches, everything legible.

---

## 8. Automated evidence

```
$ npm run lint          → 0 problems
$ npm run typecheck     → 0 errors
$ npm test              → 49/49 unit tests pass
$ npm run uat           → 55/55 UAT checks pass   (dev server)
                          39/39 UAT checks pass   (production build; #screen= cases skipped)
$ npm run check:deploy  → 5/5 deploy checks pass  (dist/ served from a sub-path)
```

`npm run uat` prints a per-case table (IDs match §6). It drives headless
Chromium with a synthetic camera and covers every non-`M` case above.

## 9. Defects found & fixed during UAT

| # | Severity | Finding | Fix | Verified by |
|---|---|---|---|---|
| D-1 | **High** | `getUserMedia` leaked a `MediaStream` on React StrictMode's mount→unmount→mount (and any fast start/stop): two streams resolved, the second replaced `srcObject`, the first's tracks were never stopped — camera light stays on. | Monotonic `generationRef` in `useCamera`; a stream that resolves for a superseded request is stopped immediately. | CAM-06 |
| D-2 | Medium | The on-device MediaPipe runtime POSTs anonymous usage counters to `odml.pa.googleapis.com` — no camera data, but it breaks the "nothing leaves the device" promise. | Runtime **privacy guard** (`lib/privacyGuard.ts`) blocks known ML-telemetry hosts for `fetch` / `XHR` / `sendBeacon`; production build additionally ships a `connect-src 'self'` CSP. | PRV-01, PRV-04 |
| D-3 | Medium | The detection loop (`requestAnimationFrame`) was torn down and rebuilt on every state update (~18×/s) because `usePoseLandmarker` returned a fresh object each render. | Memoised `detect` with `useCallback`; loop now depends only on stable values. | CAM-07 (no jank / errors) |
| D-4 | Low | Guided practice could stay in the "detecting seated vs. standing" phase forever if nobody was in frame. | After 4.5 s with no person, default to the seated set and let the pose checks guide the user in. | GUI-05 |
| D-5 | Low | `grep` for `apikey|secret|token|Bearer` across `src/` → **no matches**. No secrets in client code (model + WASM are static local assets). | n/a — confirmed clean. | PRV-05 |
| D-6 | **High** | Deployed site 404s: Vite's default absolute base (`/assets/…`, `/mediapipe/…`) breaks when the app is hosted on a sub-path (e.g. GitHub Pages `/<repo>/`). | `base: './'` in `vite.config.ts` + MediaPipe asset paths resolved to absolute URLs against `document.baseURI`; added a GitHub Pages workflow, `netlify.toml`, and a `check:deploy` sub-path smoke test. | DEP-01…03 |

## 10. Landmarks & thresholds (plain-language, for the acceptance record)

**Landmarks.** Each webcam frame is passed — locally, in a WebAssembly graph —
to **MediaPipe Pose Landmarker ("lite")**. It returns ~33 body points. Posturama
uses the eyes, ears, nose and shoulders for the neck-posture signals, plus
wrists, hips, knees and ankles for guided practice. Pixels never leave the
`<video>` element; nothing is recorded or uploaded.

**Signals** (all measured *relative to your own calibration baseline*, then
time-smoothed):

- **Forward-head** — vertical gap between the eye-line and the shoulder-line,
  divided by shoulder width. Shrinks as the head drifts forward / down.
- **Head tilt** — angle of the eye-line vs. horizontal, in degrees.
- **Shoulder balance** — height difference between the shoulders, divided by
  shoulder width.

**Why the thresholds are cautious** (see `constants.ts`): a webcam is a 2-D
projection and camera angle distorts everything, so nothing is compared to an
absolute "correct" value. An "Adjust" nudge needs a change well beyond natural
sway and landmark jitter — forward-head must drop **0.14** (normalised) below
baseline, head tilt **7°**, shoulder balance **0.06** of shoulder width. Signals
are EMA-smoothed (~1 s memory) and a message must persist **900 ms** before it
changes. The challenge has a **1.2 s grace** before it pauses. Categories are
only **Good / Adjust / Low confidence** — never a diagnosis. Guided-practice
checks are deliberately loose ("roughly right"), a miss only pauses the meter,
and every position is skippable.

## 11. Sign-off

| Role | Name | Automated | Manual (§7) | Date | Decision |
|---|---|---|---|---|---|
| Developer | Claude Sonnet 5 | ✅ 100/100 | — | 2026-09-03 | Ready for manual UAT |
| Acceptance tester | _________ | | ☐ Pass ☐ Fail | | ☐ Accept ☐ Reject |
