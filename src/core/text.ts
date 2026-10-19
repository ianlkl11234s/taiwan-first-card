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
