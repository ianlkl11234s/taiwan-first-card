import { loadImage } from './photo'

/** 圖檔貼紙（等授權圖）。available:false 的項目先顯示為「待授權」 */
export interface StickerDef {
  id: string
  label: string
  src: string
  available: boolean
}

export const STICKERS: StickerDef[] = []

/** emoji 貼紙：交給系統字型繪製，不同裝置外觀可能不同 */
export const EMOJI_STICKERS = ['🗳️', '🌻', '🌸', '❤️', '🫶', '✊', '💪', '🔥', '✨', '⭐', '🎤', '🎵', '📣', '🙌', '👍']

const EMOJI_PREFIX = 'emoji:'

export const emojiStickerId = (emoji: string) => EMOJI_PREFIX + emoji

/** 取出第一個字素（例如 🇹🇼、👍🏽 都算一個），空字串回傳 null */
export function firstGrapheme(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  const seg = new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' }).segment(t)
  return seg[Symbol.iterator]().next().value?.segment ?? null
}

const EMOJI_PX = 512
const emojiCache = new Map<string, HTMLCanvasElement>()

/** 把 emoji 畫成正方形點陣圖並快取；同步執行，render 可以直接呼叫 */
function emojiImage(emoji: string): HTMLCanvasElement {
  let canvas = emojiCache.get(emoji)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = EMOJI_PX
    canvas.height = EMOJI_PX
    const ctx = canvas.getContext('2d')!
    ctx.font = `${EMOJI_PX * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, EMOJI_PX / 2, EMOJI_PX * 0.54)
    emojiCache.set(emoji, canvas)
  }
  return canvas
}

/** 依貼紙 id 取得可繪製的影像：emoji 即時產生，圖檔貼紙從已預載的 map 取 */
export function stickerImage(id: string, loaded: Map<string, HTMLImageElement>): HTMLCanvasElement | HTMLImageElement | null {
  if (id.startsWith(EMOJI_PREFIX)) return emojiImage(id.slice(EMOJI_PREFIX.length))
  return loaded.get(id) ?? null
}

/** 預先載入並 decode 所有可用的圖檔貼紙；個別失敗就略過，不影響其他貼紙 */
export async function loadStickers(): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>()
  await Promise.all(
    STICKERS.filter((s) => s.available).map(async (s) => {
      try {
        map.set(s.id, await loadImage(s.src))
      } catch {
        // 載入失敗的貼紙不畫
      }
    }),
  )
  return map
}
