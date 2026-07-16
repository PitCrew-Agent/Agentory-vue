import { describe, expect, it } from 'vitest'

import { formatLineLabel } from '@/features/i18n/utils/formatLineLabel'

describe('formatLineLabel', () => {
  it.each([
    ['A라인', 'A Line'],
    ['A-Line', 'A Line'],
    ['ALine', 'A Line'],
  ])('영문 환경에서 %s 표기를 %s으로 정규화한다', (source, expected) => {
    expect(formatLineLabel(source, 'en')).toBe(expected)
  })

  it('한국어 환경에서는 서버 표기를 유지한다', () => {
    expect(formatLineLabel('A라인', 'ko')).toBe('A라인')
  })
})
