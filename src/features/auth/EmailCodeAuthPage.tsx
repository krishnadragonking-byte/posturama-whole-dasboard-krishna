import { useState, type FormEvent } from 'react'
import { Button, Card } from '../../design-system/ui'
import type { Route } from '../../routes'
import { authErrorMessage, useAuth } from './AuthContext'
import './auth.css'

const Logo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v6M12 14c-3 0-5 2-5.5 5M12 14c3 0 5 2 5.5 5" />
  </svg>
)

type Step = 'email' | 'code'

/**
 * Passwordless sign-in: one email address gets you both new accounts and
 * returning ones — enter an email, get a 6-digit code, enter the code.
 * There is no separate "sign up" — the first successful code for an email
 * creates the account (see auth-verify-code.ts).
 */
export function EmailCodeAuthPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { requestCode, verifyCode } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldownMsg, setResendCooldownMsg] = useState<string | null>(null)

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestCode(email.trim().toLowerCase())
      setStep('code')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setResendCooldownMsg(null)
    try {
      await requestCode(email.trim().toLowerCase())
    } catch (err) {
      setResendCooldownMsg(authErrorMessage(err))
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await verifyCode({ email: email.trim().toLowerCase(), code: code.trim(), name: name.trim() || undefined })
      onNavigate('dashboard')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-container">
        <button type="button" className="auth-brand" onClick={() => onNavigate('home')}>
          <span className="auth-logo" aria-hidden="true">
            <Logo />
          </span>
          <span className="auth-wordmark">Posturama</span>
        </button>

        <Card className="auth-card">
          {step === 'email' ? (
            <>
              <h1 className="auth-title">Log in or sign up</h1>
              <p className="auth-subtitle">
                Enter your email and we&rsquo;ll send you a one-time code — no password needed.
              </p>

              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}

              <form onSubmit={handleSendCode} noValidate>
                <div className="auth-field">
                  <label htmlFor="auth-name">Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Only used if this is your first time"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" block size="lg" disabled={submitting}>
                  {submitting ? 'Sending code…' : 'Send code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="auth-title">Enter your code</h1>
              <p className="auth-subtitle">
                We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
              </p>

              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}
              <form onSubmit={handleVerify} noValidate>
                <div className="auth-field">
                  <label htmlFor="auth-code">6-digit code</label>
                  <input
                    id="auth-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.3rem' }}
                  />
                </div>
                <Button type="submit" block size="lg" disabled={submitting || code.length !== 6}>
                  {submitting ? 'Verifying…' : 'Verify & continue'}
                </Button>
              </form>

              {resendCooldownMsg ? <p className="auth-error">{resendCooldownMsg}</p> : null}
              <p className="auth-switch">
                <button type="button" onClick={handleResend}>
                  Resend code
                </button>{' '}
                &middot;{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                    setError(null)
                  }}
                >
                  Use a different email
                </button>
              </p>
            </>
          )}
        </Card>

        <p className="auth-fineprint">
          Posturama provides educational wellness guidance and is not a medical diagnosis or treatment tool.
        </p>
      </div>
    </div>
  )
}
