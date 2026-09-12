import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Production-only Content-Security-Policy. Everything Posturama needs is served
 * from its own origin (the MediaPipe WASM + model are vendored to /public), so
 * `connect-src 'self'` is a hard guarantee that no data — camera or otherwise —
 * is sent anywhere. `wasm-unsafe-eval` + `blob:` workers are required by the
 * on-device ML runtime. Not applied in dev (Vite HMR needs a websocket).
 */
const CSP = [
  "default-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // 'self' plus data: — Vite inlines a few small self-hosted font subsets as
  // base64 data: URIs at build time; without this they're silently blocked.
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'none'",
  // note: frame-ancestors is header-only; set it at the host if embedding matters
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'posturama-csp',
    transformIndexHtml(html, ctx) {
      if (ctx.server) return html // dev — skip (HMR websocket)
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  /**
   * Relative asset paths so the built site works when served from the domain
   * root *or* any sub-path (GitHub Pages `/<repo>/`, a preview folder, S3 key
   * prefix, …). Override with `VITE_BASE=/my-path/` if you need an absolute one.
   */
  base: process.env.VITE_BASE || './',
  plugins: [react(), cspPlugin()],
  /**
   * `strictPort` makes Vite fail loudly if 5173 is taken (e.g. by another
   * checkout of this project running alongside this one) instead of silently
   * drifting to 5174+ — which would desync from `netlify.toml`'s fixed
   * `targetPort` and make `netlify dev` proxy to the wrong app.
   */
  server: { strictPort: true },
})
