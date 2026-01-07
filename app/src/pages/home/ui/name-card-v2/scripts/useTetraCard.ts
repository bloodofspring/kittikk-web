/* eslint-disable no-param-reassign */

import { useEffect, useRef } from 'react'

import { GRADIENT, IDLE } from '@/pages/home/ui/name-card-v2/scripts/constants'
import {
  type TState,
  type TUseTetraGradientsOptions,
  type TUseTetraGradientsReturn,
} from '@/pages/home/ui/name-card-v2/scripts/types'
import {
  applyCSSVariables,
  pickIdleTarget,
  updateFacePosition,
  updateFaceRotation,
} from '@/pages/home/ui/name-card-v2/scripts/updateState'
import { clamp, createInitialFaceState } from '@/pages/home/ui/name-card-v2/scripts/utils'

export const useTetraGradients = (
  options: TUseTetraGradientsOptions = {},
): TUseTetraGradientsReturn => {
  const isEnabled = options.isEnabled ?? true
  const idleIntervalMs = Math.max(0, options.idleIntervalSec ?? IDLE.intervalSecDefault) * 1000
  const followSpeed = options.followSpeedPctPerSec ?? IDLE.followSpeedPctPerSec
  const rotationSpeed = options.rotationSpeedDegPerSec ?? GRADIENT.rotationSpeedDegPerSec

  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafLoopIdRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)
  const stateRef = useRef<TState>({
    faces: {
      1: createInitialFaceState(),
      2: createInitialFaceState(),
      3: createInitialFaceState(),
      4: createInitialFaceState(),
    },
    lastFrameTime: 0,
  })

  useEffect(() => {
    if (!isEnabled) return

    const tick = (now: number) => {
      const el = containerRef.current
      if (!el) {
        rafLoopIdRef.current = window.requestAnimationFrame(tick)
        return
      }

      const state = stateRef.current

      const timeDelta = clamp((now - state.lastFrameTime || now) / 1000, 0, 0.05)
      state.lastFrameTime = now

      const idleAllowed = !reducedMotionRef.current && idleIntervalMs > 0

      Object.values(state.faces).forEach((face) => {
        if (idleAllowed) {
          pickIdleTarget(face, now, idleIntervalMs)
        } else {
          face.idleNextAtMs = 0
          if (!reducedMotionRef.current) {
            face.targetRotation = (face.targetRotation + rotationSpeed * timeDelta) % 360
          }
        }

        updateFacePosition(face, timeDelta, followSpeed)

        if (!reducedMotionRef.current) {
          updateFaceRotation(face, timeDelta, rotationSpeed)
        }
      })

      applyCSSVariables(el, state.faces)

      rafLoopIdRef.current = window.requestAnimationFrame(tick)
    }

    rafLoopIdRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafLoopIdRef.current != null) window.cancelAnimationFrame(rafLoopIdRef.current)
    }
  }, [isEnabled, idleIntervalMs, followSpeed, rotationSpeed])

  return {
    containerRef,
  }
}
