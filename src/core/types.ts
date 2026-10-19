export type SizeId = 'square' | 'portrait' | 'story' | 'landscape'

export const SIZES: Record<SizeId, { label: string; width: number; height: number }> = {
  square: { label: 'IG／Threads 正方形', width: 1080, height: 1080 },
  portrait: { label: 'IG 直式貼文', width: 1080, height: 1350 },
  story: { label: 'IG 限時動態', width: 1080, height: 1920 },
  landscape: { label: '橫向社群圖卡', width: 1200, height: 675 },
}

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
