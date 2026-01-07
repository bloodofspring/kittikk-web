import Image from 'next/image'

import { facesConfig } from '@/pages/home/ui/name-card-v2/InteractiveNameCardv2.constants'
import nameSign from '@/shared/assets/images/NameSign.png'

import { Wrapper, TetraContainer, Face } from './InteractiveNameCardv2.styles'

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

export const InteractiveNameCardv2 = ({ isActive }: IProps) => (
  <Wrapper>
    <TetraContainer>
      {facesConfig.map((config) => (
        <Face
          faceId={config.id}
          key={config.id}
          origin={config.origin}
          transform={config.transform}
        >
          <SurfaceImage />
        </Face>
      ))}
    </TetraContainer>
  </Wrapper>
)
