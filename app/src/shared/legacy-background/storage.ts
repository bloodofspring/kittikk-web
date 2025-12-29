import { STORAGE_KEYS } from './constants'
import type { TImageSize, TLastImageMeta } from './types'

export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeStorageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeJsonParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isImageSize(v: unknown): v is TImageSize {
  if (!v || typeof v !== 'object') return false
  const maybe = v as { width?: unknown; height?: unknown }
  return typeof maybe.width === 'number' && typeof maybe.height === 'number'
}

export function parseLastMeta(raw: string | null): TLastImageMeta | null {
  const v = safeJsonParse(raw)
  if (!v || typeof v !== 'object') return null
  const maybe = v as { url?: unknown; width?: unknown; height?: unknown }
  if (typeof maybe.url !== 'string') return null
  if (typeof maybe.width !== 'number') return null
  if (typeof maybe.height !== 'number') return null
  return { url: maybe.url, width: maybe.width, height: maybe.height }
}

export function persistLastMeta(url: string | null, size: TImageSize | null) {
  if (!url || !size) return
  if (!isImageSize(size)) return
  safeStorageSet(
    STORAGE_KEYS.lastMeta,
    JSON.stringify({ url, width: size.width, height: size.height }),
  )
}
