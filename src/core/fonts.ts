/**
 * 字型由 Google Fonts 提供（index.html 的 <link>）。它以 unicode-range 切片，
 * 只有實際用到的字才會下載，所以每次文字改變都要用「實際文字」呼叫 fonts.load，
 * 確認該段文字的切片都到齊才允許匯出。
 */
import type { FontStyleId } from './types'

export interface Typography {
  label: string
  /** Google Fonts 的 family 名稱 */
  webFamily: string
  family: string
  /** 字重必須跟 index.html 請求的一致，否則會默默 fallback */
  headlineWeight: number
  footerWeight: number
}

const SANS = '"Noto Sans TC", "PingFang TC", "Heiti TC", sans-serif'
const SERIF = '"Noto Serif TC", "Songti TC", "PMingLiU", serif'

export const FONT_STYLES: Record<FontStyleId, Typography> = {
  heavy: { label: '粗黑體', webFamily: 'Noto Sans TC', family: SANS, headlineWeight: 900, footerWeight: 700 },
  regular: { label: '一般黑體', webFamily: 'Noto Sans TC', family: SANS, headlineWeight: 500, footerWeight: 500 },
  serif: { label: '明體', webFamily: 'Noto Serif TC', family: SERIF, headlineWeight: 900, footerWeight: 700 },
}

export const FONT_STYLE_ORDER = Object.keys(FONT_STYLES) as FontStyleId[]

export function fontString(weight: number, sizePx: number, family: string): string {
  return `${weight} ${sizePx}px ${family}`
}

const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f/gu

function webFontDeclared(family: string): boolean {
  for (const face of document.fonts) {
    if (face.family.replace(/["']/g, '') === family) return true
  }
  return false
}

/**
 * 回傳 true 表示 text 需要的字型切片都已載入。
 * Google Fonts 連不上（字型宣告根本不存在）時回傳 false。
 */
export async function ensureFonts(text: string, style: FontStyleId): Promise<boolean> {
  const typo = FONT_STYLES[style]
  if (!webFontDeclared(typo.webFamily)) return false
  const fonts = [fontString(typo.headlineWeight, 100, typo.family), fontString(typo.footerWeight, 100, typo.family)]
  // emoji 不在任何切片內，交給系統字型
  const sample = text.replace(EMOJI, '') || '台'
  try {
    await Promise.all(fonts.map((f) => document.fonts.load(f, sample)))
  } catch {
    return false
  }
  return fonts.every((f) => document.fonts.check(f, sample))
}
