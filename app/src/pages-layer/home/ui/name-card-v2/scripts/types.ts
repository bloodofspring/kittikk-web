import type { RefObject } from 'react'

export type TFaceState = {
  positionX: number
  positionY: number
  rotation: number
  targetPositionX: number
  targetPositionY: number
  targetRotation: number
  idleNextAtMs: number
}

export type TState = {
  faces: Record<number, TFaceState>
  lastFrameTime: number
}

export type TUseTetraGradientsReturn = {
  containerRef: RefObject<HTMLDivElement | null>
}

export type TUseTetraGradientsOptions = {
  isEnabled?: boolean
  idleIntervalSec?: number
  followSpeedPctPerSec?: number
  rotationSpeedDegPerSec?: number
}
