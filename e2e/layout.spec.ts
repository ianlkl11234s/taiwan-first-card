import { expect, test, type Page } from '@playwright/test'
import type { CardState, FontStyleId, SizeId, TemplateId } from '../src/core/types'

const SIZES: SizeId[] = ['square', 'portrait', 'story', 'landscape']
const TEMPLATES: TemplateId[] = ['declaration', 'minimal', 'gradient', 'poster']
const FONT_STYLES: FontStyleId[] = ['regular', 'serif']

const CASES: Record<string, Partial<CardState>> = {
  預設: {},
  短身分: { identity: '人' },
  長身分: { identity: '每天加班到半夜還要回訊息的資深軟體工程師' },
  中英混排: { identity: 'K-pop 粉絲 & Swiftie' },
  emoji: { identity: '追星人 🎤💖👩‍👩‍👧🇹🇼' },
  長英文單字: { identity: 'Supercalifragilisticexpialidocious' },
  進階長文: {
    mode: 'advanced',
    headline: '成為「超級無敵喜歡看棒球的中華職棒球迷」前，我先是台灣人。不管你是誰、在哪裡工作，這一天都很重要。',
    footer: '11/28 不去打工，回家投票',
  },
  進階換行: { mode: 'advanced', headline: '第一行\n\n第三行「強調」', footer: '11/28' },
}

const inside = (inner: { x: number; y: number; w: number; h: number }, outer: typeof inner) =>
  inner.x >= outer.x - 0.5 &&
  inner.y >= outer.y - 0.5 &&
  inner.x + inner.w <= outer.x + outer.w + 0.5 &&
  inner.y + inner.h <= outer.y + outer.h + 0.5

async function check(page: Page, patch: Partial<CardState>) {
  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => 'runCase' in window)
  const r = await page.evaluate((p) => window.runCase(p), patch)
  const L = r.layout

  expect(r.fontsReady).toBe(true)
  expect(r.png).toMatchObject({ width: L.width, height: L.height })
  expect(r.png.bytes).toBeGreaterThan(10_000) // 不是空白圖

  for (const { role, box, text } of L.blocks) {
    expect(inside(box, L.safe), `${role} 框在安全區內`).toBe(true)
    expect(text.overflow, `${role} 沒有溢出`).toBe(false)
    expect(text.lines.length * text.fontSize * text.lineHeight).toBeLessThanOrEqual(box.h + 0.5)
    for (const line of text.lines) expect(line.width).toBeLessThanOrEqual(box.w + 0.5)
  }
}

for (const template of TEMPLATES) {
  for (const size of SIZES) {
    for (const [name, patch] of Object.entries(CASES)) {
      test(`${template}／${size}／${name}`, ({ page }) => check(page, { ...patch, template, size }))
    }
  }
}

for (const fontStyle of FONT_STYLES) {
  for (const template of TEMPLATES) {
    for (const name of ['預設', '進階長文']) {
      test(`字體 ${fontStyle}／${template}／${name}`, ({ page }) =>
        check(page, { ...CASES[name], template, fontStyle, size: 'story' }))
    }
  }
}
