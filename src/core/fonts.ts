/**
 * 字型由 Google Fonts 提供（index.html 的 <link>）。它以 unicode-range 切片，
 * 只有實際用到的字才會下載，所以每次文字改變都要用「實際文字」呼叫 fonts.load，
 * 確認該段文字的切片都到齊才允許匯出。
 */

export const SANS = '"Noto Sans TC", "PingFang TC", "Heiti TC", sans-serif'

export function fontString(weight: number, sizePx: number, family = SANS): string {
  return `${weight} ${sizePx}px ${family}`
}

/** 卡片實際用到的字型（字重必須跟 index.html 請求的一致，否則會默默 fallback） */
const REQUIRED_FONTS = [fontString(900, 100), fontString(700, 100)]

const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️/gu

function webFontDeclared(): boolean {
  for (const face of document.fonts) {
    if (face.family.replace(/["']/g, '') === 'Noto Sans TC') return true
  }
  return false
}

/**
 * 回傳 true 表示 text 需要的字型切片都已載入。
 * Google Fonts 連不上（字型宣告根本不存在）時回傳 false。
 */
export async function ensureFonts(text: string): Promise<boolean> {
  if (!webFontDeclared()) return false
  // emoji 不在任何切片內，交給系統字型
  const sample = text.replace(EMOJI, '') || '台'
  try {
    await Promise.all(REQUIRED_FONTS.map((f) => document.fonts.load(f, sample)))
  } catch {
    return false
  }
  return REQUIRED_FONTS.every((f) => document.fonts.check(f, sample))
}
