import { fitText, type Measure, type TextLayout } from '../core/layout'

/** 宣言風格：米白底、鮮明紅、大字、高對比 */
export const declaration = {
  colors: { bg: '#F4EDE1', ink: '#1B1B1B', accent: '#C8102E', onAccent: '#F4EDE1' },
  headlineWeight: 900,
  footerWeight: 700,
}

export interface CardText {
  headline: string
  footer: string
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface DeclarationLayout {
  width: number
  height: number
  rule: Box
  headlineBox: Box
  headline: TextLayout
  band: Box
  footerBox: Box
  footer: TextLayout
}

/** 版面一律用相對比例，換尺寸時重新排版而不是拉伸 */
export function layoutDeclaration(
  width: number,
  height: number,
  text: CardText,
  measureWith: (weight: number) => Measure,
): DeclarationLayout {
  const unit = Math.min(width, height)
  const pad = unit * 0.08
  const bandH = height * 0.2

  const rule: Box = { x: pad, y: pad, w: unit * 0.14, h: unit * 0.022 }

  const headlineBox: Box = {
    x: pad,
    y: rule.y + rule.h + unit * 0.05,
    w: width - pad * 2,
    h: 0,
  }
  headlineBox.h = height - bandH - pad * 0.8 - headlineBox.y

  const headline = fitText(
    text.headline,
    {
      maxWidth: headlineBox.w,
      maxHeight: headlineBox.h,
      minSize: unit * 0.04,
      maxSize: unit * 0.15,
      lineHeight: 1.28,
      balance: true,
    },
    measureWith(declaration.headlineWeight),
  )

  const band: Box = { x: 0, y: height - bandH, w: width, h: bandH }
  const footerBox: Box = { x: pad, y: band.y + bandH * 0.18, w: width - pad * 2, h: bandH * 0.64 }
  const footer = fitText(
    text.footer,
    {
      maxWidth: footerBox.w,
      maxHeight: footerBox.h,
      minSize: unit * 0.03,
      maxSize: unit * 0.085,
      lineHeight: 1.2,
      maxLines: 2,
      letterSpacingEm: 0.04,
    },
    measureWith(declaration.footerWeight),
  )

  return { width, height, rule, headlineBox, headline, band, footerBox, footer }
}
