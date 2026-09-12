/**
 * Privacy guard — belt-and-braces enforcement of "nothing leaves the device".
 *
 * The on-device MediaPipe runtime will, by default, POST anonymous usage
 * counters to Google's ML telemetry endpoint. No webcam data is involved, but
 * Posturama promises that camera processing stays local, so we block those
 * calls outright. Everything else (there is nothing else — all assets are
 * vendored to /public) passes straight through.
 *
 * Production builds additionally ship a `connect-src 'self'` CSP (see
 * vite.config.ts); this runtime shim covers dev and is defence-in-depth.
 */
const BLOCKED_HOSTS = new Set([
  'odml.pa.googleapis.com', // MediaPipe / on-device-ML telemetry
  'play.googleapis.com',
  'www.google-analytics.com',
  'firebaselogging.googleapis.com',
  'firebaselogging-pa.googleapis.com',
])

/** Pure: is this URL a known ML-telemetry endpoint we refuse to contact? */
export function isTelemetryHost(url: string, base = 'http://localhost/'): boolean {
  try {
    return BLOCKED_HOSTS.has(new URL(url, base).hostname)
  } catch {
    return false
  }
}

let installed = false

export function installPrivacyGuard(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const base = window.location.href

  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (isTelemetryHost(url, base)) {
      return Promise.resolve(
        new Response(null, { status: 204, statusText: 'blocked-by-privacy-guard' }),
      )
    }
    return nativeFetch(input as RequestInfo, init)
  }

  const NativeXHR = window.XMLHttpRequest
  class GuardedXHR extends NativeXHR {
    override open(method: string, url: string | URL, ...rest: unknown[]): void {
      const target = isTelemetryHost(String(url), base) ? 'data:text/plain,' : url
      // @ts-expect-error – forwarding the native variadic signature
      super.open(method, target, ...rest)
    }
  }
  window.XMLHttpRequest = GuardedXHR as unknown as typeof XMLHttpRequest

  try {
    navigator.sendBeacon = () => false
  } catch {
    /* read-only in some environments — the fetch/XHR guards still apply */
  }
}
