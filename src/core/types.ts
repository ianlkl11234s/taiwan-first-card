export type SizeId = 'square' | 'portrait' | 'story' | 'landscape'

export interface CardSize {
  label: string
  width: number
  height: number
  /** 會被平台介面蓋住的上下區域（px），重要文字不可放進去；背景色塊可以延伸過去 */
  safeTop: number
  safeBottom: number
}

export const SIZES: Record<SizeId, CardSize> = {
  square: { label: 'IG／Threads 正方形', width: 1080, height: 1080, safeTop: 0, safeBottom: 0 },
  portrait: { label: 'IG 直式貼文', width: 1080, height: 1350, safeTop: 0, safeBottom: 0 },
  // 限時動態上方有頭像列、下方有回覆框
  story: { label: 'IG 限時動態', width: 1080, height: 1920, safeTop: 270, safeBottom: 340 },
  landscape: { label: '橫向社群圖卡', width: 1200, height: 675, safeTop: 0, safeBottom: 0 },
}

export const SIZE_ORDER: SizeId[] = ['square', 'portrait', 'story', 'landscape']

export type EditMode = 'simple' | 'advanced'
export type TemplateId = 'declaration' | 'minimal' | 'gradient' | 'poster'
export type PaletteId = 'taiwan' | 'mono' | 'ocean' | 'night' | 'forest' | 'blossom'
export type FontStyleId = 'heavy' | 'regular' | 'serif'

export interface CardState {
  mode: EditMode
  /** 簡易模式輸入的身分，例如「追星人」 */
  identity: string
  /** 進階模式的完整主標語（可含換行） */
  headline: string
  footer: string
  size: SizeId
  template: TemplateId
  palette: PaletteId
  /** 自訂背景色／文字色；null 表示用配色預設 */
  customBg: string | null
  customInk: string | null
  fontStyle: FontStyleId
  /** 貼紙與照片框，陣列後面的畫在上層 */
  overlays: Overlay[]
  /** 照片當滿版背景時的設定；null 表示不用背景照片 */
  photoBg: PhotoBg | null
}

export interface Overlay {
  id: string
  kind: 'sticker' | 'photo'
  /** 貼紙 id；照片框固定為 'photo' */
  src: string
  /** 中心點，相對卡片寬高的 0–1 比例，切換尺寸後位置仍合理 */
  cx: number
  cy: number
  /** 邊長，相對 min(寬, 高) 的比例 */
  size: number
  /** 旋轉角度（度） */
  rotation: number
  /** 照片框形狀 */
  shape?: 'circle' | 'rounded'
}

export interface PhotoBg {
  /** ≥ 1，在 cover 之上再放大 */
  zoom: number
  /** -1..1，見 geometry.coverRect */
  offsetX: number
  offsetY: number
}

export const FOOTER_PRESETS = ['11/28 先投票', '11/28 不去打工']

export const DEFAULT_STATE: CardState = {
  mode: 'simple',
  identity: '追星人',
  headline: '成為「追星人」前，我先是台灣人',
  footer: FOOTER_PRESETS[0],
  size: 'square',
  template: 'declaration',
  palette: 'taiwan',
  customBg: null,
  customInk: null,
  fontStyle: 'heavy',
  overlays: [],
  photoBg: null,
}
