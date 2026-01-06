'use client'

import Image from 'next/image'
import { useMemo } from 'react'

import nameSign from '@/shared/assets/images/NameSign.png'

import { Card } from './InteractiveNameCard.styles'
import { DescriptionContainer } from './description/descriptionContainer'
import { useLiquidGlassCard } from './useLiquidGlassCard'

type TContainerProps = {
  isActive: boolean
}

export const InteractiveNameCard = ({ isActive }: TContainerProps) => {
  const liquidGlassOptions = useMemo(
    () => ({
      enabled: !isActive,
      idleMotion: 'follow' as const,
      idleMoveSpeed: 0.25,
      secondaryCenters: 2,
    }),
    [isActive],
  )

  const { ref, onPointerDown, onPointerEnter, onPointerLeave, onPointerMove, onPointerUp } =
    useLiquidGlassCard(liquidGlassOptions)

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
