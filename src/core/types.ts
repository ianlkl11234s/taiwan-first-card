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

export interface CardState {
  mode: EditMode
  /** 簡易模式輸入的身分，例如「追星人」 */
  identity: string
  /** 進階模式的完整主標語（可含換行） */
  headline: string
  footer: string
  size: SizeId
}

export const FOOTER_PRESETS = ['11/28 先投票', '11/28 不去打工']

export const DEFAULT_STATE: CardState = {
  mode: 'simple',
  identity: '追星人',
  headline: '成為「追星人」前，我先是台灣人',
  footer: FOOTER_PRESETS[0],
  size: 'square',
}
