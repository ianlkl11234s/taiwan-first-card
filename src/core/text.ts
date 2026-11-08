import type { CardState } from './types'

const FALLBACK_IDENTITY = '追星人'

/** 清掉使用者自己打的括號與「成為…前」，避免組出「成為「「追星人」」前」 */
export function cleanIdentity(raw: string): string {
  let s = raw.replace(/[「」『』"“”'‘’]/g, '').replace(/\s+/g, ' ').trim()
  s = s.replace(/^成為\s*/, '').replace(/\s*前$/, '').trim()
  return s
}

export function buildHeadline(identity: string): string {
  const id = cleanIdentity(identity) || FALLBACK_IDENTITY
  return `成為「${id}」前，我先是台灣人`
}

export function resolveHeadline(state: CardState): string {
  return state.mode === 'simple' ? buildHeadline(state.identity) : state.headline
}

export interface HeadlineGroup {
  label: string
  presets: string[]
}

/** 進階模式的標語範本；「」內的字會變成強調色 */
export const HEADLINE_PRESETS: HeadlineGroup[] = [
  {
    label: '追星人',
    presets: [
      '我們 Taiwan 演唱會\n不要一直聽到\n「沃草沃草 妙蛙沃草」',
      '我們投票，\n是希望台灣「還有演唱會」',
      '我們投票，\n是希望「黃牛」不再搶走\n真正粉絲的權益',
    ],
  },
  {
    label: '旅遊',
    presets: ['台灣護照能去的國家，\n不該給「不承認台灣主權」的人用'],
  },
  {
    label: '健保',
    presets: ['台灣人的健保，\n只該給「台灣出生、一直有繳健保費」的人用'],
  },
]

/** 「複製邀請文案」的內容 */
export function inviteText(identity: string, origin: string): string {
  return `11/28 我是${cleanIdentity(identity) || FALLBACK_IDENTITY}\n一起做圖吧 讓大家記得投票🗳️\n${origin}`
}
