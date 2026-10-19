import { contrast, liftContrast, luminance } from '../core/palettes'
import { fitBlock, safeBox, type Template } from './shared'

/** 海報風格：深色背景、亮色點綴、超大字，副標用強調色壓在粗線下 */
export const poster: Template = {
  label: '海報',
  layout(input) {
    const { size, colors } = input
    const { width, height } = size
    const safe = safeBox(size)
    const unit = Math.min(width, safe.h)
    const pad = unit * 0.07
    // 配色本身是淺底時反轉，確保永遠是深色背景
    const [dark, light] = luminance(colors.bg) < luminance(colors.ink) ? [colors.bg, colors.ink] : [colors.ink, colors.bg]
    // 強調色和背景幾乎同色（例如黑白配色）時直接用亮色，否則調亮到看得清楚但保留色相
    const accent = contrast(colors.accent, dark) < 1.5 ? light : liftContrast(colors.accent, dark, light)
    const footerH = unit * 0.13
    const barH = unit * 0.025
    const barY = safe.y + safe.h - pad - footerH - unit * 0.03 - barH

    const headline = fitBlock(
      input,
      'headline',
      { x: pad, y: safe.y + pad * 1.6, w: width - pad * 2, h: barY - unit * 0.05 - (safe.y + pad * 1.6) },
      { minSize: unit * 0.045, maxSize: unit * 0.19, lineHeight: 1.18, balance: true, avoidShortLines: 0.4 },
      { color: light, accent, align: 'left', valign: 'bottom' },
    )
    const footer = fitBlock(
      input,
      'footer',
      { x: pad, y: barY + barH + unit * 0.03, w: width - pad * 2, h: footerH },
      { minSize: unit * 0.03, maxSize: unit * 0.1, lineHeight: 1.15, maxLines: 2 },
      { color: accent, accent, align: 'left', valign: 'top' },
    )

    return {
      width,
      height,
      safe,
      blocks: [headline, footer],
      background(ctx) {
        ctx.fillStyle = dark
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = accent
        ctx.fillRect(pad, barY, unit * 0.32, barH)
        // 右上角點陣
        const dot = unit * 0.008
        const gap = unit * 0.035
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.beginPath()
            ctx.arc(width - pad - c * gap, safe.y + pad + r * gap, dot, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      },
    }
  },
}
