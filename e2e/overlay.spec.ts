import { expect, test } from '@playwright/test'
import type { CardState } from '../src/core/types'

const overlay = (patch: Partial<CardState['overlays'][number]>): CardState['overlays'][number] => ({
  id: 'x',
  kind: 'sticker',
  src: 'sunflower',
  cx: 0.5,
  cy: 0.5,
  size: 0.3,
  rotation: 0,
  ...patch,
})

test('匯出含背景照片、貼紙與照片框', async ({ page }) => {
  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => 'runOverlayCase' in window)
  const patch: Partial<CardState> = {
    photoBg: { zoom: 1, offsetX: 0, offsetY: 0 },
    overlays: [
      overlay({ id: 's' }),
      overlay({ id: 'p', kind: 'photo', src: 'photo', cx: 0.85, cy: 0.15, size: 0.2, shape: 'circle' }),
    ],
  }
  // (5,5)：背景照片＋遮罩；(540,540)：太陽花中心；(918,162)：照片框中心（無遮罩的純藍）
  const r = await page.evaluate((p) => window.runOverlayCase(p, [[5, 5], [540, 540], [918, 162]]), patch)
  expect(r.stickersLoaded.sort()).toEqual(['lightstick', 'lily', 'sunflower'])
  const [bg, sticker, frame] = r.pixels
  // 遮罩後的藍：沒有紅綠、藍色被壓暗
  expect(bg[0]).toBeLessThan(10)
  expect(bg[2]).toBeGreaterThan(60)
  expect(bg[2]).toBeLessThan(200)
  // 太陽花花心是深咖啡色
  expect(sticker[0]).toBeGreaterThan(sticker[2])
  expect(frame).toEqual([0, 0, 255])
})
