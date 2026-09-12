/**
 * Posturama shared UI primitives.
 * Small, presentational, dependency-free building blocks reused across the
 * neck-posture module so every screen shares one visual language.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import './ui.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  size?: 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'pt-btn',
    variant !== 'primary' && `pt-btn--${variant}`,
    block && 'pt-btn--block',
    size === 'lg' && 'pt-btn--lg',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean
}

export function Card({ pad = true, className = '', children, ...rest }: CardProps) {
  return (
    <div className={['pt-card', pad && 'pt-card--pad', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  )
}

export type StatusTone = 'good' | 'adjust' | 'info'

/**
 * Status is communicated with three redundant cues (never colour alone):
 * a coloured dot, an uppercase text label, and — via `icon` — an optional glyph.
 */
export function StatusPill({
  tone,
  children,
}: {
  tone: StatusTone
  children: ReactNode
}) {
  return (
    <span className={`pt-pill pt-pill--${tone}`}>
      <span className="pt-pill__dot" aria-hidden="true" />
      {children}
    </span>
  )
}

export function ProgressBar({
  value,
  paused = false,
  label,
}: {
  value: number // 0..1
  paused?: boolean
  label: string
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className="pt-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div
        className={['pt-progress__fill', paused && 'pt-progress__fill--paused'].filter(Boolean).join(' ')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Notice({
  title,
  children,
  tone = 'default',
  icon,
}: {
  title: string
  children: ReactNode
  tone?: 'default' | 'safety'
  icon?: ReactNode
}) {
  return (
    <div className={['pt-notice', tone === 'safety' && 'pt-notice--safety'].filter(Boolean).join(' ')}>
      {icon ? (
        <span className="pt-notice__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div>
        <div className="pt-notice__title">{title}</div>
        <div className="pt-notice__body">{children}</div>
      </div>
    </div>
  )
}

export const ShieldIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const HeartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
    <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.5 0 5 3 3.5 6.5C19 15.65 12 20 12 20z" />
  </svg>
)
