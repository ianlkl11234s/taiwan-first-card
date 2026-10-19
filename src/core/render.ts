/**
 * 預覽與匯出共用的唯一繪製路徑：一律以輸出像素（例如 1080×1080）為座標排版，
 * 只透過 scale 決定畫到多大的 canvas 上，所以預覽與下載的版面完全相同。
 */
import type { Measure } from './layout'
import { FONT_STYLES, fontString } from './fonts'
import { resolveColors } from './palettes'
import { SIZES, type CardState } from './types'
import { resolveHeadline } from './text'
import { TEMPLATES } from '../templates'
import { drawBlock, type TemplateLayout } from '../templates/shared'

function makeMeasure(ctx: CanvasRenderingContext2D, weight: number, family: string): Measure {
  const cache = new Map<string, number>()
  return (text, size) => {
    const key = `${size}|${text}`
    let w = cache.get(key)
    if (w === undefined) {
      ctx.font = fontString(weight, size, family)
      w = ctx.measureText(text).width
      cache.set(key, w)
    }
    return w
  }
}

export function computeLayout(ctx: CanvasRenderingContext2D, state: CardState): TemplateLayout {
  const typo = FONT_STYLES[state.fontStyle]
  return TEMPLATES[state.template].layout({
    size: SIZES[state.size],
    headline: resolveHeadline(state),
    footer: state.footer,
    colors: resolveColors(state),
    typo,
    measureWith: (weight) => makeMeasure(ctx, weight, typo.family),
  })
}

/** scale = canvas 像素 / 輸出像素 */
export function renderCard(ctx: CanvasRenderingContext2D, state: CardState, scale: number): TemplateLayout {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const layout = computeLayout(ctx, state)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  layout.background(ctx)
  const { family } = FONT_STYLES[state.fontStyle]
  for (const block of layout.blocks) drawBlock(ctx, block, family)
  return layout
}
