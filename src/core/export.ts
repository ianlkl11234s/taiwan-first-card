/**
 * 儲存／分享。重點：navigator.share 必須在點擊的同一個同步流程內呼叫，
 * Safari 會在 toBlob 的非同步 callback 後丟掉使用者手勢，所以這裡用
 * toDataURL 同步產出 PNG。
 */
import { renderCard, type RenderAssets } from './render'
import { SIZES, type CardState } from './types'

/** 匯出：含背景照片與疊加層，不畫選取框 */
export function renderPng(canvas: HTMLCanvasElement, state: CardState, assets: RenderAssets): Blob {
  const { width, height } = SIZES[state.size]
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  renderCard(ctx, state, 1, assets)
  const url = canvas.toDataURL('image/png')
  const bin = atob(url.slice(url.indexOf(',') + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/png' })
}

export function fileName(state: CardState): string {
  const { width, height } = SIZES[state.size]
  return `taiwan-first-${width}x${height}.png`
}

/** Threads（Barcelona）、IG、FB、LINE、微信等 App 內建瀏覽器 */
export function isInAppBrowser(ua = navigator.userAgent): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Barcelona|Threads|MicroMessenger/i.test(ua)
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}

export type SaveResult = 'shared' | 'cancelled' | 'downloaded' | 'needs-manual'

/**
 * 手機：系統分享選單（可直接「儲存影像」到相簿或分享到 IG）
 * 桌面：<a download>
 * 都不行（多半是 App 內建瀏覽器）：回傳 needs-manual，由 UI 顯示長按存圖
 */
export async function saveImage(blob: Blob, name: string): Promise<SaveResult> {
  const file = new File([blob], name, { type: 'image/png' })
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      return 'needs-manual'
    }
  }
  if (isTouchDevice() || isInAppBrowser()) return 'needs-manual'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** 複製文字：有 Clipboard API 就用，否則（或失敗時）退回 execCommand；都失敗回傳 false */
export async function copyText(text: string): Promise<boolean> {
  // App 內建瀏覽器常沒有 clipboard，這時要在點擊的同步流程內直接 execCommand，才不會失去使用者手勢
  if (!navigator.clipboard?.writeText) return execCopy(text)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return execCopy(text)
  }
}

function execCopy(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  ta.remove()
  return ok
}
