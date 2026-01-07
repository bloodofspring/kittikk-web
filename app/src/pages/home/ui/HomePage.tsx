'use client'

import { styled } from '@linaria/react'
import { useEffect, useState } from 'react'

import { InteractiveNameCardv2 } from '@/pages/home/ui/name-card-v2/InteractiveNameCardv2'
import { Background } from '@/widgets/background'

const SwitchButton = styled.button`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 10;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: #fff;
  opacity: 0.9;
  text-decoration: underline;
  font: inherit;
  text-shadow: 0 1px 2px rgb(0 0 0 / 70%);
  font-size: 13px;
`

export const HomePage = () => {
  const [isLightweight, setIsLightweight] = useState<boolean>(false)

  useEffect(() => {
    const saved = localStorage.getItem('kittikk:lightweight-graphics')

    const isLightWeightEnabled = saved === '1' || window.matchMedia?.('(max-width: 999px)').matches

    setIsLightweight(isLightWeightEnabled)
  }, [])

  const handleToggle = () => {
    const newValue = !isLightweight
    setIsLightweight(newValue)
    localStorage.setItem('kittikk:lightweight-graphics', newValue ? '1' : '0')
  }

  return (
    <Background>
      <InteractiveNameCardv2 isActive={isLightweight} />
      <SwitchButton
        suppressHydrationWarning
        aria-pressed={isLightweight}
        type="button"
        onClick={handleToggle}
      >
        {isLightweight ? 'Enable default graphics' : 'Enable lightweight graphics'}
      </SwitchButton>
    </Background>
  )
}
