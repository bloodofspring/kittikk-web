import { styled } from '@linaria/react'

import { Background } from '@/widgets/background'

import { InteractiveNameCard } from './interactive-name-card/InteractiveNameCard'

const Caption = styled.div`
  font-size: 13px;
  display: flex;
  justify-content: center;
  color: white;
  opacity: 0.5;
`

export const HomePage = () => (
  <Background>
    <InteractiveNameCard />
    <Caption>
      <p>Swipe up to hide</p>
    </Caption>
  </Background>
)
