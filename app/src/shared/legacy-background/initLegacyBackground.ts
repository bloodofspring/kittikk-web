/* eslint-disable max-lines */
import {
  INITIAL_UPGRADE_DELAY_MS,
  RANDOM_MAX_ATTEMPTS,
  RECENT_IMAGES_LIMIT,
  RESIZE_DEBOUNCE_MS,
  ROTATE_INTERVAL_MS,
  STORAGE_KEYS,
} from './constants'
import { buildImageUrls } from './images'
import { makeBgKey, setBackgroundStyles, setLayerSharp } from './rendering'
import { registerLegacyServiceWorker } from './serviceWorker'
import {
  parseLastMeta,
  persistLastMeta,
  safeJsonParse,
  safeStorageGet,
  safeStorageSet,
} from './storage'
import {
  computeBgUrl,
  computeTileMode,
  createBlobUrlCache,
  loadImage,
  tileServiceAvailable,
  tileServiceUrl,
} from './tiling'
import type { TImageSize, TInitCleanup, TTileMode, TTileRenderMode } from './types'

export function initLegacyBackground(): void | TInitCleanup {
  // DOM is available here (called from useEffect), so it’s safe to touch window/document.
  registerLegacyServiceWorker()

  const imageUrls = buildImageUrls()

  const bgLayerA = document.getElementById('bg-layer-a') as HTMLElement | null
  const bgLayerB = document.getElementById('bg-layer-b') as HTMLElement | null

  let bgVisibleLayer: HTMLElement | null = bgLayerA && bgLayerB ? bgLayerA : null
  let bgHiddenLayer: HTMLElement | null = bgLayerA && bgLayerB ? bgLayerB : null

  let bgRenderedKey: string | null = null // `${tileMode}|${tileRenderMode}|${bgUrl}`

  const blobCache = createBlobUrlCache()
  const recentImageUrls: string[] = []
  const badImageUrls = new Set<string>()

  let currentImageUrl: string | null = null
  let currentImageSize: TImageSize | null = null
  let currentImageEl: HTMLImageElement | null = null

  // Desktop enables extra effects (blur + overlay). Crossfade is done via opacity on all devices.
  const desktopEffectsMq = window.matchMedia(
    '(hover: hover) and (pointer: fine) and (min-width: 1000px)',
  )

  let desktopEffectsEnabled = desktopEffectsMq.matches

  function syncLayerClasses() {
    if (!bgLayerA || !bgLayerB || !bgVisibleLayer || !bgHiddenLayer) return

    // Visibility is controlled by is-visible (opacity crossfade).
    bgLayerA.classList.toggle('is-visible', bgVisibleLayer === bgLayerA)
    bgLayerB.classList.toggle('is-visible', bgVisibleLayer === bgLayerB)
  }

  function renderImmediate(
    bgUrl: string,
    tileMode: TTileMode,
    tileRenderMode: TTileRenderMode,
    opts: { sharp: boolean },
  ) {
    const key = makeBgKey(bgUrl, tileMode, tileRenderMode)
    if (key === bgRenderedKey) return

    const target = bgVisibleLayer || document.body
    setBackgroundStyles(target, bgUrl, tileMode, tileRenderMode)
    if (bgVisibleLayer) bgVisibleLayer.classList.add('is-visible')
    if (bgVisibleLayer) setLayerSharp(bgVisibleLayer, opts.sharp)
    bgRenderedKey = key
    syncLayerClasses()
  }

  function crossfadeTo(
    bgUrl: string,
    tileMode: TTileMode,
    tileRenderMode: TTileRenderMode,
    opts: { sharp: boolean },
  ) {
    if (!bgVisibleLayer || !bgHiddenLayer) return false

    setBackgroundStyles(bgHiddenLayer, bgUrl, tileMode, tileRenderMode)
    setLayerSharp(bgHiddenLayer, opts.sharp)
    // Crossfade via opacity (CSS handles duration per-device).
    bgHiddenLayer.classList.add('is-visible')

    // next frame: swap classes (prevents any intermediate blank)
    requestAnimationFrame(() => {
      if (!bgVisibleLayer || !bgHiddenLayer) return
      bgVisibleLayer.classList.remove('is-visible')
      const tmp = bgVisibleLayer
      bgVisibleLayer = bgHiddenLayer
      bgHiddenLayer = tmp
      syncLayerClasses()
    })

    return true
  }

  function renderCrossfade(
    bgUrl: string,
    tileMode: TTileMode,
    tileRenderMode: TTileRenderMode,
    opts: { sharp: boolean },
  ) {
    const key = makeBgKey(bgUrl, tileMode, tileRenderMode)
    if (key === bgRenderedKey) return

    if (!crossfadeTo(bgUrl, tileMode, tileRenderMode, opts)) {
      renderImmediate(bgUrl, tileMode, tileRenderMode, opts)
      return
    }

    bgRenderedKey = key
  }

  function applyQuickBackground(imageUrl: string, imageSize: TImageSize | null) {
    const tileMode = computeTileMode(imageSize)
    // "Stub" background:
    // - keep it blurred
    // - but if SW tile endpoint is available, use the same mirrored/seamless tile as the final render
    const tileRenderMode: TTileRenderMode =
      tileMode && (tileMode === 'x' || tileMode === 'y') && tileServiceAvailable()
        ? 'strip'
        : 'repeat'
    const url =
      tileRenderMode === 'strip' && tileMode ? tileServiceUrl(imageUrl, tileMode) : imageUrl
    renderImmediate(url, tileMode, tileRenderMode, { sharp: false })
  }

  function loadStateFromStorage() {
    const recentRaw = safeStorageGet(STORAGE_KEYS.recent)
    const parsed = safeJsonParse(recentRaw)
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((u) => typeof u === 'string' && imageUrls.includes(u))
      recentImageUrls.splice(0, recentImageUrls.length, ...filtered.slice(0, RECENT_IMAGES_LIMIT))
    }
  }

  function persistStateToStorage() {
    safeStorageSet(
      STORAGE_KEYS.recent,
      JSON.stringify(recentImageUrls.slice(0, RECENT_IMAGES_LIMIT)),
    )
    safeStorageSet(STORAGE_KEYS.last, recentImageUrls[0] || '')
    if (recentImageUrls[0] && currentImageUrl === recentImageUrls[0] && currentImageSize) {
      persistLastMeta(currentImageUrl, currentImageSize)
    }
  }

  function rememberRecent(url: string) {
    const idx = recentImageUrls.indexOf(url)
    if (idx !== -1) recentImageUrls.splice(idx, 1)
    recentImageUrls.unshift(url)
    if (recentImageUrls.length > RECENT_IMAGES_LIMIT) recentImageUrls.length = RECENT_IMAGES_LIMIT
    persistStateToStorage()
  }

  function chooseNextImageUrl() {
    const available = imageUrls.filter((u) => !badImageUrls.has(u))
    if (!available.length) return null

    const lastFromStorage = safeStorageGet(STORAGE_KEYS.last)
    const lastShown = recentImageUrls[0] || lastFromStorage || null
    const avoid = new Set([currentImageUrl, lastShown].filter(Boolean))

    const preferred = available.filter((u) => !avoid.has(u) && !recentImageUrls.includes(u))
    const pool1 = preferred.length ? preferred : available.filter((u) => !avoid.has(u))
    const pool = pool1.length ? pool1 : available

    return pool[Math.floor(Math.random() * pool.length)]
  }

  let initialUpgradeTimer: number | null = null
  function applyInitialBackgroundFromStorage() {
    const meta = parseLastMeta(safeStorageGet(STORAGE_KEYS.lastMeta))
    const metaUrl = meta?.url ?? null
    const metaSize = meta ? { width: meta.width, height: meta.height } : null

    const lastFromStorage = safeStorageGet(STORAGE_KEYS.last)
    const url =
      metaUrl && imageUrls.includes(metaUrl)
        ? metaUrl
        : lastFromStorage && imageUrls.includes(lastFromStorage)
          ? lastFromStorage
          : null

    if (!url) return

    applyQuickBackground(url, metaUrl === url ? metaSize : null)
    currentImageUrl = url
    if (metaUrl === url && metaSize) currentImageSize = metaSize

    // Upgrade to seamless tiling in background (won't override if a new image got chosen).
    if (initialUpgradeTimer) window.clearTimeout(initialUpgradeTimer)
    initialUpgradeTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const img = await loadImage(url)
          const size = { width: img.naturalWidth, height: img.naturalHeight }
          if (currentImageUrl !== url) return
          currentImageEl = img
          currentImageSize = size
          persistLastMeta(url, size)
          const { bgUrl, tileMode, tileRenderMode } = await computeBgUrl({
            imageUrl: url,
            imageSize: size,
            imageEl: img,
            blobCache,
          })
          // If seamless URL differs (blob), crossfade it in; if identical, do nothing (prevents "re-apply" flash).
          renderCrossfade(bgUrl, tileMode, tileRenderMode, { sharp: true })
        } catch {
          // ignore
        }
      })()
    }, INITIAL_UPGRADE_DELAY_MS)
  }

  let randomInFlight = false
  async function setRandomBackground() {
    if (randomInFlight) return
    randomInFlight = true
    try {
      const maxAttempts = Math.min(imageUrls.length, RANDOM_MAX_ATTEMPTS)
      let selectedImage: string | null = null

      for (let i = 0; i < maxAttempts; i++) {
        const candidate = chooseNextImageUrl()
        if (!candidate) break
        if (candidate === selectedImage) continue
        selectedImage = candidate
        try {
          const img = await loadImage(selectedImage)
          const size = { width: img.naturalWidth, height: img.naturalHeight }

          currentImageEl = img
          currentImageSize = size
          currentImageUrl = selectedImage

          rememberRecent(selectedImage)

          const { bgUrl, tileMode, tileRenderMode } = await computeBgUrl({
            imageUrl: selectedImage,
            imageSize: size,
            imageEl: img,
            blobCache,
          })
          renderCrossfade(bgUrl, tileMode, tileRenderMode, { sharp: true })
          return
        } catch {
          badImageUrls.add(selectedImage)
        }
      }

      // fallback
      document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))`
    } finally {
      randomInFlight = false
    }
  }

  let resizeTimer: number | null = null
  const onResize = () => {
    if (!currentImageUrl || !currentImageSize) return
    if (resizeTimer) window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      const target = bgVisibleLayer || document.body
      void (async () => {
        const { bgUrl, tileMode, tileRenderMode } = await computeBgUrl({
          imageUrl: currentImageUrl!,
          imageSize: currentImageSize!,
          imageEl: currentImageEl,
          blobCache,
        })
        setBackgroundStyles(target, bgUrl, tileMode, tileRenderMode)
        if (target === bgVisibleLayer || (!bgVisibleLayer && target === document.body)) {
          bgRenderedKey = makeBgKey(bgUrl, tileMode, tileRenderMode)
        }
      })()
    }, RESIZE_DEBOUNCE_MS)
  }

  window.addEventListener('resize', onResize)

  loadStateFromStorage()
  // Show the last image immediately (usually cached) to avoid a flash on refresh.
  applyInitialBackgroundFromStorage()
  void setRandomBackground()

  const onDesktopEffectsChange = (e: MediaQueryListEvent) => {
    desktopEffectsEnabled = e.matches
    syncLayerClasses()
  }
  desktopEffectsMq.addEventListener('change', onDesktopEffectsChange)

  const rotateInterval = window.setInterval(() => {
    if (document.hidden) return
    void setRandomBackground()
  }, ROTATE_INTERVAL_MS)

  const cleanup: TInitCleanup = () => {
    window.removeEventListener('resize', onResize)
    window.clearInterval(rotateInterval)
    if (resizeTimer) window.clearTimeout(resizeTimer)
    if (initialUpgradeTimer) window.clearTimeout(initialUpgradeTimer)
    blobCache.cleanup()
    desktopEffectsMq.removeEventListener('change', onDesktopEffectsChange)
  }

  // Ensure correct initial class state (mobile vs desktop).
  syncLayerClasses()

  return cleanup
}
