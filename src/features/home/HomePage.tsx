import { Button, Card, Notice, ShieldIcon, StatusPill } from '../../design-system/ui'
import { useAuth } from '../auth'
import type { Route } from '../../routes'
import { HeroVisual } from './HeroVisual'
import './home.css'

const Logo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v6M12 14c-3 0-5 2-5.5 5M12 14c3 0 5 2 5.5 5" />
  </svg>
)

type Tint = 'peach' | 'lavender' | 'yellow' | 'pink'

interface Experience {
  emoji: string
  title: string
  description: string
  cta: string
  route: Route
  tint: Tint
}

const EXPERIENCES: Experience[] = [
  {
    emoji: '🦴',
    title: 'Neck Posture',
    description: 'Practice gentle neck and posture movements with real-time visual guidance.',
    cta: 'Try Neck Posture',
    route: 'neck-posture',
    tint: 'peach',
  },
  {
    emoji: '😊',
    title: 'Couple Smile',
    description: 'Turn smiling into a fun two-person challenge.',
    cta: 'Try Couple Smile',
    route: 'couple-smile',
    tint: 'lavender',
  },
  {
    emoji: '😊',
    title: 'Smile Therapy',
    description: 'Smile, relax and keep the timer moving while your smile is detected.',
    cta: 'Try Smile Therapy',
    route: 'smile-therapy',
    tint: 'lavender',
  },
  {
    emoji: '🤖',
    title: 'AI Posture Dashboard',
    description:
      'Take a quick photo-based posture check, get AI-assisted educational guidance, and track your history over time.',
    cta: 'Open Dashboard',
    route: 'dashboard',
    tint: 'yellow',
  },
]

interface ResearchProject {
  emoji: string
  name: string
  org: string
  description: string
  url: string
  tint: Tint
  inUse?: boolean
}

// Real, publicly-maintained open-source pose-estimation projects. `inUse:
// true` marks the one actually integrated in this app today (see
// @mediapipe/tasks-vision in package.json and src/features/*/hooks/use*Landmarker.ts) —
// the rest are research references, not features Posturama claims to ship.
const RESEARCH_PROJECTS: ResearchProject[] = [
  {
    emoji: '🧭',
    name: 'MediaPipe',
    org: 'Google AI Edge',
    description: 'Detects 33 body landmarks in real time, in the browser.',
    url: 'https://github.com/google-ai-edge/mediapipe',
    tint: 'peach',
    inUse: true,
  },
  {
    emoji: '🔬',
    name: 'OpenPose',
    org: 'Carnegie Mellon University',
    description: 'One of the first real-time multi-person pose systems, tracking body, face and hand keypoints.',
    url: 'https://github.com/CMU-Perceptual-Computing-Lab/openpose',
    tint: 'lavender',
  },
  {
    emoji: '📊',
    name: 'MMPose',
    org: 'OpenMMLab',
    description: 'An open research toolbox for comparing pose-estimation models side by side.',
    url: 'https://github.com/open-mmlab/mmpose',
    tint: 'yellow',
  },
  {
    emoji: '🎯',
    name: 'AlphaPose',
    org: 'Shanghai Jiao Tong University',
    description: "Keeps a person's skeleton stable across video frames using pose tracking.",
    url: 'https://github.com/MVIG-SJTU/AlphaPose',
    tint: 'pink',
  },
  {
    emoji: '🌐',
    name: 'TensorFlow.js Pose Detection',
    org: 'Google',
    description: 'Runs pose estimation directly in the browser — no server, no upload.',
    url: 'https://github.com/tensorflow/tfjs-models/tree/master/pose-detection',
    tint: 'peach',
  },
  {
    emoji: '⚡',
    name: 'YOLO-Pose',
    org: 'Ultralytics',
    description: 'A fast pose model that reports a confidence score for every joint it finds.',
    url: 'https://github.com/ultralytics/ultralytics',
    tint: 'lavender',
  },
  {
    emoji: '🧩',
    name: 'Detectron2',
    org: 'Meta AI Research',
    description: 'Combines person detection with keypoint estimation for cluttered scenes.',
    url: 'https://github.com/facebookresearch/detectron2',
    tint: 'yellow',
  },
  {
    emoji: '📱',
    name: 'DWPose',
    org: 'IDEA Research',
    description: 'A distilled, whole-body pose model built for efficient mobile deployment.',
    url: 'https://github.com/IDEA-Research/DWPose',
    tint: 'pink',
  },
  {
    emoji: '🧠',
    name: 'ViTPose',
    org: 'ViTAE-Transformer',
    description: 'Applies vision-transformer architectures to pose-estimation research.',
    url: 'https://github.com/ViTAE-Transformer/ViTPose',
    tint: 'peach',
  },
  {
    emoji: '🚀',
    name: 'RTMPose',
    org: 'OpenMMLab',
    description: 'A production-oriented pose model tuned for real-time performance on ordinary CPUs.',
    url: 'https://github.com/open-mmlab/mmpose/tree/main/projects/rtmpose',
    tint: 'lavender',
  },
]

