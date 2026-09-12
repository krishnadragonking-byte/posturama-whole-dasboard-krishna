/** Line icons used across the module (inline so nothing loads at runtime). */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const HeadIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M12 12v4M8 20c0-2.2 1.8-4 4-4s4 1.8 4 4" />
  </svg>
)

export const TiltIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.4" transform="rotate(12 12 8)" />
    <path d="M5 20c1-3 4-5 7-5s6 2 7 5" />
    <path d="M3 6l3-2M21 6l-3-2" />
  </svg>
)

export const ShoulderIcon = () => (
  <svg {...base}>
    <path d="M4 16c1.5-3 4-4 8-4s6.5 1 8 4" />
    <circle cx="12" cy="7" r="2.6" />
    <path d="M4 16h16" strokeDasharray="2 2" />
  </svg>
)

export const ScreenIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M9 20h6M12 16v4" />
    <path d="M12 2v2" />
  </svg>
)

export const CheckIcon = () => (
  <svg {...base} strokeWidth={2.2}>
    <path d="M4 12l5 5L20 6" />
  </svg>
)

export const PostureLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v6M12 14c-3 0-5 2-5.5 5M12 14c3 0 5 2 5.5 5" />
  </svg>
)
