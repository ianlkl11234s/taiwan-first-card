import { loadImage } from './photo'

/** 貼紙註冊表。available:false 的項目等取得授權圖後再開放 */
export interface StickerDef {
  id: string
  label: string
  src: string
  available: boolean
}

export const STICKERS: StickerDef[] = [
  { id: 'lily', label: '百合花', src: '/stickers/lily.svg', available: true },
  { id: 'sunflower', label: '太陽花', src: '/stickers/sunflower.svg', available: true },
  { id: 'lightstick', label: '手燈', src: '/stickers/lightstick.svg', available: true },
  { id: 'lee-teng-hui', label: '李登輝', src: '', available: false },
  { id: 'workwear', label: '職業穿戴', src: '', available: false },
]

/** 預先載入並 decode 所有可用貼紙；個別失敗就略過，不影響其他貼紙 */
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
