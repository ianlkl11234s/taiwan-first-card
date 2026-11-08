import { describe, expect, it } from 'vitest'
import { buildHeadline, cleanIdentity, HEADLINE_PRESETS, inviteText } from './text'

describe('buildHeadline', () => {
  it('wraps the identity', () => {
    expect(buildHeadline('追星人')).toBe('成為「追星人」前，我先是台灣人')
  })

  it.each([
    ['「追星人」', '追星人'],
    ['成為追星人前', '追星人'],
    ['  工程師  ', '工程師'],
    ['K-pop 粉絲', 'K-pop 粉絲'],
  ])('cleans %s', (raw, expected) => {
    expect(cleanIdentity(raw)).toBe(expected)
  })

  it('falls back when empty', () => {
    expect(buildHeadline('「」')).toBe('成為「追星人」前，我先是台灣人')
  })
})

describe('HEADLINE_PRESETS', () => {
  it('uses balanced, non-nested 「」', () => {
    for (const g of HEADLINE_PRESETS) {
      for (const p of g.presets) expect(p).toMatch(/^[^「」]*(「[^「」]+」[^「」]*)+$/)
    }
  })
})

describe('inviteText', () => {
  it('uses the cleaned identity and falls back', () => {
    expect(inviteText('「工程師」', 'https://x.dev')).toBe('11/28 我是工程師\n一起做圖吧 讓大家記得投票🗳️\nhttps://x.dev')
    expect(inviteText('', 'o')).toContain('我是追星人')
  })
})
