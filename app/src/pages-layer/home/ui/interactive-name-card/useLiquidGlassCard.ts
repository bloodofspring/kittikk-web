/* eslint-disable max-lines */
'use client'

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const quantize = (v: number, step: number) => Math.round(v / step) * step

type TOscillator = {
  /**
   * Center value of the oscillation.
   * Example: with base=1 and amp=0.5, the raw range is [0.5..1.5] before clamping.
   */
  base: number
  /**
   * Oscillation amplitude (sinus).
   * Kept separate from min/max so we can change "breathing" intensity without changing safety limits.
   */
  amp: number
  /**
   * Angular speed in radians per second.
   * - Higher = faster changes.
   */
  speed: number // rad/sec
  /**
   * Phase offset in radians (used to desync multiple points).
   */
  phase: number // rad
  /**
   * Lower clamp bound for the oscillator result.
   */
  min: number
  /**
   * Upper clamp bound for the oscillator result.
   */
  max: number
}

/**
 * Evaluates a clamped sinusoidal oscillator.
 * - `tSec` is monotonic time in seconds (we use rAF timestamp).
 */
const evalOsc = (tSec: number, o: TOscillator) =>
  clamp(o.base + o.amp * Math.sin(tSec * o.speed + o.phase), o.min, o.max)

const approach = (current: number, target: number, maxDelta: number) => {
  const d = target - current
  if (Math.abs(d) <= maxDelta) return target
  return current + Math.sign(d) * maxDelta
}

/**
 * Core “pointer -> percent-space” mapping / numeric safety rails.
 */
const PRIMARY = {
  /**
   * Neutral (rest) position in percent space.
   * - **Range**: [0..100], but we keep it at 50 by design.
   */
  neutralPct: 50,

  /**
   * How far the pointer target is allowed to overshoot beyond [0..100] bounds.
   * This prevents the effect from “sticking” to edges.
   * - **Range**: [0..100] (recommended small, e.g. 0..15)
   */
  overshootPct: 8,

  /**
   * Clamp for delta time (seconds) to avoid huge “jumps” after tab restore.
   * - **Range**: > 0 (recommended ~0.02..0.08)
   */
  maxDtSec: 0.05,
} as const

/**
 * Touch-specific interaction settings.
 */
const TOUCH = {
  /**
   * How fast we "follow" the touch target (percent per second).
   * - **Min**: 0
   * - **Typical**: 40..120
   */
  followSpeedPctPerSec: 20, // was 260 in earlier tuning

  /**
   * When `targetPress` is above this value, we consider pointer pressed (touch/pen).
   * - **Range**: [0..1]
   */
  pressedThreshold: 0.5,
} as const

/**
 * Idle (no interaction) drift settings for the primary gradient center.
 */
const IDLE = {
  /**
   * Default idle interval when `options.idleIntervalSec` is not provided.
   * - **Min**: 0 (0 disables idle target picking)
   */
  intervalSecDefault: 3,

  /**
   * Desktop idle follow speed (percent per second) when `idleMotion === 'follow'`.
   * - **Min**: 0
   */
  followSpeedPctPerSec: 15,

  /**
   * Random target bounds (percent space).
   * - **Min/Max**: should stay within [0..100]
   */
  targetMinPct: 10,
  targetMaxPct: 90,

  /**
   * When the current target is reached (in percent-space distance), we pick a new one immediately.
   * - **Min**: 0
   */
  reachedEpsPct: 0.75,
} as const

/**
 * Oil-slick iridescence animation.
 */
const OIL = {
  /**
   * Conic-gradient rotation speed.
   * - **Range**: any number; 0 disables time-driven spin.
   */
  spinSpeedDegPerSec: 20,
} as const

/**
 * Secondary (desktop-only) "idle" gradient centers.
 */
