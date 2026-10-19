import { fitText, type FitOptions, type Measure, type TextLayout } from '../core/layout'
import { fontString, type Typography } from '../core/fonts'
import type { Colors } from '../core/palettes'
import type { CardSize } from '../core/types'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface TextBlock {
  role: 'headline' | 'footer'
  box: Box
  text: TextLayout
  weight: number
  color: string
  /** 「」內文字的顏色 */
  accent: string
  align: 'left' | 'center'
  valign: 'top' | 'center' | 'bottom'
}

export interface TemplateLayout {
  width: number
  height: number
  /** 文字必須落在這個範圍內 */
  safe: Box
  blocks: TextBlock[]
  /** 背景與裝飾，畫在文字之前 */
  background: (ctx: CanvasRenderingContext2D) => void
}

export interface TemplateInput {
  size: CardSize
  headline: string
  footer: string
  colors: Colors
  typo: Typography
  measureWith: (weight: number) => Measure
}

export interface Template {
  label: string
  layout: (input: TemplateInput) => TemplateLayout
}

export function safeBox(size: CardSize): Box {
  return { x: 0, y: size.safeTop, w: size.width, h: size.height - size.safeTop - size.safeBottom }
}

export function fitBlock(
  input: TemplateInput,
  role: TextBlock['role'],
  box: Box,
  opts: Omit<FitOptions, 'maxWidth' | 'maxHeight'>,
  style: Pick<TextBlock, 'color' | 'accent' | 'align' | 'valign'>,
): TextBlock {
  const weight = role === 'headline' ? input.typo.headlineWeight : input.typo.footerWeight
  const text = fitText(
    role === 'headline' ? input.headline : input.footer,
    { maxWidth: box.w, maxHeight: box.h, ...opts },
    input.measureWith(weight),
  )
  return { role, box, text, weight, ...style }
}

/** 文字實際佔用的高度 */
export function blockHeight(block: TextBlock): number {
  return block.text.lines.length * block.text.fontSize * block.text.lineHeight
}

export function drawBlock(ctx: CanvasRenderingContext2D, block: TextBlock, family: string) {
  const { box, text } = block
  const { fontSize, lineHeight, lines } = text
  const lh = fontSize * lineHeight
  const used = lh * lines.length
  const top = block.valign === 'top' ? box.y : block.valign === 'bottom' ? box.y + box.h - used : box.y + (box.h - used) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.font = fontString(block.weight, fontSize, family)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    // 中文字身約佔 em 的 0.88 在 baseline 之上
    const baseline = top + i * lh + (lh - fontSize) / 2 + fontSize * 0.88
    const offset = block.align === 'center' ? (box.w - line.width) / 2 : 0
    for (const c of line.clusters) {
      ctx.fillStyle = c.accent ? block.accent : block.color
      ctx.fillText(c.text, box.x + offset + c.x, baseline)
    }
  })
  ctx.restore()
}
