import heroImage from './hero-posturama.png'

/**
 * Hero image: real-feeling lifestyle photography of people practising
 * gentle movement and connection. Purely illustrative marketing imagery —
 * not a real detection preview — so it never implies a capability the
 * product doesn't have. Imported (not referenced from /public) so Vite
 * resolves the URL relative to the app's base path, same as every other
 * bundled asset — this app deploys from arbitrary sub-paths.
 */
export function HeroVisual() {
  return (
    <img
      className="home-hero__art"
      src={heroImage}
      alt="People practising gentle stretches and a warm hug, illustrating movement and connection"
    />
  )
}
