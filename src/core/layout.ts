/**
 * Canvas 不會自己換行，這裡是純函式的排版核心：
 * 斷字（grapheme）→ 標註可斷點（避頭尾、英文不拆字）→ 貪婪換行 → 二分搜尋字級。
 * 量字寬由外部注入，方便單元測試。
 */

export type Measure = (text: string, fontSize: number) => number

export interface Cluster {
  text: string
  /** 「」內的字（含括號）用強調色 */
  accent: boolean
}

export interface LaidCluster extends Cluster {
  x: number
}

export interface Line {
  clusters: LaidCluster[]
  width: number
}

export interface TextLayout {
  fontSize: number
  lineHeight: number
  lines: Line[]
  /** 已縮到最小字級仍放不下 */
  overflow: boolean
}

/** 不可出現在行首 */
const NO_LINE_START = new Set([...'，。、；：！？）」』》〉】,.;:!?)]}%…—～・·'])
/** 不可出現在行尾 */
const NO_LINE_END = new Set([...'「『（《〈【([{'])
const WORD_CHAR = /^[\p{Script=Latin}\p{Nd}'’\-_.@#&/]+$/u
const SPACE = /^\s$/

const graphemes = new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' })
const words = new Intl.Segmenter('zh-Hant', { granularity: 'word' })
const HAN_WORD = /^\p{Script=Han}{2,4}$/u

interface Seg extends Cluster {
  /** 所屬中文詞的編號；同一個詞（例如「台灣」）不在中間斷行。-1 表示不受限 */
  word: number
}

function segment(text: string): Seg[] {
  const wordAt = new Map<number, number>()
  for (const w of words.segment(text)) {
    if (!HAN_WORD.test(w.segment)) continue
    for (let i = w.index; i < w.index + w.segment.length; i++) wordAt.set(i, w.index)
  }
  const out: Seg[] = []
  let depth = 0
  for (const g of graphemes.segment(text)) {
    if (g.segment === '「' || g.segment === '『') depth++
    out.push({ text: g.segment, accent: depth > 0, word: wordAt.get(g.index) ?? -1 })
    if ((g.segment === '」' || g.segment === '』') && depth > 0) depth--
  }
  return out
}

export function toClusters(text: string): Cluster[] {
  return segment(text).map(({ text, accent }) => ({ text, accent }))
}

/** 能不能在 cs[i] 之前斷行 */
function canBreakBefore(cs: Seg[], i: number): boolean {
  if (i <= 0) return false
  const prev = cs[i - 1].text
  const cur = cs[i].text
  if (SPACE.test(prev)) return true
  if (SPACE.test(cur)) return false
  if (NO_LINE_START.has(cur) || NO_LINE_END.has(prev)) return false
  if (WORD_CHAR.test(prev) && WORD_CHAR.test(cur)) return false
  // 「」內的詞組視為一個單位，整組放不下一行時才會被強制斷開
  if (cs[i - 1].accent && cs[i].accent) return false
  if (cs[i].word !== -1 && cs[i].word === cs[i - 1].word) return false
  return true
}

function isPunct(t: string): boolean {
  return NO_LINE_START.has(t) || NO_LINE_END.has(t)
}

function trimSpaces(cs: Seg[]): Seg[] {
  let a = 0
  let b = cs.length
  while (a < b && SPACE.test(cs[a].text)) a++
  while (b > a && SPACE.test(cs[b - 1].text)) b--
  return cs.slice(a, b)
}

function rangeWidth(cs: Seg[], fontSize: number, spacing: number, measure: Measure): number {
  const t = trimSpaces(cs)
  return t.reduce((sum, c) => sum + measure(c.text, fontSize), 0) + Math.max(0, t.length - 1) * spacing
}

function placeLine(cs: Seg[], fontSize: number, spacing: number, measure: Measure): Line {
  let x = 0
  const clusters = trimSpaces(cs).map(({ text, accent }) => {
    const laid = { text, accent, x }
    x += measure(text, fontSize) + spacing
    return laid
  })
  return { clusters, width: clusters.length ? x - spacing : 0 }
}

/** 回傳每行的起點 index（貪婪換行） */
function breakParagraph(cs: Seg[], fontSize: number, spacing: number, maxWidth: number, measure: Measure): number[] {
  const starts: number[] = []
  let start = 0
  while (start < cs.length) {
    starts.push(start)
    let width = 0
    let lastBreak = -1
    let end = start
    for (; end < cs.length; end++) {
      if (end > start && canBreakBefore(cs, end)) lastBreak = end
      const next = width + (end > start ? spacing : 0) + measure(cs[end].text, fontSize)
      if (next > maxWidth && end > start && !SPACE.test(cs[end].text)) break
      width = next
    }
    if (end < cs.length) end = lastBreak > start ? lastBreak : Math.max(end, start + 1)
    start = end
    while (start < cs.length && SPACE.test(cs[start].text)) start++
  }
  return starts
}

/** 最後一行只剩一個字時，從上一行拉一個詞下來（避免孤字） */
function fixOrphan(
  cs: Seg[],
  starts: number[],
  fontSize: number,
  spacing: number,
  maxWidth: number,
  measure: Measure,
): number[] {
  if (starts.length < 2) return starts
  const last = starts[starts.length - 1]
  const prev = starts[starts.length - 2]
  const solid = trimSpaces(cs.slice(last)).filter((c) => !isPunct(c.text))
  if (solid.length > 1) return starts
  for (let p = last - 1; p > prev + 1; p--) {
    if (!canBreakBefore(cs, p)) continue
    if (rangeWidth(cs.slice(p), fontSize, spacing, measure) > maxWidth) break
    return [...starts.slice(0, -1), p]
  }
  return starts
}

export function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: Measure,
  letterSpacingEm = 0,
): Line[] {
  const spacing = letterSpacingEm * fontSize
  const lines: Line[] = []
  for (const paragraph of text.split('\n')) {
    const cs = segment(paragraph)
    if (cs.length === 0) {
      lines.push({ clusters: [], width: 0 })
      continue
    }
    const starts = fixOrphan(cs, breakParagraph(cs, fontSize, spacing, maxWidth, measure), fontSize, spacing, maxWidth, measure)
    starts.forEach((s, i) => lines.push(placeLine(cs.slice(s, starts[i + 1] ?? cs.length), fontSize, spacing, measure)))
  }
  return lines
}

