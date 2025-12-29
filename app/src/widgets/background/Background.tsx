'use client'

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { LegacyBackgroundClient } from './LegacyBackgroundClient'

type TProps = {
  children?: ReactNode
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const Background = ({ children }: TProps) => {
  const [isLightweight, setIsLightweight] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0) // 0..1
  const scrollProgressRef = useRef(0)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('kittikk:lightweight-graphics')
      if (raw === '1') {
        setIsLightweight(true)
        return
      }
      if (raw === '0') return

      // Default on phones: enable lightweight ("lightview") mode unless the user chose otherwise.
      const isPhoneLike =
        window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ||
        window.matchMedia?.('(max-width: 999px)').matches
      if (isPhoneLike) setIsLightweight(true)
    } catch {
      // ignore (private mode / denied storage)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('lightweight-graphics', isLightweight)
    try {
      window.localStorage.setItem('kittikk:lightweight-graphics', isLightweight ? '1' : '0')
    } catch {
      // ignore
    }

    // Let other widgets (e.g. the liquid-glass card) sync instantly without coupling.
    window.dispatchEvent(
      new CustomEvent('kittikk:lightweight-graphics-change', {
        detail: { enabled: isLightweight },
      }),
    )
  }, [isLightweight])

  useEffect(() => {
    // Drive subtle "content lift + fade" based on scroll direction.
    // Works even when the page doesn't actually scroll (wheel/trackpad).
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let rafId = 0
    let lastScrollY = window.scrollY
    let lastTouchY: number | null = null

    const publish = () => {
      rafId = 0
      setScrollProgress(scrollProgressRef.current)
    }

    const schedulePublish = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(publish)
    }

    const applyDelta = (deltaY: number) => {
      if (!Number.isFinite(deltaY) || deltaY === 0) return

      // deltaY < 0: scrolling up -> increase progress (move up + fade out)
      // deltaY > 0: scrolling down -> decrease progress (restore)
      // Inverted behavior:
      // deltaY < 0: scrolling up -> decrease progress (restore)
      // deltaY > 0: scrolling down -> increase progress (move up + fade out)
      const direction = deltaY < 0 ? -1 : 1
      const magnitude = Math.min(Math.abs(deltaY), 200) / 200 // normalize
      const next = clamp01(scrollProgressRef.current + direction * magnitude * 0.45)

      if (next === scrollProgressRef.current) return
      scrollProgressRef.current = next
      schedulePublish()
    }

    const onWheel = (e: WheelEvent) => {
      applyDelta(e.deltaY)
    }

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      applyDelta(delta)
    }

    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches?.[0]?.clientY ?? null
    }

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches?.[0]?.clientY
      if (typeof y !== 'number' || lastTouchY === null) {
        lastTouchY = typeof y === 'number' ? y : null
        return
      }
      // Finger moving up means clientY decreases -> emulate "wheel up" (negative delta).
      const deltaY = lastTouchY - y
      lastTouchY = y
      applyDelta(deltaY)
    }

    const onTouchEnd = () => {
      lastTouchY = null
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const contentStyle = useMemo<CSSProperties>(() => {
    // Keep it subtle so it doesn't fight with the "liquid glass" motion.
    const translateY = -84 * scrollProgress
    const opacity = 1 - 1 * scrollProgress

    return {
      transform: `translate3d(0, ${translateY.toFixed(2)}px, 0)`,
      opacity: Number(opacity.toFixed(3)),
    }
  }, [scrollProgress])

  return (
    <>
      <div className="bg-layer is-visible" id="bg-layer-a" />
      <div className="bg-layer" id="bg-layer-b" />
      <div className="legacy-vignette" />

      <div className="content-wrapper" style={contentStyle}>
        {children}
      </div>

      <LegacyBackgroundClient />

      <button
        aria-pressed={isLightweight}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 10,
          border: 0,
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          color: '#fff',
          opacity: 0.9,
          textDecoration: 'underline',
          font: 'inherit',
          textShadow: '0 1px 2px rgb(0 0 0 / 70%)',
          fontSize: '13px',
        }}
        type="button"
        onClick={() => setIsLightweight((v) => !v)}
      >
        {isLightweight ? 'Enable default graphics' : 'Enable lightweight graphics'}
      </button>
    </>
  )
}