export function HomePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { status, user } = useAuth()
  return (
    <div className="home-shell">
      <div className="home-container">
        <header className="home-header">
          <div className="home-brand">
            <span className="home-logo" aria-hidden="true">
              <Logo />
            </span>
            <div>
              <span className="home-wordmark">Posturama</span>
              <p className="home-tagline">Move, play and practice healthier body habits with AI.</p>
            </div>
          </div>
          <nav className="home-nav" aria-label="Main">
            <button type="button" className="home-nav__link is-active" onClick={() => onNavigate('home')}>
              Home
            </button>
            <button type="button" className="home-nav__link" onClick={() => onNavigate('neck-posture')}>
              Neck Posture
            </button>
            <button type="button" className="home-nav__link" onClick={() => onNavigate('couple-smile')}>
              Couple Smile
            </button>
            <button type="button" className="home-nav__link" onClick={() => onNavigate('smile-therapy')}>
              Smile Therapy
            </button>
            {status === 'authenticated' ? (
              <button type="button" className="home-nav__link" onClick={() => onNavigate('dashboard')}>
                Dashboard{user ? `, ${user.name.split(' ')[0]}` : ''}
              </button>
            ) : (
              <button type="button" className="home-nav__link" onClick={() => onNavigate('login')}>
                Log in
              </button>
            )}
          </nav>
        </header>

        <section className="home-hero">
          <div className="home-hero__copy">
            <p className="home-eyebrow">Camera-based movement, on your device</p>
            <h1 className="home-title">Better movement. More play.</h1>
            <p className="home-subtitle">
              Posturama uses camera-based movement experiences to make posture and movement
              practice more engaging.
            </p>
            <div className="home-cta-row">
              <Button size="lg" onClick={() => onNavigate('neck-posture')}>
                Start Moving
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => document.getElementById('experiences')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Experiences
              </Button>
            </div>
          </div>
          <div className="home-hero__visual" aria-hidden="true">
            <HeroVisual />
          </div>
        </section>

        <section id="experiences" className="home-section">
          <p className="home-eyebrow">Experiences</p>
          <h2 className="home-section-title">Choose your practice</h2>
          <div className="home-cards">
            {EXPERIENCES.map((exp) => (
              <Card key={exp.route} className={`home-card home-card--${exp.tint}`}>
                <span className="home-card__icon" aria-hidden="true">
                  {exp.emoji}
                </span>
                <h3 className="home-card__title">{exp.title}</h3>
                <p className="home-card__desc">{exp.description}</p>
                <Button block onClick={() => onNavigate(exp.route)}>
                  {exp.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="home-section">
          <p className="home-eyebrow">Under the hood</p>
          <h2 className="home-section-title">Built on open pose-estimation research</h2>
          <p className="home-subtitle" style={{ marginBottom: '1.5rem' }}>
            Posturama's camera features run on MediaPipe. The rest of this list is the wider
            open-source research this project has studied — reference material, not features
            Posturama claims to ship.
          </p>
          <div className="home-tech-grid">
            {RESEARCH_PROJECTS.map((proj) => (
              <Card key={proj.name} className={`home-tech-card home-card--${proj.tint}`}>
                <div className="home-tech-card__head">
                  <span className="home-tech-card__avatar" aria-hidden="true">
                    {proj.emoji}
                  </span>
                  <div>
                    <div className="home-tech-card__name">{proj.name}</div>
                    <div className="home-tech-card__org">{proj.org}</div>
                  </div>
                </div>
                {proj.inUse ? <StatusPill tone="good">Powers Posturama today</StatusPill> : null}
                <p className="home-tech-card__desc">{proj.description}</p>
                <a
                  className="home-tech-card__link"
                  href={proj.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View on GitHub →
                </a>
              </Card>
            ))}
          </div>
        </section>

        <section className="home-section">
          <Notice title="Privacy-first camera experience" icon={ShieldIcon}>
            Camera access is used to provide real-time movement and expression feedback.
            Posturama avoids recording or uploading camera video unless a future feature
            explicitly requires it and clearly asks for permission.
          </Notice>
        </section>

        <footer className="home-footer">
          <p>
            Posturama provides educational wellness guidance and is not a medical diagnosis or
            treatment tool.
          </p>
        </footer>
      </div>
    </div>
  )
}
