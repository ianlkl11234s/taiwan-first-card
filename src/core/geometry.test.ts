import { describe, expect, it } from 'vitest'
import { coverRect, hitOverlay, overlayAt, panOffset } from './geometry'
import type { Overlay } from './types'

const sticker = (patch: Partial<Overlay> = {}): Overlay => ({
  id: 'a',
  kind: 'sticker',
  src: 'lily',
  cx: 0.5,
  cy: 0.5,
  size: 0.2,
  rotation: 0,
  ...patch,
})

describe('coverRect', () => {
  it('fills the box and centers by default', () => {
    // 2000×1000 放進 1000×1000：高度貼齊，寬度多出 1000
    expect(coverRect(2000, 1000, 1000, 1000)).toEqual({ x: -500, y: 0, w: 2000, h: 1000 })
  })

  it('offset ±1 aligns an edge without exposing the box', () => {
    expect(coverRect(2000, 1000, 1000, 1000, 1, 1).x).toBe(0)
    expect(coverRect(2000, 1000, 1000, 1000, 1, -1).x).toBe(-1000)
    expect(coverRect(2000, 1000, 1000, 1000, 1, 5).x).toBe(0) // 超出會被夾住
  })

  it('zoom enlarges around the center', () => {
    const r = coverRect(1000, 1000, 1000, 500, 2)
    expect(r).toEqual({ x: -500, y: -750, w: 2000, h: 2000 })
  })
})

describe('panOffset', () => {
  it('moves proportionally to the slack and clamps', () => {
    // 寬度多出 1000，往右拖 250 → offset 0.5
    expect(panOffset(2000, 1000, 1000, 1000, 1, { offsetX: 0, offsetY: 0 }, 250, 99)).toEqual({ offsetX: 0.5, offsetY: 0 })
    expect(panOffset(2000, 1000, 1000, 1000, 1, { offsetX: 0.9, offsetY: 0 }, 9999, 0).offsetX).toBe(1)
  })
})

describe('hitOverlay', () => {
  // 1000×1000 卡片，物件中心 (500, 500)，邊長 200
  it('hits inside the square and misses outside', () => {
    expect(hitOverlay(sticker(), 590, 590, 1000, 1000)).toBe(true)
    expect(hitOverlay(sticker(), 610, 500, 1000, 1000)).toBe(false)
  })

  it('accounts for rotation', () => {
    const rotated = sticker({ rotation: 45 })
    // 未旋轉時 (595, 595) 是角落內；轉 45° 後角落轉到軸上，對角方向只剩 ~70.7
    expect(hitOverlay(sticker(), 595, 595, 1000, 1000)).toBe(true)
    expect(hitOverlay(rotated, 595, 595, 1000, 1000)).toBe(false)
    // 轉 45° 後角落在正右方 500 + 141
    expect(hitOverlay(rotated, 635, 500, 1000, 1000)).toBe(true)
    expect(hitOverlay(sticker(), 635, 500, 1000, 1000)).toBe(false)
  })

  it('uses min(width, height) for size on non-square cards', () => {
    // 1200×675：邊長 0.2×675 = 135
    expect(hitOverlay(sticker(), 600 + 60, 337.5, 1200, 675)).toBe(true)
    expect(hitOverlay(sticker(), 600 + 80, 337.5, 1200, 675)).toBe(false)
  })
})

describe('overlayAt', () => {
  it('returns the topmost hit', () => {
    const list = [sticker({ id: 'below' }), sticker({ id: 'above' })]
    expect(overlayAt(list, 500, 500, 1000, 1000)?.id).toBe('above')
    expect(overlayAt(list, 10, 10, 1000, 1000)).toBeNull()
  })
})
