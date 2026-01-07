import Image from 'next/image'

import { facesConfig } from '@/pages-layer/home/ui/name-card-v2/InteractiveNameCardv2.constants'
import { useTetraGradients } from '@/pages-layer/home/ui/name-card-v2/scripts/useTetraCard'
import nameSign from '@/shared/assets/images/NameSign.png'

import { Wrapper, TetraContainer, Face, EdgeOutline } from './InteractiveNameCardv2.styles'

const SurfaceImage = () => (
  <Image
    alt="KiTTiKk"
    draggable={false}
    src={nameSign}
    style={{
      width: '55%',
      height: 'auto',
      transform: 'translateY(100%) scaleY(5) rotateX(69deg) scaleX(-1)',
      userSelect: 'none',
      pointerEvents: 'none',
    }}
    onContextMenu={(e) => e.preventDefault()}
    onDragStart={(e) => e.preventDefault()}
  />
)

interface IProps {
  isActive: boolean
}

export const InteractiveNameCardv2 = ({ isActive }: IProps) => {
  const { containerRef } = useTetraGradients({
    isEnabled: !isActive,
    idleIntervalSec: 3,
    followSpeedPctPerSec: 15,
    rotationSpeedDegPerSec: 20,
  })

  return (
    <Wrapper>
      <TetraContainer ref={containerRef}>
        {facesConfig.map((config) => (
          <Face
            data-face-id={config.id}
            key={config.id}
            origin={config.origin}
            transform={config.transform}
          >
            <SurfaceImage />
            <EdgeOutline preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 50 0 L 100 100 L 0 100 Z" />
            </EdgeOutline>
          </Face>
        ))}
      </TetraContainer>
    </Wrapper>
  )
}
