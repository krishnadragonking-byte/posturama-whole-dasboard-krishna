import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMING } from '../constants'
import type { PoseFrame } from '../types'
import { legsVisible } from '../lib/poseMatch'
import {
  SEATED_SEQUENCE,
  STANDING_SEQUENCE,
  type GuidedPose,
  type MatchContext,
} from '../lib/guidedPoses'
import {
  initialPractice,
  skipPractice,
  stepPractice,
  type PracticeClock,
} from '../lib/practiceClock'

export type PracticePhase = PracticeClock['phase']
export type PracticeMode = 'detecting' | 'seated' | 'standing'

/** What the person is doing right now relative to the target pose. */
export type MatchState = 'idle' | 'wrong' | 'close' | 'correct' | 'done'

export interface GuidedPractice {
  pose: GuidedPose
  index: number
  total: number
  phase: PracticePhase
  state: MatchState
  mode: PracticeMode
  /** 0..1 fill of the hold ring (only rises while the pose is correct). */
  holdProgress: number
  hint: string
  showSkip: boolean
  skip: () => void
  restart: () => void
}

const CLOSE_ENOUGH = 0.55
const DETECT_FRAMES = 18 // ~1s of samples before we commit to a sequence

/**
 * Drives the copy-the-figure sequence. It first watches a second of frames to
 * decide whether your legs are in view (standing set with knee lifts) or not
 * (seated set with side-bends), then checks each pose every animation frame and
 * lets `stepPractice` fill the hold meter and advance. Forgiving throughout.
 */
export function useGuidedPractice(
  latestFrame: PoseFrame | null,
  personPresent: boolean,
  running: boolean,
): GuidedPractice {
  const [clock, setClock] = useState<PracticeClock>(initialPractice)
  const [state, setState] = useState<MatchState>('idle')
  const [mode, setMode] = useState<PracticeMode>('detecting')
  const [holdProgress, setHoldProgress] = useState(0)
  const [hint, setHint] = useState('Step into the camera so it can see you.')
  const [showSkip, setShowSkip] = useState(false)

  const frameRef = useRef<PoseFrame | null>(latestFrame)
  const presentRef = useRef(personPresent)
  useEffect(() => {
    frameRef.current = latestFrame
    presentRef.current = personPresent
  }, [latestFrame, personPresent])

  const clockRef = useRef<PracticeClock>(clock)
  const ctxRef = useRef<MatchContext>({})
  const seqRef = useRef<GuidedPose[]>(SEATED_SEQUENCE)
  const modeRef = useRef<PracticeMode>('detecting')
  const legVotesRef = useRef<{ yes: number; total: number }>({ yes: 0, total: 0 })
  const detectMsRef = useRef(0)
  const stuckMsRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const stateRef = useRef<MatchState>('idle')

  // Render reads the sequence from `mode` state (kept in sync with `seqRef` by
  // `chooseSequence`); the rAF loop reads `seqRef` directly.
  const seq = mode === 'standing' ? STANDING_SEQUENCE : SEATED_SEQUENCE

  const chooseSequence = useCallback((standing: boolean) => {
    seqRef.current = standing ? STANDING_SEQUENCE : SEATED_SEQUENCE
    modeRef.current = standing ? 'standing' : 'seated'
    setMode(modeRef.current)
  }, [])

  const skip = useCallback(() => {
    clockRef.current = skipPractice(clockRef.current, seqRef.current.length)
    stuckMsRef.current = 0
    stateRef.current = 'idle'
    setShowSkip(false)
    setHoldProgress(0)
    setState('idle')
    setClock(clockRef.current)
  }, [])

  const restart = useCallback(() => {
    clockRef.current = initialPractice()
    ctxRef.current = {}
    legVotesRef.current = { yes: 0, total: 0 }
    detectMsRef.current = 0
    seqRef.current = SEATED_SEQUENCE
    modeRef.current = 'detecting'
    stuckMsRef.current = 0
    lastTickRef.current = null
    stateRef.current = 'idle'
    setMode('detecting')
    setShowSkip(false)
    setHoldProgress(0)
    setState('idle')
    setClock(clockRef.current)
  }, [])

  useEffect(() => {
    if (!running) return
    let raf = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const last = lastTickRef.current
      lastTickRef.current = now
      if (last === null) return
      const dt = Math.min(now - last, 100)

      const c = clockRef.current
      if (c.phase === 'complete') return

      const frame = frameRef.current
      const present = presentRef.current && !!frame

      // Phase 0: sample ~a second of frames to pick seated vs. standing.
      if (modeRef.current === 'detecting') {
        detectMsRef.current += dt
        if (present && frame) {
          legVotesRef.current.total += 1
          if (legsVisible(frame)) legVotesRef.current.yes += 1
        }
        const enough = legVotesRef.current.total >= DETECT_FRAMES
        // Give up detecting after a few seconds (e.g. nobody in frame yet) and
        // default to the seated set — the pose checks then guide the user in.
        const timedOut = detectMsRef.current > 4500
        if (enough || timedOut) {
          chooseSequence(
            legVotesRef.current.total > 0 &&
              legVotesRef.current.yes / legVotesRef.current.total > 0.5,
          )
        } else {
          if (now - lastPushRef.current > 120) {
            lastPushRef.current = now
            setState('idle')
            setHint(
              present
                ? 'Getting a look at your setup…'
                : 'Step into the camera so it can see you.',
            )
          }
          return
        }
      }

      const pose = seqRef.current[c.index]
      const res =
        present && c.phase === 'active'
          ? pose.check(frame as PoseFrame, ctxRef.current)
          : { matched: false, progress: 0, hint: 'Step into the camera so it can see you.' }

      if (res.matched) {
        if (res.liftedSide) ctxRef.current.lastLiftedSide = res.liftedSide
        if (res.leanSide) ctxRef.current.lastLeanSide = res.leanSide
      }

      const prevIndex = c.index
      const nextClock = stepPractice(c, {
        dtMs: dt,
        now,
        matched: res.matched,
        total: seqRef.current.length,
      })
      clockRef.current = nextClock

      if (nextClock.index !== prevIndex) stuckMsRef.current = 0
      else stuckMsRef.current += dt

      let nextState: MatchState
      if (nextClock.phase !== 'active') nextState = 'done'
      else if (!present) nextState = 'idle'
      else if (res.matched) nextState = 'correct'
      else if (res.progress >= CLOSE_ENOUGH) nextState = 'close'
      else nextState = 'wrong'

      const changed =
        nextState !== stateRef.current ||
        nextClock.index !== prevIndex ||
        nextClock.phase !== c.phase
      if (now - lastPushRef.current > 80 || changed) {
        lastPushRef.current = now
        stateRef.current = nextState
        setState(nextState)
        setClock(nextClock)
        setHoldProgress(nextClock.holdMs / TIMING.guidedHoldMs)
        setHint(res.hint)
        setShowSkip(stuckMsRef.current > TIMING.guidedHintAfterMs)
      }
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lastTickRef.current = null
    }
  }, [running, chooseSequence])

  const pose = seq[Math.min(clock.index, seq.length - 1)]

  return {
    pose,
    index: clock.index,
    total: seq.length,
    phase: clock.phase,
    state,
    mode,
    holdProgress: Math.max(0, Math.min(1, holdProgress)),
    hint,
    showSkip,
    skip,
    restart,
  }
}
