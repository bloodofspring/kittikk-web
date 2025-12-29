import {
  DEFAULT_IMAGE_EXT,
  IMAGE_EXT_BY_NUMBER,
  IMAGE_NUMBER_MAX,
  IMAGE_NUMBER_MIN,
  IMAGE_NUMBER_PAD,
} from './constants'

export function buildImageUrl(num: number) {
  const nn = String(num).padStart(IMAGE_NUMBER_PAD, '0')
  const ext = IMAGE_EXT_BY_NUMBER[num] || DEFAULT_IMAGE_EXT
  // Absolute path so it works on nested routes.
  return `/static/img${nn}.${ext}`
}

export function buildImageUrls(): string[] {
  return Array.from({ length: IMAGE_NUMBER_MAX - IMAGE_NUMBER_MIN + 1 }, (_, i) =>
    buildImageUrl(IMAGE_NUMBER_MIN + i),
  )
}
