import { ensureFonts } from '../src/core/fonts'
import { computeLayout, EMPTY_ASSETS } from '../src/core/render'
import { renderPng } from '../src/core/export'
import { resolveHeadline } from '../src/core/text'
import { DEFAULT_STATE, type CardState } from '../src/core/types'
import { loadStickers } from '../src/core/stickers'

/** 回傳排版幾何資料與實際輸出 PNG 的尺寸，給 Playwright 斷言 */
async function runCase(patch: Partial<CardState>) {
  const state = { ...DEFAULT_STATE, ...patch }
  const fontsReady = await ensureFonts(resolveHeadline(state) + state.footer, state.fontStyle)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const { width, height, safe, blocks } = computeLayout(ctx, state)
  const layout = { width, height, safe, blocks: blocks.map(({ role, box, text }) => ({ role, box, text })) }
  const blob = renderPng(canvas, state, EMPTY_ASSETS)
  const bitmap = await createImageBitmap(blob)
  return { fontsReady, layout, png: { width: bitmap.width, height: bitmap.height, bytes: blob.size } }
}

declare global {
  interface Window {
    runCase: typeof runCase
  }
}
window.runCase = runCase

/** 疊加層與背景照片：回傳匯出 PNG 上幾個取樣點的顏色 */
async function runOverlayCase(patch: Partial<CardState>, points: [number, number][]) {
  const state = { ...DEFAULT_STATE, ...patch }
  await ensureFonts(resolveHeadline(state) + state.footer, state.fontStyle)
  // 測試用照片：純藍
  const photo = document.createElement('canvas')
  photo.width = 800
  photo.height = 600
  const pctx = photo.getContext('2d')!
  pctx.fillStyle = '#0000FF'
  pctx.fillRect(0, 0, 800, 600)
  const assets = { photo, stickers: await loadStickers() }
  const blob = renderPng(document.createElement('canvas'), state, assets)
  const bitmap = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = bitmap.width
  c.height = bitmap.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  return {
    stickersLoaded: [...assets.stickers.keys()],
    pixels: points.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)]),
  }
}

declare global {
  interface Window {
    runOverlayCase: typeof runOverlayCase
  }
}
window.runOverlayCase = runOverlayCase
