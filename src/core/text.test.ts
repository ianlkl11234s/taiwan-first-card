import { describe, expect, it } from 'vitest'
import { buildHeadline, cleanIdentity } from './text'

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
