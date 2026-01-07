'use client'

import { styled } from '@linaria/react'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  p {
    flex-grow: 1;
    margin: 0;
    font-size: 20px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    font-size: calc(50vw);
    letter-spacing: calc(2vw);
  }
`

const P = styled.p`
  margin: 0;
  font-family: var(--font-name), system-ui, sans-serif;
  font-size: clamp(14px, 2vw, 18px);
  line-height: 1.6;
  opacity: 0.95;

  &::first-letter {
    color: #e6cdff;
  }
`

export const DescriptionContainer = () => (
  <Container>
    <P>Keen</P>
    <P>Intelligent</P>
    <P>Talented</P>
    <P>Twilight</P>
    <P>Impressive</P>
    <P>Kempt</P>
    <P>Kitten</P>
  </Container>
)
