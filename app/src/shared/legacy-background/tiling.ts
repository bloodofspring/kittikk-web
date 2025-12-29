/* eslint-disable max-lines */
import { BLOB_CACHE_LIMIT } from './constants'
import type { TImageSize, TTileMode } from './types'

export function isViewportLandscape() {
  return window.innerWidth >= window.innerHeight
}

export function computeTileMode(imageSize: TImageSize | null): TTileMode {
  if (!imageSize) return null
  const viewportLandscape = isViewportLandscape()

  const w = imageSize.width
  const h = imageSize.height
  if (!w || !h) return null

  // Special-case near-square images: avoid `background-size: cover` cropping.
  // - On landscape screens: fit by height (x mode -> `auto 100%`)
  // - On portrait screens: fit by width  (y mode -> `100% auto`)
  const aspect = w / h
  const SQUARE_EPS = 0.1 // 10% deviation from 1:1
  if (Math.abs(aspect - 1) <= SQUARE_EPS) {
    return viewportLandscape ? 'x' : 'y'
  }

  const isPortraitImage = h > w
  const tileByX = viewportLandscape && isPortraitImage
  const tileByY = !viewportLandscape && !isPortraitImage
  if (tileByX) return 'x'
  if (tileByY) return 'y'
  return null
}

export function tileServiceAvailable() {
  // Works only when SW is actually controlling the page (usually after first reload).
  return !!(navigator.serviceWorker && navigator.serviceWorker.controller)
}

export function tileServiceUrl(src: string, axis: Exclude<TTileMode, null>) {
  // Root-relative: stable regardless of current route.
  // v8: viewport-sized strip with smooth "wave" falloff (blur+dark) starting from the edges
  // of the centered (dist=0) segment. No hard seams between segments.
  // Include viewport params so SW can generate an image that exactly matches what we need now.
  // On mobile browsers (esp. iOS), `innerHeight` can jump with the address bar.
  // `visualViewport` better represents the actually visible area.
  const viewportW = window.visualViewport?.width ?? window.innerWidth
  const viewportH = window.visualViewport?.height ?? window.innerHeight
  const vw = Math.max(1, Math.round(viewportW || 1))
  const vh = Math.max(1, Math.round(viewportH || 1))
  const dpr = Math.max(1, Math.min(3, Math.round((window.devicePixelRatio || 1) * 100) / 100))
  return `/__tile?src=${encodeURIComponent(src)}&axis=${encodeURIComponent(axis)}&v=8&vw=${encodeURIComponent(String(vw))}&vh=${encodeURIComponent(String(vh))}&dpr=${encodeURIComponent(String(dpr))}`
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to create blob'))
      resolve(URL.createObjectURL(blob))
    }, 'image/png')
  })
}

export type TBlobUrlCache = {
  get: (key: string) => string | null
  set: (key: string, value: string) => void
  cleanup: () => void
}

export function createBlobUrlCache(limit: number = BLOB_CACHE_LIMIT): TBlobUrlCache {
  const map = new Map<string, string>()
  const order: string[] = []

  function get(key: string) {
    return map.get(key) || null
  }

  function set(key: string, value: string) {
    if (map.has(key)) return
    map.set(key, value)
    order.push(key)
    while (order.length > limit) {
      const oldestKey = order.shift()
      if (!oldestKey) break
      const oldestUrl = map.get(oldestKey)
      map.delete(oldestKey)
      if (oldestUrl) URL.revokeObjectURL(oldestUrl)
    }
  }

  function cleanup() {
    for (const url of map.values()) URL.revokeObjectURL(url)
    map.clear()
    order.splice(0, order.length)
  }

  return { get, set, cleanup }
}