const SECONDARY = {
  /**
   * Enable secondaries only on wide screens.
   * - **Min**: 0
   */
  desktopWideMinWidthPx: 1000,

  /**
   * Hard cap of CSS-wired secondary centers (we emit `--mx2..--mxN` vars).
   * - **Min**: 0
   */
  maxCenters: 5,

  /**
   * Soft bounds (percent space) for secondary centers.
   * - **Min/Max**: should stay within [0..100]
   */
  targetMinPct: 10,
  targetMaxPct: 90,

  /**
   * Keep secondaries away from the primary center by this minimum distance (percent space).
   * - **Min**: 0
   */
  minDistancePct: 25,

  /**
   * How often a secondary changes its direction (seconds).
   * - **Min**: 0
   */
  turnIntervalSecMin: 1.2,
  turnIntervalSecMax: 3.4,

  /**
   * Random velocity range for secondaries (percent per second).
   * - **Min**: 0
   */
  speedPctPerSecMin: 7.2,
  speedPctPerSecMax: 11.5,

  /**
   * Repel force when too close to primary (higher = stronger keep-distance).
   * - **Min**: 0
   */
  repelForce: 110,

  /**
   * Soft force keeping secondaries within bounds (higher = stronger).
   * - **Min**: 0
   */
  edgeForce: 90,

  /**
   * Velocity damping per second (higher = more damping).
   * - **Min**: 0
   */
  dampingPerSec: 1.25,
} as const

/**
 * Caustics “points” animation (pure time, independent per point).
 * This drives CSS vars `--cN-a` and `--cN-s` (see `InteractiveNameCard.styles.ts`).
 */
const CAUSTICS = (() => {
  const points = 3
  const anim: Array<{ a: TOscillator; s: TOscillator }> = Array.from(
    { length: points },
    (_, i) => ({
      // Multipliers, clamped to avoid harsh flicker / over-saturation.
      a: {
        base: 1,
        amp: 0.5,
        speed: 0.9 + i * 0.25,
        phase: i * 1.7,
        min: 0.25,
        max: 1.6,
      },
      s: {
        base: 1,
        amp: 0.5,
        speed: 0.65 + i * 0.22,
        phase: i * 2.1 + 0.6,
        min: 0.25,
        max: 1.6,
      },
    }),
  )
  return { points, anim } as const
})()

type TPointerType = 'mouse' | 'touch' | 'pen' | 'unknown'

const normalizePointerType = (pointerType: string): TPointerType =>
  pointerType === 'mouse' || pointerType === 'touch' || pointerType === 'pen'
    ? pointerType
    : 'unknown'

const clampToOvershootPct = (pct: number) =>
  clamp(pct, -PRIMARY.overshootPct, 100 + PRIMARY.overshootPct)

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

const clampInt = (v: number, min: number, max: number) => Math.trunc(clamp(v, min, max))

type TSecondaryCenter = {
  mx: number
  my: number
  vx: number
  vy: number
  nextTurnAtMs: number
}

type TState = {
  inside: boolean
  mx: number
  my: number
  vx: number
  vy: number
  secondaries: TSecondaryCenter[]
  press: number
  tiltX: number
  tiltY: number
  targetMx: number
  targetMy: number
  targetPress: number
  pointerType: TPointerType
  touchDragging: boolean
  hue: number
  oilSpin: number
  lastNow: number
  idleNextAtMs: number
}

type TUseLiquidGlassCardReturn = {
  ref: RefObject<HTMLDivElement | null>
  onPointerEnter: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerLeave: () => void
}

type TUseLiquidGlassCardOptions = {
  /**
   * When disabled, the hook becomes a no-op:
   * - no rAF loop
   * - pointer handlers do nothing
   *
   * Useful for a "lightweight graphics" mode.
   */
  enabled?: boolean
  /**
   * While idle (no interaction), pick random targets periodically.
   * Additionally: when the current target is reached, a new one is picked immediately.
   */
  idleIntervalSec?: number

  /**
   * Idle movement speed multiplier for desktop spring motion.
   * - 1: current behavior
   * - < 1: slower/smoother idle drift
   * - > 1: faster idle drift
   */
  idleMoveSpeed?: number

  /**
   * Desktop idle movement model:
   * - spring: current "liquid" inertial motion
   * - follow: no inertia (rate-limited), more calm and predictable
   */
  idleMotion?: 'spring' | 'follow'

  /**
   * Number of secondary gradient centers on wide desktop (>= 1000px).
   * CSS is pre-wired for up to `SECONDARY.maxCenters`; this value is clamped.
   */
  secondaryCenters?: number
}

