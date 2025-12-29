import type { TTileMode, TTileRenderMode } from './types'

export function setLayerSharp(el: HTMLElement | null, sharp: boolean) {
  if (!el) return
  if (sharp) el.classList.add('is-sharp')
  else el.classList.remove('is-sharp')
}

function shouldUseFixedAttachment() {
  // On mobile (esp. iOS), `background-attachment: fixed` can be janky.
  // We treat "PC" as hover-capable + fine pointer (trackpad/mouse).
  if (typeof window === 'undefined') return true
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function setBackgroundStyles(
  targetEl: HTMLElement,
  bgUrl: string,
  tileMode: TTileMode,
  tileRenderMode: TTileRenderMode = 'repeat',
) {
  // No dark overlay here; blur/fade is handled by CSS on .bg-layer.
  const style = targetEl.style
  style.backgroundImage = `url('${bgUrl}')`
  style.backgroundAttachment = shouldUseFixedAttachment() ? 'fixed' : 'scroll'

  if (tileMode === 'x') {
    style.backgroundSize = 'auto 100%'
    style.backgroundRepeat = tileRenderMode === 'strip' ? 'no-repeat' : 'repeat-x'
    style.backgroundPosition = 'center center'
    return
  }
  if (tileMode === 'y') {
    style.backgroundSize = '100% auto'
    style.backgroundRepeat = tileRenderMode === 'strip' ? 'no-repeat' : 'repeat-y'
    style.backgroundPosition = 'center center'
    return
  }

  style.backgroundSize = 'cover'
  style.backgroundRepeat = 'no-repeat'
  style.backgroundPosition = 'center center'
}

export function makeBgKey(
  bgUrl: string,
  tileMode: TTileMode,
  tileRenderMode: TTileRenderMode = 'repeat',
) {
  return `${tileMode || ''}|${tileRenderMode}|${bgUrl}`
}