async function getSeamlessTileUrl(
  img: HTMLImageElement,
  axis: Exclude<TTileMode, null>,
  cache: TBlobUrlCache,
) {
  // v2: shift the seam so the "original" (non-mirrored) section is centered in the repeating pattern.
  // Kept for backward compatibility / fallback when we can't build a viewport strip.
  const key = `${img.src}|${axis}|v2-centered`
  const cached = cache.get(key)
  if (cached) return cached

  const w = img.naturalWidth
  const h = img.naturalHeight

  // Build a 2x tile first: [original][mirrored], then shift by half a segment so the
  // seam doesn't land in the middle when using `background-position: center`.
  const base = document.createElement('canvas')
  base.width = axis === 'x' ? w * 2 : w
  base.height = axis === 'y' ? h * 2 : h

  const baseCtx = base.getContext('2d')
  if (!baseCtx) throw new Error('No 2D context')

  // (0,0) original
  baseCtx.drawImage(img, 0, 0, w, h)

  baseCtx.save()
  if (axis === 'x') {
    baseCtx.translate(w * 2, 0)
    baseCtx.scale(-1, 1)
    baseCtx.drawImage(img, 0, 0, w, h)
  } else {
    baseCtx.translate(0, h * 2)
    baseCtx.scale(1, -1)
    baseCtx.drawImage(img, 0, 0, w, h)
  }
  baseCtx.restore()

  const canvas = document.createElement('canvas')
  canvas.width = base.width
  canvas.height = base.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')

  if (axis === 'x') {
    // shift right by w/2: O(x) = B((x - w/2) mod 2w)
    const half = Math.floor(w / 2)
    const sx1 = w * 2 - half
    const sw1 = half
    const dx1 = 0
    const dw1 = sw1
    ctx.drawImage(base, sx1, 0, sw1, h, dx1, 0, dw1, h)

    const sx2 = 0
    const sw2 = w * 2 - half
    const dx2 = half
    const dw2 = sw2
    ctx.drawImage(base, sx2, 0, sw2, h, dx2, 0, dw2, h)
  } else {
    // shift down by h/2: O(y) = B((y - h/2) mod 2h)
    const half = Math.floor(h / 2)
    const sy1 = h * 2 - half
    const sh1 = half
    const dy1 = 0
    const dh1 = sh1
    ctx.drawImage(base, 0, sy1, w, sh1, 0, dy1, w, dh1)

    const sy2 = 0
    const sh2 = h * 2 - half
    const dy2 = half
    const dh2 = sh2
    ctx.drawImage(base, 0, sy2, w, sh2, 0, dy2, w, dh2)
  }

  const blobUrl = await canvasToBlobUrl(canvas)
  cache.set(key, blobUrl)
  return blobUrl
}

function getViewportParams() {
  const viewportW = window.visualViewport?.width ?? window.innerWidth
  const viewportH = window.visualViewport?.height ?? window.innerHeight
  const vw = Math.max(1, Math.round(viewportW || 1))
  const vh = Math.max(1, Math.round(viewportH || 1))
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  return { vw, vh, dpr }
}