export const useLiquidGlassCard = (
  options: TUseLiquidGlassCardOptions = {},
): TUseLiquidGlassCardReturn => {
  const enabled = options.enabled ?? true
  const idleIntervalSec = options.idleIntervalSec ?? IDLE.intervalSecDefault
  const idleIntervalMs = Math.max(0, idleIntervalSec) * 1000
  const idleMoveSpeed = clamp(options.idleMoveSpeed ?? 1, 0.01, 3)
  const idleMotion = options.idleMotion ?? 'spring'
  const secondaryCount = clampInt(options.secondaryCenters ?? 1, 0, SECONDARY.maxCenters)

  const contentRef = useRef<HTMLDivElement | null>(null)
  const rafLoopIdRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)
  const coarsePointerRef = useRef(false)
  const desktopWideRef = useRef(false)

  const stateRef = useRef<TState>({
    inside: false,
    mx: PRIMARY.neutralPct,
    my: PRIMARY.neutralPct,
    vx: 0,
    vy: 0,
    secondaries: Array.from({ length: secondaryCount }, () => ({
      mx: PRIMARY.neutralPct,
      my: PRIMARY.neutralPct,
      vx: 0,
      vy: 0,
      nextTurnAtMs: 0,
    })),
    press: 0,
    tiltX: 0,
    tiltY: 0,
    targetMx: PRIMARY.neutralPct,
    targetMy: PRIMARY.neutralPct,
    targetPress: 0,
    pointerType: 'unknown',
    touchDragging: false,
    hue: 0,
    oilSpin: 0,
    lastNow: 0,
    idleNextAtMs: 0,
  })

  const ensureSecondaryCount = (s: TState) => {
    if (s.secondaries.length === secondaryCount) return

    if (s.secondaries.length < secondaryCount) {
      for (let i = s.secondaries.length; i < secondaryCount; i++) {
        s.secondaries.push({
          mx: PRIMARY.neutralPct,
          my: PRIMARY.neutralPct,
          vx: 0,
          vy: 0,
          nextTurnAtMs: 0,
        })
      }
      return
    }

    // eslint-disable-next-line no-param-reassign
    s.secondaries.length = secondaryCount
  }

  const pickSecondaryVelocity = (c: TSecondaryCenter) => {
    const angle = Math.random() * Math.PI * 2
    const speed = randomBetween(SECONDARY.speedPctPerSecMin, SECONDARY.speedPctPerSecMax)
    // eslint-disable-next-line no-param-reassign
    c.vx = Math.cos(angle) * speed
    // eslint-disable-next-line no-param-reassign
    c.vy = Math.sin(angle) * speed
  }

  const updateFromPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, startDrag = true) => {
      if (!enabled) return
      const s = stateRef.current
      s.pointerType = normalizePointerType(e.pointerType)

      const rect = e.currentTarget.getBoundingClientRect()
      const nx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5
      const ny = rect.height ? (e.clientY - rect.top) / rect.height : 0.5

      // Slight overshoot prevents the effect from "sticking" to edges.
      const mx = clampToOvershootPct(nx * 100)
      const my = clampToOvershootPct(ny * 100)

      const isTouchLike =
        coarsePointerRef.current || s.pointerType === 'touch' || s.pointerType === 'pen'
      if (startDrag && isTouchLike && s.targetPress > TOUCH.pressedThreshold && !s.touchDragging) {
        // First touch-move while pressed switches from "hold" mode to "drag" mode.
        // Avoid a "kick" when leaving hold mode.
        s.touchDragging = true
        s.vx = approach(s.vx, 0, 150)
        s.vy = approach(s.vy, 0, 150)
      }

      s.targetMx = mx
      s.targetMy = my
    },
    [enabled],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => updateFromPointer(e, true),
    [updateFromPointer],
  )

  const onPointerEnter = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      stateRef.current.inside = true
      updateFromPointer(e, false)
    },
    [enabled, updateFromPointer],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }

      const s = stateRef.current
      s.inside = true
      s.targetPress = 1
      s.touchDragging = false

      // First update should always apply (so highlight jumps to the finger immediately).
      updateFromPointer(e, false)
    },
    [enabled, updateFromPointer],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      const s = stateRef.current
      s.targetPress = 0

      // Touch doesn't have a reliable "leave" semantic; after lifting the finger,
      // reset to neutral to avoid getting stuck in an "inside" state.
      const pt = s.pointerType
      if (pt === 'touch' || pt === 'pen') {
        s.inside = false
        s.targetMx = PRIMARY.neutralPct
        s.targetMy = PRIMARY.neutralPct
      }
      s.touchDragging = false
    },
    [enabled],
  )

  const onPointerLeave = useCallback(() => {
    if (!enabled) return
    const s = stateRef.current
    s.inside = false
    s.targetPress = 0
    s.targetMx = PRIMARY.neutralPct
    s.targetMy = PRIMARY.neutralPct
    s.touchDragging = false
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const mm = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = !!mm?.matches
    const onChange = () => {
      reducedMotionRef.current = !!mm?.matches
    }
    mm?.addEventListener?.('change', onChange)

    const coarseMm = window.matchMedia?.('(hover: none) and (pointer: coarse)')
    coarsePointerRef.current = !!coarseMm?.matches
    const onCoarseChange = () => {
      coarsePointerRef.current = !!coarseMm?.matches
    }
    coarseMm?.addEventListener?.('change', onCoarseChange)

    const desktopWideMm = window.matchMedia?.(`(min-width: ${SECONDARY.desktopWideMinWidthPx}px)`)
    desktopWideRef.current = !!desktopWideMm?.matches
    const onDesktopWideChange = () => {
      desktopWideRef.current = !!desktopWideMm?.matches
    }
    desktopWideMm?.addEventListener?.('change', onDesktopWideChange)

    const tick = (now: number) => {
      const el = contentRef.current
      if (!el) return

      const s = stateRef.current
      ensureSecondaryCount(s)

      // Delta time (seconds), clamped to avoid jumps after tab restore.
      const prev = s.lastNow || now
      const dt = clamp((now - prev) / 1000, 0, PRIMARY.maxDtSec)
      s.lastNow = now

      const idleAllowed =
        !reducedMotionRef.current &&
        idleIntervalMs > 0 &&
        !s.inside &&
        s.targetPress <= 0 &&
        !s.touchDragging

      if (idleAllowed) {
        const reached = Math.hypot(s.targetMx - s.mx, s.targetMy - s.my) <= IDLE.reachedEpsPct
        const due = s.idleNextAtMs === 0 || now >= s.idleNextAtMs

        if (reached || due) {
          s.targetMx = clampToOvershootPct(randomBetween(IDLE.targetMinPct, IDLE.targetMaxPct))
          s.targetMy = clampToOvershootPct(randomBetween(IDLE.targetMinPct, IDLE.targetMaxPct))
          s.idleNextAtMs = now + idleIntervalMs
        }
      } else {
        // Force immediate target pick when we become idle again.
        s.idleNextAtMs = 0
      }

      // Motion model
      // - Desktop: spring (feels "liquid")
      // - Mobile: rate-limited follow (stable; avoids big jumps on sparse touch events)
      const isTouchLike =
        coarsePointerRef.current || s.pointerType === 'touch' || s.pointerType === 'pen'
      if (isTouchLike) {
        // We don't want spring inertia on mobile; it creates drift during long press.
        s.vx = 0
        s.vy = 0
        const maxStep = TOUCH.followSpeedPctPerSec * dt
        s.mx = approach(s.mx, s.targetMx, maxStep)
        s.my = approach(s.my, s.targetMy, maxStep)
      } else {
        if (idleAllowed && idleMotion === 'follow') {
          // Desktop idle: calm "follow" without inertia/acceleration.
          s.vx = 0
          s.vy = 0
          const maxStep = IDLE.followSpeedPctPerSec * idleMoveSpeed * dt
          s.mx = approach(s.mx, s.targetMx, maxStep)
          s.my = approach(s.my, s.targetMy, maxStep)
        } else {
          // Spring (non-linear acceleration) towards target.
          // - Stronger pull when far away, softer near the target (less jitter).
          // - Damping prevents oscillations; tuned to feel "viscous".
          const dx = s.targetMx - s.mx
          const dy = s.targetMy - s.my
          const dist = Math.hypot(dx, dy)

          const baseK = s.inside ? 5 : 40 // overall "speed" (lower = slower)
          const extraK = s.inside ? 40 : 70 // additional pull when far (non-constant accel)
          const k = (baseK + extraK * clamp(dist / 35, 0, 1)) * (idleAllowed ? idleMoveSpeed : 1)

          const damping = s.inside ? 78 : 16

          s.vx += (dx * k - s.vx * damping) * dt
          s.vy += (dy * k - s.vy * damping) * dt

          s.mx += s.vx * dt
          s.my += s.vy * dt
        }
      }

      // Secondary center (desktop-only): always idle-wandering, but repelled from the primary center.
      const secondaryAllowed =
        secondaryCount > 0 &&
        !reducedMotionRef.current &&
        desktopWideRef.current &&
        !coarsePointerRef.current &&
        !isTouchLike

      if (secondaryAllowed) {
        for (const c of s.secondaries) {
          if (c.nextTurnAtMs === 0 || now >= c.nextTurnAtMs) {
            pickSecondaryVelocity(c)
            c.nextTurnAtMs =
              now + randomBetween(SECONDARY.turnIntervalSecMin, SECONDARY.turnIntervalSecMax) * 1000
          }

          // Soft repulsion from primary (keep minimum distance).
          const dx = c.mx - s.mx
          const dy = c.my - s.my
          const dist = Math.max(0.001, Math.hypot(dx, dy))
          if (dist < SECONDARY.minDistancePct) {
            const t = clamp((SECONDARY.minDistancePct - dist) / SECONDARY.minDistancePct, 0, 1)
            const fx = (dx / dist) * (SECONDARY.repelForce * t)
            const fy = (dy / dist) * (SECONDARY.repelForce * t)
            c.vx += fx * dt
            c.vy += fy * dt
          }

          // Soft containment within bounds (no hard bounces).
          if (c.mx < SECONDARY.targetMinPct)
            c.vx += (SECONDARY.targetMinPct - c.mx) * SECONDARY.edgeForce * dt
          if (c.mx > SECONDARY.targetMaxPct)
            c.vx -= (c.mx - SECONDARY.targetMaxPct) * SECONDARY.edgeForce * dt
          if (c.my < SECONDARY.targetMinPct)
            c.vy += (SECONDARY.targetMinPct - c.my) * SECONDARY.edgeForce * dt
          if (c.my > SECONDARY.targetMaxPct)
            c.vy -= (c.my - SECONDARY.targetMaxPct) * SECONDARY.edgeForce * dt

          // Damping (framerate-independent-ish).
          const damp = Math.exp(-SECONDARY.dampingPerSec * dt)
          c.vx *= damp
          c.vy *= damp

          // Integrate.
          c.mx = clampToOvershootPct(c.mx + c.vx * dt)
          c.my = clampToOvershootPct(c.my + c.vy * dt)
        }
      } else {
        // Keep secondaries stable when disabled (mobile / narrow / reduced motion).
        for (const c of s.secondaries) {
          c.nextTurnAtMs = 0
          c.vx = 0
          c.vy = 0
          c.mx = PRIMARY.neutralPct
          c.my = PRIMARY.neutralPct
        }
      }

      // Press: keep simple but slightly slower.
      const easePress = 1 - Math.pow(1 - 0.12, dt * 60) // framerate-independent-ish
      s.press += (s.targetPress - s.press) * easePress

      const touchPressed = isTouchLike && s.targetPress > TOUCH.pressedThreshold

      // Critical for mobile: even if we ignore pointer jitter, mx/my can still "creep"
      // because of the spring model (vx/vy inertia). While the user is holding (and not dragging),
      // hard-freeze the motion state so hue can't drift.
      if (touchPressed && !s.touchDragging) {
        // With rate-limited motion, this guarantees absolutely no drift on hold.
        s.vx = 0
        s.vy = 0
        const maxStep = TOUCH.followSpeedPctPerSec * dt
        s.mx = approach(s.mx, s.targetMx, maxStep)
        s.my = approach(s.my, s.targetMy, maxStep)
      }

      // Subtle card tilt (more obvious with pointer, relax when leaving)
      const tx = clamp((s.mx - PRIMARY.neutralPct) / PRIMARY.neutralPct, -1, 1) * 4.5
      const ty = clamp((s.my - PRIMARY.neutralPct) / PRIMARY.neutralPct, -1, 1) * -4.5
      const easeTilt = s.inside ? 0.14 : 0.1
      s.tiltX += (tx - s.tiltX) * easeTilt
      s.tiltY += (ty - s.tiltY) * easeTilt

      if (reducedMotionRef.current) {
        // Keep it static but still allow minimal pointer highlight.
        el.style.setProperty('--oil-spin', '0deg')
        s.hue = 0
        el.style.setProperty('--oil-hue', '0deg')

        for (let i = 0; i < CAUSTICS.points; i++) {
          el.style.setProperty(`--c${i + 1}-a`, '1')
          el.style.setProperty(`--c${i + 1}-s`, '1')
        }
      } else {
        s.oilSpin += OIL.spinSpeedDegPerSec * dt
        el.style.setProperty('--oil-spin', `${s.oilSpin}deg`)

        const hue = touchPressed
          ? // While pressed: hue depends only on position (no time drift).
            // Quantize position slightly to avoid visible hue flicker from micro-jitter.
            ((s.touchDragging ? quantize(s.mx, 0.5) : quantize(s.mx, 1.5)) - PRIMARY.neutralPct) *
              0.55 -
            ((s.touchDragging ? quantize(s.my, 0.5) : quantize(s.my, 1.5)) - PRIMARY.neutralPct) *
              0.35
          : // Otherwise: keep subtle drift.
            (isTouchLike ? 0 : s.oilSpin * 1.15) +
            (s.mx - PRIMARY.neutralPct) * (isTouchLike ? 0.55 : 0.9) -
            (s.my - PRIMARY.neutralPct) * (isTouchLike ? 0.35 : 0.6)

        if (isTouchLike) {
          // Smooth hue on mobile to prevent "light show" from stepped pointer updates.
          const delta = clamp(hue - s.hue, -100, 100) // maxStep
          // Pure rate-limit (speed cap), no extra easing.
          s.hue += delta
          el.style.setProperty('--oil-hue', `${s.hue}deg`)
        } else {
          el.style.setProperty('--oil-hue', `${hue}deg`)
        }

        const tSec = now / 1000
        for (let i = 0; i < CAUSTICS.points; i++) {
          const anim = CAUSTICS.anim[i]
          el.style.setProperty(`--c${i + 1}-a`, String(evalOsc(tSec, anim.a)))
          el.style.setProperty(`--c${i + 1}-s`, String(evalOsc(tSec, anim.s)))
        }
      }

      el.style.setProperty('--mx', `${s.mx}%`)
      el.style.setProperty('--my', `${s.my}%`)
      for (let i = 0; i < SECONDARY.maxCenters; i++) {
        const c = s.secondaries[i]
        const mx = c?.mx ?? PRIMARY.neutralPct
        const my = c?.my ?? PRIMARY.neutralPct
        el.style.setProperty(`--mx${i + 2}`, `${mx}%`)
        el.style.setProperty(`--my${i + 2}`, `${my}%`)
      }
      el.style.setProperty('--press', String(s.press))
      el.style.setProperty('--tilt-x', String(s.tiltX))
      el.style.setProperty('--tilt-y', String(s.tiltY))

      rafLoopIdRef.current = window.requestAnimationFrame(tick)
    }

    rafLoopIdRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafLoopIdRef.current != null) window.cancelAnimationFrame(rafLoopIdRef.current)
      mm?.removeEventListener?.('change', onChange)
      coarseMm?.removeEventListener?.('change', onCoarseChange)
      desktopWideMm?.removeEventListener?.('change', onDesktopWideChange)
    }
  }, [enabled, idleIntervalMs, idleMotion, idleMoveSpeed, secondaryCount])

  return {
    ref: contentRef,
    onPointerEnter,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
  }
}