export interface FitOptions {
  maxWidth: number
  maxHeight: number
  minSize: number
  maxSize: number
  lineHeight: number
  letterSpacingEm?: number
  maxLines?: number
  /** 字級定案後縮窄行寬到行數不變的最小值，讓各行長度接近、避免最後一行只剩一兩個字 */
  balance?: boolean
}

/** 二分搜尋能放進框內的最大整數字級 */
export function fitText(text: string, opts: FitOptions, measure: Measure): TextLayout {
  const { maxWidth, maxHeight, minSize, maxSize, lineHeight, letterSpacingEm = 0, maxLines = Infinity, balance } = opts
  const tryLayout = (size: number) => {
    const lines = wrapText(text, size, maxWidth, measure, letterSpacingEm)
    const fits =
      lines.length <= maxLines &&
      lines.length * size * lineHeight <= maxHeight &&
      lines.every((l) => l.width <= maxWidth + 0.5)
    return { lines, fits }
  }
  let lo = Math.ceil(minSize)
  let hi = Math.floor(maxSize)
  let best: { size: number; lines: Line[] } | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const r = tryLayout(mid)
    if (r.fits) {
      best = { size: mid, lines: r.lines }
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  if (best) {
    const lines = balance ? balanceLines(text, best.size, best.lines, maxWidth, measure, letterSpacingEm) : best.lines
    return { fontSize: best.size, lineHeight, lines, overflow: false }
  }
  const size = Math.ceil(minSize)
  return { fontSize: size, lineHeight, lines: tryLayout(size).lines, overflow: true }
}

function balanceLines(
  text: string,
  size: number,
  lines: Line[],
  maxWidth: number,
  measure: Measure,
  letterSpacingEm: number,
): Line[] {
  if (lines.length < 2) return lines
  let lo = maxWidth * 0.5
  let hi = maxWidth
  let best = lines
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    const candidate = wrapText(text, size, mid, measure, letterSpacingEm)
    if (candidate.length === lines.length) {
      best = candidate
      hi = mid
    } else {
      lo = mid
    }
  }
  return best
}
