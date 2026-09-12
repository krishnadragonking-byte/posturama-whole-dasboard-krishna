const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

/** "September 4, 2026" */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso))
}

/** "September 4, 2026 · 9:41 AM" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${DATE_FORMAT.format(d)} · ${TIME_FORMAT.format(d)}`
}
