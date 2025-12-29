'use client'

import { useEffect } from 'react'

import { initLegacyBackground } from '@/shared/legacy-background'

export const LegacyBackgroundClient = () => {
  useEffect(() => {
    const cleanup = initLegacyBackground()
    return () => cleanup?.()
  }, [])

  return null
}
