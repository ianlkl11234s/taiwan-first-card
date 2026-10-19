import type { CardState, PaletteId } from './types'

export interface Colors {
  bg: string
  ink: string
  accent: string
}

export const PALETTES: Record<PaletteId, Colors & { label: string }> = {
  taiwan: { label: '台灣紅', bg: '#F4EDE1', ink: '#1B1B1B', accent: '#C8102E' },
  mono: { label: '黑白', bg: '#FFFFFF', ink: '#111111', accent: '#111111' },
  ocean: { label: '海藍', bg: '#EAF1F7', ink: '#0B2545', accent: '#1F5FBF' },
  night: { label: '夜空', bg: '#121821', ink: '#F4F1EA', accent: '#FFC83D' },
  forest: { label: '山林', bg: '#EDF2E8', ink: '#1E3527', accent: '#2F8A57' },
  blossom: { label: '櫻粉', bg: '#FBEFF3', ink: '#3B1D2B', accent: '#D6336C' },
}

export const PALETTE_ORDER = Object.keys(PALETTES) as PaletteId[]

export function resolveColors(state: CardState): Colors {
  const p = PALETTES[state.palette]
  return { bg: state.customBg ?? p.bg, ink: state.customInk ?? p.ink, accent: p.accent }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG 相對亮度 */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 從候選色中挑出在 background 上對比最高的 */
export function readableOn(background: string, ...candidates: string[]): string {
  return candidates.reduce((best, c) => (contrast(background, c) > contrast(background, best) ? c : best))
}

export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a)
  const cb = rgb(b)
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 把 color 往 toward 方向混，直到在 background 上的對比達到 min（保留色相，不直接換色） */
export function liftContrast(color: string, background: string, toward: string, min = 3): string {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(color, toward, t)
    if (contrast(c, background) >= min) return c
  }
  return toward
}
