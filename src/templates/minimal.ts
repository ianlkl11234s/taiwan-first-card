import { fitBlock, safeBox, type Template } from './shared'

/** 黑白極簡：大量留白、清晰字體，標語靠上、副標壓在細線下 */
export const minimal: Template = {
  label: '極簡',
  layout(input) {
    const { size, colors } = input
    const { width, height } = size
    const safe = safeBox(size)
    const unit = Math.min(width, safe.h)
    const pad = unit * 0.11
    const footerH = unit * 0.1
    const lineY = safe.y + safe.h - pad - footerH - unit * 0.04
    const stroke = Math.max(2, unit * 0.003)

    const headline = fitBlock(
      input,
      'headline',
      { x: pad, y: safe.y + pad, w: (width - pad * 2) * 0.92, h: lineY - unit * 0.08 - (safe.y + pad) },
      { minSize: unit * 0.035, maxSize: unit * 0.1, lineHeight: 1.45, balance: true, avoidShortLines: 0.2 },
      { color: colors.ink, accent: colors.accent, align: 'left', valign: 'top' },
    )
    const footer = fitBlock(
      input,
      'footer',
      { x: pad, y: lineY + unit * 0.04, w: width - pad * 2, h: footerH },
      { minSize: unit * 0.025, maxSize: unit * 0.055, lineHeight: 1.3, maxLines: 2, letterSpacingEm: 0.08 },
      { color: colors.ink, accent: colors.accent, align: 'left', valign: 'center' },
    )

    return {
      width,
      height,
      safe,
      blocks: [headline, footer],
      background(ctx) {
        ctx.fillStyle = colors.bg
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = colors.ink
        ctx.fillRect(pad, lineY, width - pad * 2, stroke)
      },
    }
  },
}
