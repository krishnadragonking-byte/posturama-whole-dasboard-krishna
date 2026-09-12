/**
 * Whole-app navigation between Home, Neck Posture and Couple Smile.
 *
 * The project deliberately has no router dependency, so this mirrors the
 * lightweight `window.location.hash` approach already used for the dev-only
 * screen gallery in App.tsx — just enough to give each experience a real,
 * bookmarkable/back-button-friendly URL without adding a new dependency.
 */
export type Route =
  | 'home'
  | 'neck-posture'
  | 'smile-therapy'
  | 'couple-smile'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'posture-check'
  | 'history'

const ROUTES: readonly Route[] = [
  'home',
  'neck-posture',
  'couple-smile',
  'smile-therapy',
  'login',
  'signup',
  'dashboard',
  'posture-check',
  'history',
]

/** Routes that require a signed-in user; an unauthenticated visitor is sent to `login` instead. */
export const PROTECTED_ROUTES: readonly Route[] = ['dashboard', 'posture-check', 'history']

/** Parse `window.location.hash` into a known route, defaulting to Home. */
export function routeFromHash(hash: string): Route {
  const clean = hash.replace(/^#/, '')
  return (ROUTES as readonly string[]).includes(clean) ? (clean as Route) : 'home'
}

/** Navigate to a route by updating the hash (adds a browser history entry). */
export function navigate(route: Route): void {
  window.location.hash = route
}
