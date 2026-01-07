import { type TFaceState } from '@/pages/home/ui/name-card-v2/scripts/types'

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const approach = (current: number, target: number, maxDelta: number) => {
  const d = target - current
  if (Math.abs(d) <= maxDelta) return target
  return current + Math.sign(d) * maxDelta
}

export const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

export const createInitialFaceState = (): TFaceState => ({
  positionX: 50,
  positionY: 50,
  rotation: 0,
  targetPositionX: 50,
  targetPositionY: 50,
  targetRotation: 0,
  idleNextAtMs: 0,
})
