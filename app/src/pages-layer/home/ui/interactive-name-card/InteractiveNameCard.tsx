'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import nameSign from '@/shared/assets/images/NameSign.png'

import { Card } from './InteractiveNameCard.styles'
import { DescriptionContainer } from './description/descriptionContainer'
import { useLiquidGlassCard } from './useLiquidGlassCard'

export const InteractiveNameCard = () => {
  const [isLightweight, setIsLightweight] = useState(false)

  useEffect(() => {
    try {
      setIsLightweight(window.localStorage.getItem('kittikk:lightweight-graphics') === '1')
    } catch {
      // ignore
    }

    const onModeChange = (e: Event) => {
      const ce = e as CustomEvent<{ enabled?: boolean }>
      if (typeof ce.detail?.enabled === 'boolean') setIsLightweight(ce.detail.enabled)
    }

    window.addEventListener('kittikk:lightweight-graphics-change', onModeChange as EventListener)
    return () => {
      window.removeEventListener(
        'kittikk:lightweight-graphics-change',
        onModeChange as EventListener,
      )
    }
  }, [])

  const { ref, onPointerDown, onPointerEnter, onPointerLeave, onPointerMove, onPointerUp } =
    useLiquidGlassCard({
      enabled: !isLightweight,
      idleMotion: 'follow',
      idleMoveSpeed: 0.25,
      secondaryCenters: 2,
    })

  return (
    <Card
      ref={ref}
      onPointerCancel={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Image
        alt="KiTTiKk"
        draggable={false}
        src={nameSign}
        style={{
          width: '100%',
          height: 'auto',
          userSelect: 'none',
          // Prevent image-specific interactions (drag/long-press menu) while keeping the card interactive.
          pointerEvents: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      <DescriptionContainer></DescriptionContainer>
    </Card>
  )
}
