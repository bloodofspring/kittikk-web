export type TImageSize = { width: number; height: number }

export type TTileMode = 'x' | 'y' | null

// How the background image should be applied when tiling is needed.
// - repeat: plain CSS repeating (legacy behavior)
// - strip: a precomposed "strip" that already contains all needed copies/effects for the current viewport
export type TTileRenderMode = 'repeat' | 'strip'

export type TLastImageMeta = {
  url: string
  width: number
  height: number
}

export type TInitCleanup = () => void
