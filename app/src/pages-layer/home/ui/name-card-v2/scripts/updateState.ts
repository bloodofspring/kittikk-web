/* eslint-disable no-param-reassign */

import { IDLE } from '@/pages-layer/home/ui/name-card-v2/scripts/constants'
import { type TFaceState } from '@/pages-layer/home/ui/name-card-v2/scripts/types'
import { approach, clamp, randomBetween } from '@/pages-layer/home/ui/name-card-v2/scripts/utils'

export const pickIdleTarget = (face: TFaceState, now: number, idleIntervalMs: number) => {
  const reached =
    Math.hypot(face.targetPositionX - face.positionX, face.targetPositionY - face.positionY) <=
    IDLE.reachedEpsPct
  const due = face.idleNextAtMs === 0 || now >= face.idleNextAtMs

  if (reached || due) {
    face.targetPositionX = clamp(randomBetween(IDLE.targetMinPct, IDLE.targetMaxPct), 0, 100)
    face.targetPositionY = clamp(randomBetween(IDLE.targetMinPct, IDLE.targetMaxPct), 0, 100)
    face.targetRotation = randomBetween(0, 360)
    face.idleNextAtMs = now + idleIntervalMs
  }
}

export const updateFacePosition = (face: TFaceState, dt: number, followSpeed: number) => {
  const maxStep = followSpeed * dt

  face.positionX = approach(face.positionX, face.targetPositionX, maxStep)
  face.positionY = approach(face.positionY, face.targetPositionY, maxStep)
}

export const updateFaceRotation = (face: TFaceState, dt: number, rotationSpeed: number) => {
  const maxRotationStep = rotationSpeed * dt

  // Нормализуем разницу углов для кратчайшего пути
  let normalizedDelta = face.targetRotation - face.rotation
  while (normalizedDelta > 180) normalizedDelta -= 360
  while (normalizedDelta < -180) normalizedDelta += 360

  face.rotation = approach(face.rotation, face.targetRotation, maxRotationStep)
}

export const applyCSSVariables = (container: HTMLDivElement, faces: Record<number, TFaceState>) => {
  Object.entries(faces).forEach(([faceId, face]) => {
    const faceElement = container.querySelector(`[data-face-id="${faceId}"]`) as HTMLElement

    if (faceElement) {
      faceElement.style.setProperty('--face-gradient-x', `${face.positionX}%`)
      faceElement.style.setProperty('--face-gradient-y', `${face.positionY}%`)
      faceElement.style.setProperty('--face-gradient-rotation', `${face.rotation}deg`)
    }
  })
}
