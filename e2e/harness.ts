import { ensureFonts } from '../src/core/fonts'
import { computeLayout } from '../src/core/render'
import { renderPng } from '../src/core/export'
import { resolveHeadline } from '../src/core/text'
import { DEFAULT_STATE, type CardState } from '../src/core/types'

/** 回傳排版幾何資料與實際輸出 PNG 的尺寸，給 Playwright 斷言 */
async function runCase(patch: Partial<CardState>) {
  const state = { ...DEFAULT_STATE, ...patch }
  const fontsReady = await ensureFonts(resolveHeadline(state) + state.footer, state.fontStyle)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const { width, height, safe, blocks } = computeLayout(ctx, state)
  const layout = { width, height, safe, blocks: blocks.map(({ role, box, text }) => ({ role, box, text })) }
  const blob = renderPng(canvas, state)
  const bitmap = await createImageBitmap(blob)
  return { fontsReady, layout, png: { width: bitmap.width, height: bitmap.height, bytes: blob.size } }
}

declare global {
  interface Window {
    runCase: typeof runCase
  }
}
window.runCase = runCase
