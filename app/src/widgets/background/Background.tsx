'use client'

import { type ReactNode } from 'react'

import { LegacyBackgroundClient } from './LegacyBackgroundClient'

type TProps = {
  children?: ReactNode
}

export const Background = ({ children }: TProps) => (
  <>
    <div className="bg-layer is-visible" id="bg-layer-a" />
    <div className="bg-layer" id="bg-layer-b" />
    <div className="legacy-vignette" />

    {children}

    <LegacyBackgroundClient />
  </>
)
