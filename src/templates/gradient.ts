import { mix, readableOn, withAlpha } from '../core/palettes'
import { fitBlock, safeBox, type Template } from './shared'

/** 漸層風格：柔和漸層、幾何光暈、置中標題，副標放在膠囊裡 */
export const gradient: Template = {
  label: '漸層',
  layout(input) {
    const { size, colors } = input
    const { width, height } = size
    const safe = safeBox(size)
    const unit = Math.min(width, safe.h)
    const pad = unit * 0.1
    const pillH = unit * 0.11
    const pillY = safe.y + safe.h - pad - pillH

    const headline = fitBlock(
      input,
      'headline',
      { x: pad, y: safe.y + pad, w: width - pad * 2, h: pillY - unit * 0.06 - (safe.y + pad) },
      { minSize: unit * 0.04, maxSize: unit * 0.13, lineHeight: 1.3, balance: true, avoidShortLines: 0.2 },
      { color: colors.ink, accent: colors.accent, align: 'center', valign: 'center' },
    )
    const onAccent = readableOn(colors.accent, colors.bg, colors.ink, '#FFFFFF')
    const footer = fitBlock(
      input,
      'footer',
      { x: pad + pillH * 0.6, y: pillY + pillH * 0.18, w: width - pad * 2 - pillH * 1.2, h: pillH * 0.64 },
      { minSize: unit * 0.025, maxSize: unit * 0.055, lineHeight: 1.2, maxLines: 1, letterSpacingEm: 0.04 },
      { color: onAccent, accent: onAccent, align: 'center', valign: 'center' },
    )
    // 膠囊寬度貼合文字
    const textW = Math.max(...footer.text.lines.map((l) => l.width), 0)
    const pillW = Math.min(width - pad * 2, textW + pillH * 1.2)

    return {
      width,
      height,
      safe,
      blocks: [headline, footer],
      background(ctx) {
        const g = ctx.createLinearGradient(0, 0, width, height)
        g.addColorStop(0, colors.bg)
        g.addColorStop(1, mix(colors.bg, colors.accent, 0.22))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)

        const glow = (x: number, y: number, r: number, alpha: number) => {
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
          rg.addColorStop(0, withAlpha(colors.accent, alpha))
          rg.addColorStop(1, withAlpha(colors.accent, 0))
          ctx.fillStyle = rg
          ctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
        glow(width * 0.88, height * 0.12, unit * 0.6, 0.35)
        glow(width * 0.08, height * 0.9, unit * 0.5, 0.25)

        ctx.strokeStyle = withAlpha(colors.ink, 0.12)
        ctx.lineWidth = Math.max(2, unit * 0.004)
        ctx.beginPath()
        ctx.arc(width * 0.82, height * 0.22, unit * 0.22, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(width * 0.15, height * 0.78, unit * 0.12, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = colors.accent
        ctx.beginPath()
        ctx.roundRect((width - pillW) / 2, pillY, pillW, pillH, pillH / 2)
        ctx.fill()
      },
    }
  },
}
