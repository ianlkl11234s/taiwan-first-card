/**
 * 預覽與匯出共用的唯一繪製路徑：一律以輸出像素（例如 1080×1080）為座標排版，
 * 只透過 scale 決定畫到多大的 canvas 上，所以預覽與下載的版面完全相同。
 */
import type { Measure, TextLayout } from './layout'
import { fontString } from './fonts'
import { SIZES, type CardState } from './types'
import { resolveHeadline } from './text'
import { declaration, layoutDeclaration, type Box, type DeclarationLayout } from '../templates/declaration'

function makeMeasure(ctx: CanvasRenderingContext2D, weight: number): Measure {
  const cache = new Map<string, number>()
  return (text, size) => {
    const key = `${size}|${text}`
    let w = cache.get(key)
    if (w === undefined) {
      ctx.font = fontString(weight, size)
      w = ctx.measureText(text).width
      cache.set(key, w)
    }
    return w
  }
}

export function computeLayout(ctx: CanvasRenderingContext2D, state: CardState): DeclarationLayout {
  const { width, height } = SIZES[state.size]
  return layoutDeclaration(
    width,
    height,
    { headline: resolveHeadline(state), footer: state.footer },
    (weight) => makeMeasure(ctx, weight),
  )
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  box: Box,
  weight: number,
  color: string,
  accent: string,
  align: 'left' | 'center',
) {
  const { fontSize, lineHeight, lines } = layout
  const lh = fontSize * lineHeight
  const top = box.y + (box.h - lh * lines.length) / 2
  ctx.font = fontString(weight, fontSize)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  lines.forEach((line, i) => {
    // 中文字身約佔 em 的 0.88 在 baseline 之上
    const baseline = top + i * lh + (lh - fontSize) / 2 + fontSize * 0.88
    const offset = align === 'center' ? (box.w - line.width) / 2 : 0
    for (const c of line.clusters) {
      ctx.fillStyle = c.accent ? accent : color
      ctx.fillText(c.text, box.x + offset + c.x, baseline)
    }
  })
  ctx.restore()
}

/** scale = canvas 像素 / 輸出像素 */
export function renderCard(ctx: CanvasRenderingContext2D, state: CardState, scale: number): DeclarationLayout {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const layout = computeLayout(ctx, state)
  const { colors } = declaration
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, layout.width, layout.height)

  ctx.fillStyle = colors.accent
  ctx.fillRect(layout.rule.x, layout.rule.y, layout.rule.w, layout.rule.h)

  drawText(ctx, layout.headline, layout.headlineBox, declaration.headlineWeight, colors.ink, colors.accent, 'left')

  ctx.fillStyle = colors.accent
  ctx.fillRect(layout.band.x, layout.band.y, layout.band.w, layout.band.h)
  drawText(ctx, layout.footer, layout.footerBox, declaration.footerWeight, colors.onAccent, colors.onAccent, 'center')

  return layout
}
