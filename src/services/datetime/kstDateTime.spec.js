import { describe, expect, it } from 'vitest'

import {
  createKstDayRange,
  formatKstDate,
  formatKstDateTime,
  formatKstTime,
} from '@/services/datetime/kstDateTime'

describe('kstDateTime', () => {
  it('알림 캘린더 날짜를 KST 반열림 구간으로 변환한다', () => {
    expect(createKstDayRange('2026-08-05')).toEqual({
      end: '2026-08-06T00:00:00+09:00',
      start: '2026-08-05T00:00:00+09:00',
    })
    expect(createKstDayRange('2026-02-30')).toBeNull()
  })

  it('UTC 시각을 한국시간(+09:00) 기준으로 변환한다', () => {
    const utc = '2026-07-30T05:10:47.381100+00:00'

    expect(formatKstDate(utc)).toBe('2026-07-30')
    expect(formatKstTime(utc)).toBe('14:10')
    expect(formatKstDateTime(utc)).toBe('2026-07-30 14:10')
  })

  it('한국시간 경계를 넘어가는 UTC 시각은 다음 날짜로 계산한다', () => {
    const utc = '2026-07-30T15:00:00+00:00'

    expect(formatKstDate(utc)).toBe('2026-07-31')
    expect(formatKstTime(utc)).toBe('00:00')
  })

  it('이미 +09:00 오프셋인 값은 그대로 유지한다', () => {
    const kst = '2026-07-13T09:00:00+09:00'

    expect(formatKstDate(kst)).toBe('2026-07-13')
    expect(formatKstTime(kst)).toBe('09:00')
  })

  it('파싱할 수 없는 값은 안전하게 앞부분을 반환한다', () => {
    expect(formatKstDate('not-a-date')).toBe('not-a-date')
    expect(formatKstTime('')).toBe('')
    expect(formatKstDate(null)).toBe('')
  })
})
