export const IMAGE_NUMBER_MIN = 1
export const IMAGE_NUMBER_MAX = 82
export const IMAGE_NUMBER_PAD = 2

export const DEFAULT_IMAGE_EXT = 'jpg'
export const IMAGE_EXT_BY_NUMBER: Record<number, string> = {}

export const RECENT_IMAGES_LIMIT = 10
export const RANDOM_MAX_ATTEMPTS = 10
export const RESIZE_DEBOUNCE_MS = 100
export const INITIAL_UPGRADE_DELAY_MS = 250
export const ROTATE_INTERVAL_MS = 7000

export const BLOB_CACHE_LIMIT = 24

export const STORAGE_KEYS = {
  recent: 'lissikk:recentImageUrls:v1',
  last: 'lissikk:lastImageUrl:v1',
  lastMeta: 'lissikk:lastImageMeta:v1', // { url, width, height }
} as const
