import { readableOn } from '../core/palettes'
import { fitBlock, safeBox, type Box, type Template } from './shared'

/** 宣言風格：淺底、鮮明強調色、大字、高對比，底部色塊放副標 */
export const declaration: Template = {
  label: '宣言',
  layout(input) {
    const { size, colors } = input
    const { width, height } = size
    const safe = safeBox(size)
    const unit = Math.min(width, safe.h)
    const pad = unit * 0.08
    const bandH = safe.h * 0.2

    const rule: Box = { x: pad, y: safe.y + pad, w: unit * 0.14, h: unit * 0.022 }
    const headlineY = rule.y + rule.h + unit * 0.05
    const headline = fitBlock(
      input,
      'headline',
      { x: pad, y: headlineY, w: width - pad * 2, h: safe.y + safe.h - bandH - pad * 0.8 - headlineY },
      { minSize: unit * 0.04, maxSize: unit * 0.15, lineHeight: 1.28, balance: true, avoidShortLines: 0.2 },
      { color: colors.ink, accent: colors.accent, align: 'left', valign: 'center' },
    )

    // 色塊延伸到底邊（限時動態時會穿過下方不安全區），文字只放在安全區內那一段
    const bandTop = safe.y + safe.h - bandH
    const onAccent = readableOn(colors.accent, colors.bg, colors.ink, '#FFFFFF')
    const footer = fitBlock(
      input,
      'footer',
      { x: pad, y: bandTop + bandH * 0.18, w: width - pad * 2, h: bandH * 0.64 },
      { minSize: unit * 0.03, maxSize: unit * 0.085, lineHeight: 1.2, maxLines: 2, letterSpacingEm: 0.04 },
      { color: onAccent, accent: onAccent, align: 'center', valign: 'center' },
    )

    return {
      width,
      height,
      safe,
      blocks: [headline, footer],
      background(ctx) {
        ctx.fillStyle = colors.bg
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = colors.accent
        ctx.fillRect(rule.x, rule.y, rule.w, rule.h)
        ctx.fillRect(0, bandTop, width, height - bandTop)
      },
    }
  },
}
