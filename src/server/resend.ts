/**
 * Server-only Resend (https://resend.com) integration — the only place this
 * app sends email. RESEND_EMAIL_API_KEY lives in the server environment only,
 * never sent to or readable from the browser.
 */

const RESEND_URL = 'https://api.resend.com/emails'

// roxy.cool is a verified sending domain on this Resend account (confirmed
// via GET /domains — status "verified", sending enabled), so mail from here
// can go to any recipient, not just Resend's sandboxed test address.
const FROM_ADDRESS = 'Posturama <noreply@roxy.cool>'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/**
 * Sends the sign-in code by email. Throws on any non-2xx response so the
 * caller can surface an honest error instead of pretending the email sent.
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const safeCode = escapeHtml(code)
  const response = await fetchImpl(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [email],
      subject: 'Your Posturama sign-in code',
      html: `
        <p>Your Posturama sign-in code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${safeCode}</p>
        <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      `.trim(),
      // A text alternative alongside the HTML — a plain-HTML-only,
      // low-content email is itself a minor spam signal to most filters.
      text: `Your Posturama sign-in code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Resend request failed with status ${response.status}: ${text.slice(0, 300)}`)
  }
}
