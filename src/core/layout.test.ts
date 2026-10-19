import { describe, expect, it } from 'vitest'
import { fitText, toClusters, wrapText, type Measure } from './layout'

// 假量尺：全形字 1em、半形 0.5em，排版邏輯與真實字寬無關
const measure: Measure = (t, size) => (/^[\x20-\x7e]$/.test(t) ? 0.5 : 1) * size
const lineText = (l: { clusters: { text: string }[] }) => l.clusters.map((c) => c.text).join('')

describe('toClusters', () => {
  it('keeps emoji and ZWJ sequences as one cluster', () => {
    expect(toClusters('台👩‍👩‍👧灣🇹🇼').map((c) => c.text)).toEqual(['台', '👩‍👩‍👧', '灣', '🇹🇼'])
  })

  it('marks text inside 「」 as accent, brackets included', () => {
    const cs = toClusters('成為「追星人」前')
    expect(cs.filter((c) => c.accent).map((c) => c.text).join('')).toBe('「追星人」')
  })
})

describe('wrapText', () => {
  it('never starts a line with closing punctuation', () => {
    // 寬 5 字：「成為「追星人」前，我先是台灣人」
    const lines = wrapText('成為「追星人」前，我先是台灣人', 10, 50, measure)
    for (const l of lines) expect('，。」！？').not.toContain(lineText(l)[0])
  })

  it('never ends a line with an opening bracket', () => {
    const lines = wrapText('一二三四「五六七」', 10, 50, measure)
    for (const l of lines) expect(lineText(l).at(-1)).not.toBe('「')
  })

  it('keeps latin words intact and drops the breaking space', () => {
    const lines = wrapText('我是 Taylor Swift 的粉絲', 10, 60, measure)
    expect(lines.map(lineText)).toEqual(['我是 Taylor', 'Swift 的粉絲'])
    for (const l of lines) expect(lineText(l)).toBe(lineText(l).trim())
  })

  it('force-breaks a word longer than the line', () => {
    const lines = wrapText('Supercalifragilistic', 10, 40, measure)
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(l.width).toBeLessThanOrEqual(40)
  })

  it('keeps a 「」 phrase on one line when it fits', () => {
    const lines = wrapText('成為「追星人」前，我先是台灣人', 10, 50, measure).map(lineText)
    expect(lines.some((l) => l.includes('「追星人」'))).toBe(true)
  })

  it('does not split common Chinese words', () => {
    // 寬 6 字：greedy 會切成「我先是台灣人很」+…，「台灣」不能被拆開
    for (const l of wrapText('今天我們都先是台灣人', 10, 50, measure)) {
      expect(lineText(l).endsWith('台')).toBe(false)
    }
  })

  it('pulls a word down instead of leaving a single-character last line', () => {
    const lines = wrapText('成為「追星人」前，我先是台灣人', 10, 70, measure).map(lineText)
    expect(lines.at(-1)!.length).toBeGreaterThan(1)
    expect(lines.at(-1)).toBe('台灣人')
  })

  it('honours explicit newlines', () => {
    expect(wrapText('第一行\n第二行', 10, 1000, measure).map(lineText)).toEqual(['第一行', '第二行'])
  })

  it('includes letter spacing between clusters but not after the last', () => {
    const [line] = wrapText('台灣', 10, 1000, measure, 0.1)
    expect(line.width).toBe(21)
    expect(line.clusters[1].x).toBe(11)
  })
})

describe('fitText', () => {
  const box = { maxWidth: 500, maxHeight: 300, minSize: 20, maxSize: 150, lineHeight: 1.25 }

  it('grows short text up to maxSize', () => {
    expect(fitText('台', box, measure).fontSize).toBe(150)
  })

  it('shrinks long text so every line fits the box', () => {
    const r = fitText('成為「超級無敵喜歡看棒球的中華職棒球迷」前，我先是台灣人', box, measure)
    expect(r.overflow).toBe(false)
    expect(r.lines.length * r.fontSize * r.lineHeight).toBeLessThanOrEqual(300)
    for (const l of r.lines) expect(l.width).toBeLessThanOrEqual(500)
  })

  it('flags overflow instead of exceeding the floor', () => {
    const r = fitText('長'.repeat(2000), box, measure)
    expect(r.overflow).toBe(true)
    expect(r.fontSize).toBe(20)
  })

  it('balance evens out line lengths without adding lines', () => {
    const opts = { ...box, maxWidth: 70, minSize: 10, maxSize: 10 }
    const plain = fitText('一二三四五六七八', opts, measure)
    const balanced = fitText('一二三四五六七八', { ...opts, balance: true }, measure)
    expect(plain.lines.map((l) => l.clusters.length)).toEqual([6, 2])
    expect(balanced.lines.map((l) => l.clusters.length)).toEqual([4, 4])
  })

  it('respects maxLines', () => {
    const r = fitText('十一月二十八日先去投票再說', { ...box, maxLines: 1 }, measure)
    expect(r.lines.length).toBe(1)
  })
})
