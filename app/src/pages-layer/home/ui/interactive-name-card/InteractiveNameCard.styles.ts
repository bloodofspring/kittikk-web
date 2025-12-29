import { styled } from '@linaria/react'

const SECONDARY_MAX_CENTERS = 3

type TCausticPoint = {
  xPct: number
  yPct: number
  h: number
  s: number
  l: number
  alpha: number
  stopPct: number
}

/**
 * "Caustics" spots (static positions) — animation is driven via CSS vars:
 * - `--cN-a` multiplies alpha
 * - `--cN-s` multiplies saturation
 */
const CAUSTIC_POINTS: TCausticPoint[] = [
  { xPct: 20, yPct: 30, h: 268, s: 78, l: 75, alpha: 0.22, stopPct: 65 },
  { xPct: 75, yPct: 70, h: 197, s: 86, l: 73, alpha: 0.18, stopPct: 60 },
  { xPct: 50, yPct: 50, h: 0, s: 0, l: 100, alpha: 0.1, stopPct: 70 },
]

const causticVarDecl = Array.from({ length: CAUSTIC_POINTS.length }, (_, i) => {
  const idx = i + 1
  return `  --c${idx}-a: 1;
  --c${idx}-s: 1;`
}).join('\n')

const causticLayers = CAUSTIC_POINTS.map((p, i) => {
  const idx = i + 1
  return `      radial-gradient(
        closest-side at ${p.xPct}% ${p.yPct}%,
        hsl(
          ${p.h}
          clamp(0%, calc(${p.s}% * var(--c${idx}-s)), 100%)
          ${p.l}% / calc(${p.alpha} * var(--c${idx}-a))
        ),
        rgb(0 0 0 / 0%) ${p.stopPct}%
      )`
}).join(',\n')

const secondaryVarDecl = Array.from({ length: SECONDARY_MAX_CENTERS }, (_, i) => {
  const idx = i + 2
  return `  --mx${idx}: 50%;
  --my${idx}: 50%;`
}).join('\n')

const secondaryHighlightLayers = Array.from({ length: SECONDARY_MAX_CENTERS }, (_, i) => {
  const idx = i + 2
  return `      radial-gradient(
        closest-side at var(--mx${idx}) var(--my${idx}),
        rgb(255 255 255 / calc(0.34 * var(--secondary-strength))),
        rgb(0 0 0 / 0%) 54%
      )`
}).join(',\n')

const secondaryOilLayers = Array.from({ length: SECONDARY_MAX_CENTERS }, (_, i) => {
  const idx = i + 2
  return `      conic-gradient(
        from calc(var(--oil-spin) + ${40 + i * 35}deg) at var(--mx${idx}) var(--my${idx}),
        hsl(210 100% 74% / calc(0.40 * var(--secondary-strength))) 0deg,
        hsl(165 100% 70% / calc(0.34 * var(--secondary-strength))) 60deg,
        hsl(40 100% 72% / calc(0.34 * var(--secondary-strength))) 150deg,
        hsl(330 100% 70% / calc(0.40 * var(--secondary-strength))) 240deg,
        hsl(210 100% 74% / calc(0.40 * var(--secondary-strength))) 360deg
      )`
}).join(',\n')

