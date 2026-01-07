import { styled } from '@linaria/react'
import Image from 'next/image'

import nameSign from '@/shared/assets/images/NameSign.png'

interface IProps {
  isActive: boolean
}

const Wrapper = styled.div`
  perspective: 9000px;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  overflow: hidden;
`

const TetraContainer = styled.div`
  --side-size: 50vw;
  --triangle-height: calc(var(--side-size) * 0.866);

  position: absolute;
  top: calc(50% + var(--triangle-height) / 2);
  left: 50%;
  width: 0;
  height: 0;

  transform-style: preserve-3d;
  animation: rotate 60s linear infinite;

  @keyframes rotate {
    0% {
      transform: rotateX(90deg) rotateZ(0deg);
    }
    100% {
      transform: rotateX(90deg) rotateZ(360deg);
    }
  }
`

const TetraFace = styled.div`
  position: absolute;
  left: calc(var(--side-size) / -2);
  top: calc(var(--triangle-height) / -1.5);

  width: var(--side-size);
  height: var(--triangle-height);

  clip-path: polygon(50% 0, 100% 100%, 0% 100%);
  transform-style: preserve-3d;

  display: flex;
  align-items: center;
  justify-content: center;

  perspective: 167px;

  background: linear-gradient(135deg, rgb(255 255 255 / 44%), rgb(255 255 255 / 37%));
  backdrop-filter: saturate(110%) brightness(1.41);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    inset 0 0 20vw #333,
    0 0 0 1px white,
    0 0 10px rgba(255, 255, 255, 0.5);

  &::before {
    content: '';
    position: absolute;
    inset: -35%;
    z-index: -1;
    pointer-events: none;

    background: linear-gradient(
      115deg,
      rgb(255 255 255 / 0%) 28%,
      rgb(255 255 255 / 22%) 44%,
      rgb(255 255 255 / 0%) 62%
    );

    opacity: 0.4;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -20%;
    z-index: -2;
    pointer-events: none;
    opacity: 0.5;

    background:
      radial-gradient(rgb(255 255 255 / 16%), rgb(0 0 0 / 0%) 62%),
      conic-gradient(
        hsl(330 100% 70% / 38%) 0deg,
        hsl(290 100% 72% / 34%) 45deg,
        hsl(210 100% 74% / 34%) 90deg,
        hsl(165 100% 70% / 32%) 135deg,
        hsl(95 100% 70% / 28%) 180deg,
        hsl(40 100% 72% / 30%) 225deg,
        hsl(10 100% 70% / 34%) 270deg,
        hsl(330 100% 70% / 38%) 360deg
      );
    filter: saturate(1500%) blur(20px);
  }
`

const Face1 = styled(TetraFace)``

const Face2 = styled(TetraFace)`
  transform-origin: 0 100%;
  transform: rotate(-60deg) rotatex(-109.5deg);
`

const Face3 = styled(TetraFace)`
  transform-origin: 100% 100%;
  transform: rotate(60deg) rotatex(-109.5deg);
`

const Face4 = styled(TetraFace)`
  transform-origin: 50% 100%;
  transform: rotate(180deg) rotatex(-109.5deg);
`

export const InteractiveNameCardv2 = ({ isActive }: IProps) => (
  <Wrapper>
    <TetraContainer>
      <Face1>
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
      </Face1>
      <Face2>
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
      </Face2>
      <Face3>
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
      </Face3>
      <Face4>
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
      </Face4>
    </TetraContainer>
  </Wrapper>
)
