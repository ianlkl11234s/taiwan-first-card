/**
 * 預覽與匯出共用的唯一繪製路徑：一律以輸出像素（例如 1080×1080）為座標排版，
 * 只透過 scale 決定畫到多大的 canvas 上，所以預覽與下載的版面完全相同。
 */
import type { Measure } from './layout'
import { FONT_STYLES, fontString } from './fonts'
import { liftContrast, resolveColors } from './palettes'
import { SIZES, type CardState, type Overlay } from './types'
import { coverRect, overlayBox } from './geometry'
import { resolveHeadline } from './text'
import { TEMPLATES } from '../templates'
import { stickerImage } from './stickers'
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

/** render 需要的已 decode 影像；render 本身不做任何非同步載入 */
export type PhotoSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap

export interface RenderAssets {
  photo: PhotoSource | null
  stickers: Map<string, HTMLImageElement>
}

export const EMPTY_ASSETS: RenderAssets = { photo: null, stickers: new Map() }

export interface RenderOptions {
  /** 預覽才傳：在這個物件外畫選取框。匯出與縮圖不傳 */
  selectedId?: string | null
}

function sourceSize(src: PhotoSource): [number, number] {
  return src instanceof HTMLImageElement ? [src.naturalWidth, src.naturalHeight] : [src.width, src.height]
}

/** 是否正在用滿版背景照片（有設定且照片已載入） */
export function hasPhotoBg(state: CardState, assets: RenderAssets): boolean {
  return !!state.photoBg && !!assets.photo
}

function drawPhotoBg(ctx: CanvasRenderingContext2D, state: CardState, photo: PhotoSource) {
  const { width, height } = SIZES[state.size]
  const { zoom, offsetX, offsetY } = state.photoBg!
  const [sw, sh] = sourceSize(photo)
  const r = coverRect(sw, sh, width, height, zoom, offsetX, offsetY)
  ctx.drawImage(photo, r.x, r.y, r.w, r.h)
  // 深色遮罩，下方再加深一點，讓白字在任何照片上都讀得到
  const g = ctx.createLinearGradient(0, 0, 0, height)
  g.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.62)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
}

function drawOverlay(ctx: CanvasRenderingContext2D, o: Overlay, state: CardState, assets: RenderAssets, scale: number) {
  const { width, height } = SIZES[state.size]
  const { cx, cy, side } = overlayBox(o, width, height)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((o.rotation * Math.PI) / 180)
  if (o.kind === 'photo') {
    if (assets.photo) {
      const [sw, sh] = sourceSize(assets.photo)
      const r = coverRect(sw, sh, side, side)
      const path = new Path2D()
      if (o.shape === 'rounded') path.roundRect(-side / 2, -side / 2, side, side, side * 0.16)
      else path.arc(0, 0, side / 2, 0, Math.PI * 2)
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = side * 0.06 * scale
      ctx.fillStyle = '#FFFFFF'
      ctx.fill(path)
      ctx.restore()
      ctx.save()
      ctx.clip(path)
      ctx.drawImage(assets.photo, r.x - side / 2, r.y - side / 2, r.w, r.h)
      ctx.restore()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = side * 0.04
      ctx.stroke(path)
    }
  } else {
    const img = stickerImage(o.src, assets.stickers)
    if (img) {
      // 等比放進正方框
      const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width
      const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height
      const s = side / Math.max(iw, ih)
      const w = iw * s
      const h = ih * s
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
    }
  }
  ctx.restore()
}

function drawSelection(ctx: CanvasRenderingContext2D, o: Overlay, state: CardState, scale: number) {
  const { width, height } = SIZES[state.size]
  const { cx, cy, side } = overlayBox(o, width, height)
  // 線寬以螢幕像素為準，不受輸出尺寸影響
  const px = 1 / scale
  const half = side / 2 + 4 * px
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((o.rotation * Math.PI) / 180)
  ctx.lineWidth = 2 * px
  ctx.setLineDash([8 * px, 6 * px])
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.strokeRect(-half, -half, half * 2, half * 2)
  ctx.lineDashOffset = 7 * px
  ctx.strokeStyle = '#FFFFFF'
  ctx.strokeRect(-half, -half, half * 2, half * 2)
  ctx.setLineDash([])
  const k = 10 * px
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.lineWidth = 1.5 * px
  for (const [x, y] of [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ]) {
    ctx.fillRect(x - k / 2, y - k / 2, k, k)
    ctx.strokeRect(x - k / 2, y - k / 2, k, k)
  }
  ctx.restore()
}

/**
 * scale = canvas 像素 / 輸出像素。全程同步：所有影像都必須事先 decode 好放在 assets。
 * 繪製順序：版型背景 → 背景照片＋遮罩 → 文字 → 疊加層 → 選取框
 */
export function renderCard(
  ctx: CanvasRenderingContext2D,
  state: CardState,
  scale: number,
  assets: RenderAssets = EMPTY_ASSETS,
  opts: RenderOptions = {},
): TemplateLayout {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const layout = computeLayout(ctx, state)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  layout.background(ctx)
  const { family } = FONT_STYLES[state.fontStyle]
  let blocks = layout.blocks
  if (hasPhotoBg(state, assets)) {
    drawPhotoBg(ctx, state, assets.photo!)
    // 照片蓋過整個版型背景，文字一律白色、強調色調亮到在深色上讀得到
    const accent = liftContrast(resolveColors(state).accent, '#000000', '#FFFFFF', 4.5)
    blocks = blocks.map((b) => ({ ...b, color: '#FFFFFF', accent }))
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 12 * scale
    for (const block of blocks) drawBlock(ctx, block, family)
    ctx.restore()
  } else {
    for (const block of blocks) drawBlock(ctx, block, family)
  }
  for (const o of state.overlays) drawOverlay(ctx, o, state, assets, scale)
  const selected = opts.selectedId && state.overlays.find((o) => o.id === opts.selectedId)
  if (selected) drawSelection(ctx, selected, state, scale)
  return layout
}