export const Card = styled.div`
  /* Interaction vars (updated via pointer events) */
  --mx: 50%;
  --my: 50%;
  ${secondaryVarDecl}
  ${causticVarDecl}
  --press: 0;
  --oil-hue: 0deg;
  --oil-spin: 0deg;
  --tilt-x: 0;
  --tilt-y: 0;
  --secondary-strength: 0;

  /* Layout */
  position: relative;
  z-index: 2;

  /* Make touch/pointer interaction deterministic on mobile */
  /* Allow vertical page scroll on phones while still keeping horizontal gestures + pointer events usable. */
  touch-action: pan-y;
  user-select: none;

  /* Disable image-specific browser interactions (drag + long-press callout menus). */
  & img {
    user-select: none;
    pointer-events: none;
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
  }

  max-width: 720px;
  width: min(720px, calc(100vw - 32px));
  padding: 24px 28px;
  /* Typography */
  color: #fff;
  text-align: center;

  /* Container / "liquid glass" base */
  border-radius: 28px;
  overflow: hidden;
  isolation: isolate;

  background: linear-gradient(135deg, rgb(255 255 255 / 14%), rgb(255 255 255 / 7%));
  border: 1px solid rgb(255 255 255 / 22%);
  backdrop-filter: blur(28px) saturate(160%) brightness(1.06) contrast(105%);

  box-shadow:
    0 22px 55px rgb(0 0 0 / 55%),
    0 6px 18px rgb(0 0 0 / 35%),
    inset 0 1px 0 rgb(255 255 255 / 22%),
    inset 0 0 0 1px rgb(255 255 255 / 6%),
    inset 0 -14px 28px rgb(0 0 0 / 32%),
    inset 0 -1px 0 rgb(0 0 0 / 22%);

  transition:
    box-shadow 160ms ease,
    transform 160ms ease;

  /* Lightweight mode: keep only blur/opacity/shadows, drop liquid "caustics/oil" layers + interaction transforms. */
  :global(body.lightweight-graphics) & {
    transform: none;
    transition: none;
    background: rgb(255 255 255 / 10%);
    backdrop-filter: blur(28px);
  }

  :global(body.lightweight-graphics) &::before,
  :global(body.lightweight-graphics) &::after {
    content: none;
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    /* Fallback: keep it "glassy" without true blur */
    background: linear-gradient(135deg, rgb(20 16 26 / 66%), rgb(20 16 26 / 52%));
  }

  /* Animations
     We intentionally avoid timeline-based "left-to-right" movement here.
     Everything follows pointer via CSS vars (--mx/--my/--press). */

  @media (min-width: 1000px) {
    --secondary-strength: 1.35;
  }

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

    filter: blur(3px);
    opacity: calc(0.22 + var(--press) * 0.22);
    transform: translate3d(calc((var(--mx) - 50%) * 0.7), calc((var(--my) - 50%) * 0.45), 0)
      rotate(8deg);
  }

  &::after {
    content: '';
    position: absolute;
    inset: -20%;
    z-index: -2;
    pointer-events: none;

    /*
      "Liquid" caustics + "oil-slick" iridescence layer
      - Oil center follows pointer (--mx/--my)
      - Press increases opacity slightly (--press)
    */
    background:
      /* specular highlight near cursor */
      radial-gradient(
        closest-side at var(--mx) var(--my),
        rgb(255 255 255 / 16%),
        rgb(0 0 0 / 0%) 62%
      ),
      ${secondaryHighlightLayers},
      /* oil iridescence */
      conic-gradient(
          from var(--oil-spin) at var(--mx) var(--my),
          hsl(330 100% 70% / 38%) 0deg,
          hsl(290 100% 72% / 34%) 45deg,
          hsl(210 100% 74% / 34%) 90deg,
          hsl(165 100% 70% / 32%) 135deg,
          hsl(95 100% 70% / 28%) 180deg,
          hsl(40 100% 72% / 30%) 225deg,
          hsl(10 100% 70% / 34%) 270deg,
          hsl(330 100% 70% / 38%) 360deg
        ),
      ${secondaryOilLayers},
      conic-gradient(
        from calc(var(--oil-spin) + 120deg) at var(--mx) var(--my),
        hsl(210 100% 74% / 20%) 0deg,
        hsl(165 100% 70% / 18%) 60deg,
        hsl(40 100% 72% / 18%) 150deg,
        hsl(330 100% 70% / 20%) 240deg,
        hsl(210 100% 74% / 20%) 360deg
      ),
      /* caustics */ ${causticLayers};

    mix-blend-mode: soft-light;
    opacity: calc(0.38 + var(--press) * 0.12);
    filter: blur(12px) saturate(190%) contrast(110%) hue-rotate(var(--oil-hue));
  }

  /* Ensure content stays above decorative layers */
  & > * {
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    /* Keep pointer-following, but avoid extra transforms that can feel "animated". */
    transform: none;
  }

  /* Content styles */
  h1 {
    margin: 0 0 8px;
    font-family: var(--font-name), system-ui, sans-serif;
    font-size: clamp(40px, 6vw, 72px);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }
`
