import { Notice, ShieldIcon } from '../../../design-system/ui'

/**
 * Non-alarming, always-visible wellness disclaimer. Wording is intentionally
 * plain: guidance, not diagnosis or treatment.
 */
export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <Notice title="Wellness guidance, not medical care" tone="safety" icon={ShieldIcon}>
      Posturama is for general wellness and movement guidance. It does not
      diagnose or treat medical conditions and does not guarantee pain relief.
      {!compact && (
        <>
          {' '}
          If you have persistent or severe pain, weakness, numbness, an injury,
          or other concerning symptoms, stop the exercise and seek advice from a
          qualified healthcare professional.
        </>
      )}
    </Notice>
  )
}
