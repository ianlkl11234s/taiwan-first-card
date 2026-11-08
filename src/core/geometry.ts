/**
 * 疊加層與背景照片的純幾何計算（不碰 DOM，方便單元測試）。
 * 座標一律是輸出像素（例如 1080×1080）。
 */
import type { Overlay } from './types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 把 srcW×srcH 的影像以 cover 方式填滿 boxW×boxH。
 * zoom ≥ 1 再放大；offset 為 -1..1，表示往該方向移到「剛好不露邊」的比例，0 為置中。
 */
export function coverRect(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
): Rect {
  const s = Math.max(boxW / srcW, boxH / srcH) * Math.max(1, zoom)
  const w = srcW * s
  const h = srcH * s
  const ox = Math.max(-1, Math.min(1, offsetX))
  const oy = Math.max(-1, Math.min(1, offsetY))
  return { x: (boxW - w) / 2 + (ox * (w - boxW)) / 2, y: (boxH - h) / 2 + (oy * (h - boxH)) / 2, w, h }
}

/** 拖曳 dx、dy（輸出像素）後新的 offset；影像沒有多出來的部分時不動 */
export function panOffset(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
  zoom: number,
  offset: { offsetX: number; offsetY: number },
  dx: number,
  dy: number,
): { offsetX: number; offsetY: number } {
  const { w, h } = coverRect(srcW, srcH, boxW, boxH, zoom)
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  return {
    offsetX: w > boxW ? clamp(offset.offsetX + (2 * dx) / (w - boxW)) : 0,
    offsetY: h > boxH ? clamp(offset.offsetY + (2 * dy) / (h - boxH)) : 0,
  }
}

/** 疊加物件在輸出像素中的中心與邊長（物件一律是正方形框） */
export function overlayBox(o: Overlay, width: number, height: number) {
  return { cx: o.cx * width, cy: o.cy * height, side: o.size * Math.min(width, height) }
}

/** 點 (px, py) 是否落在（旋轉後的）物件框內；先把點逆旋轉回物件座標再判斷 */
export function hitOverlay(o: Overlay, px: number, py: number, width: number, height: number): boolean {
  const { cx, cy, side } = overlayBox(o, width, height)
  const rad = (-o.rotation * Math.PI) / 180
  const dx = px - cx
  const dy = py - cy
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  return Math.abs(lx) <= side / 2 && Math.abs(ly) <= side / 2
}

/** 最上層（陣列最後面）被點到的物件 */
export function overlayAt(overlays: Overlay[], px: number, py: number, width: number, height: number): Overlay | null {
  for (let i = overlays.length - 1; i >= 0; i--) {
    if (hitOverlay(overlays[i], px, py, width, height)) return overlays[i]
  }
  return null
}