async function getFalloffStripUrl(
  img: HTMLImageElement,
  axis: Exclude<TTileMode, null>,
  cache: TBlobUrlCache,
) {
  const { vw, vh, dpr } = getViewportParams()
  const key = `${img.src}|${axis}|v8-wave|vw:${vw}|vh:${vh}|dpr:${dpr.toFixed(2)}`
  const cached = cache.get(key)
  if (cached) return cached

  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return img.src

  // Work in "CSS pixels", but render at devicePixelRatio for crispness.
  const cssW = vw
  const cssH = vh
  const pxW = Math.round(cssW * dpr)
  const pxH = Math.round(cssH * dpr)

  const canvas = document.createElement('canvas')

  // Segment size in *canvas* pixels.
  const segW = axis === 'x' ? Math.max(1, Math.round((iw / ih) * pxH)) : pxW
  const segH = axis === 'y' ? Math.max(1, Math.round((ih / iw) * pxW)) : pxH

  // Ensure we cover the viewport plus a couple segments on each side so "extra copies" can overflow.
  const neededSegments = axis === 'x' ? Math.ceil(pxW / segW) + 4 : Math.ceil(pxH / segH) + 4
  const n = Math.ceil(neededSegments / 2) // segments to each side

  canvas.width = axis === 'x' ? (2 * n + 1) * segW : segW
  canvas.height = axis === 'y' ? (2 * n + 1) * segH : segH

  // Safety guard to avoid creating absurdly large canvases.
  const MAX_DIM = 16384
  if (canvas.width > MAX_DIM || canvas.height > MAX_DIM) {
    // fall back to old seamless tile
    const legacy = await getSeamlessTileUrl(img, axis, cache)
    return legacy
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
  const easeCos = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t))

  // Tunables (match SW as close as possible).
  const blurMax = 16 * dpr
  const darkMax = 0.22
  const blurGamma = 1.1
  const darkGamma = 1.25
  const STOP_COUNT = 7

  // Scratch buffers for the blurred pass (edge-clamped) so blur never "pulls in" transparency/black.
  let scratch: HTMLCanvasElement | null = null
  let scratchBlur: HTMLCanvasElement | null = null
  let scratchW = 0
  let scratchH = 0
  let sctx: CanvasRenderingContext2D | null = null
  let sbctx: CanvasRenderingContext2D | null = null

  const ensureScratch = (w: number, h: number) => {
    if (!scratch) scratch = document.createElement('canvas')
    if (!scratchBlur) scratchBlur = document.createElement('canvas')
    if (scratchW === w && scratchH === h && sctx && sbctx) return
    scratchW = w
    scratchH = h
    scratch.width = w
    scratch.height = h
    scratchBlur.width = w
    scratchBlur.height = h
    sctx = scratch.getContext('2d')
    sbctx = scratchBlur.getContext('2d')
    if (!sctx || !sbctx) throw new Error('No 2D context')
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sbctx.imageSmoothingEnabled = true
    sbctx.imageSmoothingQuality = 'high'
  }

  const drawSegmentSharp = (opts: { x: number; y: number; mirror: boolean }) => {
    const { x, y, mirror } = opts
    ctx.save()
    ctx.filter = 'none'
    // Clip each segment to prevent any canvas filter/AA from bleeding into neighbors.
    ctx.beginPath()
    ctx.rect(x, y, segW, segH)
    ctx.clip()

    if (mirror) {
      if (axis === 'x') {
        ctx.translate(x + segW, y)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, iw, ih, 0, 0, segW, segH)
      } else {
        ctx.translate(x, y + segH)
        ctx.scale(1, -1)
        ctx.drawImage(img, 0, 0, iw, ih, 0, 0, segW, segH)
      }
    } else {
      ctx.drawImage(img, 0, 0, iw, ih, x, y, segW, segH)
    }

    ctx.restore()
  }

  const drawBlurOverlay = (opts: {
    x: number
    y: number
    mirror: boolean
    innerTowardCenter: boolean
    s0: number
    s1: number
  }) => {
    const { x, y, mirror, innerTowardCenter, s0, s1 } = opts
    const pad = Math.max(2, Math.ceil(blurMax * 2))
    ensureScratch(segW + pad * 2, segH + pad * 2)

    sctx!.clearRect(0, 0, scratchW, scratchH)
    sbctx!.clearRect(0, 0, scratchW, scratchH)

    // Draw into scratch at (pad,pad).
    sctx!.save()
    if (mirror) {
      if (axis === 'x') {
        sctx!.translate(pad + segW, pad)
        sctx!.scale(-1, 1)
        sctx!.drawImage(img, 0, 0, iw, ih, 0, 0, segW, segH)
      } else {
        sctx!.translate(pad, pad + segH)
        sctx!.scale(1, -1)
        sctx!.drawImage(img, 0, 0, iw, ih, 0, 0, segW, segH)
      }
    } else {
      sctx!.drawImage(img, 0, 0, iw, ih, pad, pad, segW, segH)
    }
    sctx!.restore()

    // Edge-clamp 1px edges outward.
    sctx!.drawImage(scratch!, pad, pad, 1, segH, 0, pad, pad, segH)
    sctx!.drawImage(scratch!, pad + segW - 1, pad, 1, segH, pad + segW, pad, pad, segH)
    sctx!.drawImage(scratch!, 0, pad, scratchW, 1, 0, 0, scratchW, pad)
    sctx!.drawImage(scratch!, 0, pad + segH - 1, scratchW, 1, 0, pad + segH, scratchW, pad)

    // Blur into scratchBlur.
    sbctx!.filter = `blur(${blurMax.toFixed(2)}px)`
    sbctx!.drawImage(scratch!, 0, 0)
    sbctx!.filter = 'none'

    // Apply a smooth "wave" alpha mask (cosine-eased) so the effect starts from the center edge.
    sbctx!.globalCompositeOperation = 'destination-in'
    const innerLocal = innerTowardCenter ? (axis === 'x' ? segW : segH) : 0
    const outerLocal = innerTowardCenter ? 0 : axis === 'x' ? segW : segH

    const innerCoord = pad + innerLocal
    const outerCoord = pad + outerLocal

    const g =
      axis === 'x'
        ? sbctx!.createLinearGradient(innerCoord, 0, outerCoord, 0)
        : sbctx!.createLinearGradient(0, innerCoord, 0, outerCoord)

    for (let si = 0; si < STOP_COUNT; si++) {
      const t = si / (STOP_COUNT - 1)
      const s = s0 + (s1 - s0) * t
      const u = easeCos(s)
      const a = clamp01(Math.pow(u, blurGamma))
      g.addColorStop(t, `rgba(0,0,0,${a.toFixed(4)})`)
    }

    sbctx!.fillStyle = g
    sbctx!.fillRect(0, 0, scratchW, scratchH)
    sbctx!.globalCompositeOperation = 'source-over'

    // Draw masked blurred crop on top of the sharp segment.
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, segW, segH)
    ctx.clip()
    ctx.drawImage(scratchBlur!, pad, pad, segW, segH, x, y, segW, segH)
    ctx.restore()
  }

  const drawDarkOverlay = (opts: {
    x: number
    y: number
    innerTowardCenter: boolean
    s0: number
    s1: number
  }) => {
    const { x, y, innerTowardCenter, s0, s1 } = opts
    const inner = innerTowardCenter ? (axis === 'x' ? x + segW : y + segH) : axis === 'x' ? x : y
    const outer = innerTowardCenter ? (axis === 'x' ? x : y) : axis === 'x' ? x + segW : y + segH
    const g =
      axis === 'x'
        ? ctx.createLinearGradient(inner, 0, outer, 0)
        : ctx.createLinearGradient(0, inner, 0, outer)

    for (let si = 0; si < STOP_COUNT; si++) {
      const t = si / (STOP_COUNT - 1)
      const s = s0 + (s1 - s0) * t
      const u = easeCos(s)
      const a = clamp01(darkMax * Math.pow(u, darkGamma))
      g.addColorStop(t, `rgba(0,0,0,${a.toFixed(4)})`)
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, segW, segH)
    ctx.clip()
    ctx.fillStyle = g
    ctx.fillRect(x, y, segW, segH)
    ctx.restore()
  }

  const segments = 2 * n + 1
  for (let i = 0; i < segments; i++) {
    const dist = Math.abs(i - n)
    const mirror = dist % 2 === 1

    const x = axis === 'x' ? i * segW : 0
    const y = axis === 'y' ? i * segH : 0

    const isCenter = dist === 0
    drawSegmentSharp({ x, y, mirror })
    if (isCenter) continue

    // Normalize effect so it starts at the edges of the center segment (dist=1 inner edge => 0).
    const denom = Math.max(1, n)
    const s0 = clamp01((dist - 1) / denom)
    const s1 = clamp01(dist / denom)

    const innerTowardCenter = i < n // left/top side: inner boundary is the edge closest to the center segment

    drawBlurOverlay({ x, y, mirror, innerTowardCenter, s0, s1 })
    drawDarkOverlay({ x, y, innerTowardCenter, s0, s1 })
  }

  const blobUrl = await canvasToBlobUrl(canvas)
  cache.set(key, blobUrl)
  return blobUrl
}

export async function computeBgUrl(params: {
  imageUrl: string
  imageSize: TImageSize
  imageEl: HTMLImageElement | null
  blobCache: TBlobUrlCache
}) {
  const tileMode = computeTileMode(params.imageSize)

  // Prefer SW tile endpoint so placeholder and final rendering match perfectly across reloads.
  if ((tileMode === 'x' || tileMode === 'y') && tileServiceAvailable()) {
    return {
      bgUrl: tileServiceUrl(params.imageUrl, tileMode),
      tileMode,
      tileRenderMode: 'strip' as const,
    }
  }

  // Fallback: client-side canvas tile (no persistence across reloads).
  let bgUrl = params.imageUrl
  let tileRenderMode: 'repeat' | 'strip' = 'repeat'
  if ((tileMode === 'x' || tileMode === 'y') && params.imageEl) {
    bgUrl = await getFalloffStripUrl(params.imageEl, tileMode, params.blobCache)
    tileRenderMode = 'strip'
  }
  return { bgUrl, tileMode, tileRenderMode }
}
