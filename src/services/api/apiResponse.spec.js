import { describe, expect, it } from 'vitest'

import { createHttpError, isApiResponse, unwrapApiResponse } from '@/services/api/apiResponse'

describe('apiResponse', () => {
  it('성공 ApiResponse에서 실제 result를 반환한다', () => {
    const payload = {
      code: 'COMMON200',
      message: '성공입니다',
      result: [{ equipment_id: 'EQP-A01' }],
      success: true,
    }

    expect(isApiResponse(payload)).toBe(true)
    expect(unwrapApiResponse(payload)).toEqual([{ equipment_id: 'EQP-A01' }])
  })

  it('래핑되지 않은 응답은 기존 값을 유지한다', () => {
    const payload = { authorization_url: 'https://login.example.com' }

    expect(isApiResponse(payload)).toBe(false)
    expect(unwrapApiResponse(payload)).toBe(payload)
  })

  it('백엔드 오류 봉투의 코드와 상세 데이터를 보존한다', () => {
    const sourceError = {
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          result: [{ loc: ['body', 'status'] }],
          success: false,
        },
        status: 422,
      },
    }

    const apiError = createHttpError(sourceError)

    expect(apiError.message).toBe('Invalid request')
    expect(apiError.code).toBe('VALIDATION_ERROR')
    expect(apiError.data).toEqual([{ loc: ['body', 'status'] }])
    expect(apiError.status).toBe(422)
  })

  it('기존 detail 인증 오류도 사용자 메시지로 유지한다', () => {
    const apiError = createHttpError({
      response: {
        data: { detail: 'Unauthorized' },
        status: 401,
      },
    })

    expect(apiError.message).toBe('Unauthorized')
    expect(apiError.data).toEqual({ detail: 'Unauthorized' })
  })
})
