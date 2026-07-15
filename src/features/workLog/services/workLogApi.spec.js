import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkLogRequest, updateWorkLogRequest } from '@/features/workLog/services/workLogApi'
import { http } from '@/services/api/http'

vi.mock('@/services/api/http', () => ({
  http: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

function createApiResponse(overrides = {}) {
  return {
    alarm_code: 'ERR-402',
    completed_at: null,
    completion: null,
    created_at: '2026-07-13T10:00:00+09:00',
    ended_at: null,
    equipment_id: 'EQP-A05',
    id: 15,
    plan: '압력 센서 점검',
    source_notification_id: 27,
    started_at: '2026-07-13T09:00:00+09:00',
    status: '진행중',
    work_type: '긴급수리',
    worker_name: '김억산',
    ...overrides,
  }
}

describe('workLogApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('알림 대응 작업 로그에 원본 알림 id와 작업 유형을 포함한다', async () => {
    http.post.mockResolvedValue(createApiResponse())

    const created = await createWorkLogRequest({
      date: '2026-07-13',
      endedDate: '',
      endedTime: '',
      sourceNotificationId: 27,
      status: 'progress',
      time: '09:00',
      workPlan: '압력 센서 점검',
      workType: '긴급수리',
    })

    expect(http.post).toHaveBeenCalledWith('/api/v1/work-logs', {
      ended_at: null,
      plan: '압력 센서 점검',
      source_notification_id: 27,
      started_at: '2026-07-13T09:00:00',
      status: '진행중',
      work_type: '긴급수리',
    })
    expect(created).toMatchObject({
      equipmentId: 'EQP-A05',
      sourceNotificationId: 27,
      status: 'progress',
      workType: '긴급수리',
    })
  })

  it('작업 로그 수정에서는 계획을 수정하고 완료 내용은 별도 완료 API로 보낸다', async () => {
    http.patch.mockResolvedValue(createApiResponse({ plan: '압력 센서 교체 계획' }))
    http.post.mockResolvedValue(
      createApiResponse({
        completed_at: '2026-07-13T10:00:00+09:00',
        completion: '압력 센서 교체 완료',
        plan: '압력 센서 교체 계획',
        status: '완료',
      }),
    )

    const updated = await updateWorkLogRequest({
      date: '2026-07-13',
      endedDate: '2026-07-13',
      endedTime: '10:00',
      id: 15,
      originalStatus: 'progress',
      sourceNotificationId: 27,
      status: 'complete',
      time: '09:00',
      workPlan: '압력 센서 교체 계획',
      workRecord: '압력 센서 교체 완료',
      workType: '수리점검',
    })

    expect(http.patch).toHaveBeenCalledWith('/api/v1/work-logs/15', {
      ended_at: '2026-07-13T10:00:00',
      plan: '압력 센서 교체 계획',
      started_at: '2026-07-13T09:00:00',
      work_type: '수리점검',
    })
    expect(http.post).toHaveBeenCalledWith('/api/v1/work-logs/15/complete', {
      completion: '압력 센서 교체 완료',
    })
    expect(updated).toMatchObject({
      status: 'complete',
      workPlan: '압력 센서 교체 계획',
      workRecord: '압력 센서 교체 완료',
    })
  })

  it('완료 상태로 작성하면 계획을 만든 뒤 실제 작업 내용을 완료 처리한다', async () => {
    http.post
      .mockResolvedValueOnce(createApiResponse({ plan: '압력 센서 점검', status: '진행중' }))
      .mockResolvedValueOnce(
        createApiResponse({
          completed_at: '2026-07-13T10:00:00+09:00',
          completion: '압력 센서 교체 완료',
          plan: '압력 센서 점검',
          status: '완료',
        }),
      )

    const created = await createWorkLogRequest({
      date: '2026-07-13',
      endedDate: '2026-07-13',
      endedTime: '10:00',
      sourceNotificationId: 27,
      status: 'complete',
      time: '09:00',
      workPlan: '압력 센서 점검',
      workRecord: '압력 센서 교체 완료',
      workType: '수리점검',
    })

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/work-logs',
      expect.objectContaining({
        plan: '압력 센서 점검',
        status: '진행중',
      }),
    )
    expect(http.post).toHaveBeenNthCalledWith(2, '/api/v1/work-logs/15/complete', {
      completion: '압력 센서 교체 완료',
    })
    expect(created).toMatchObject({
      task: '압력 센서 교체 완료',
      workPlan: '압력 센서 점검',
      workRecord: '압력 센서 교체 완료',
    })
  })

  it('이미 완료된 로그를 수정할 때 완료 API를 다시 호출하지 않는다', async () => {
    http.patch.mockResolvedValue(
      createApiResponse({ completion: '기존 완료 기록', plan: '수정 계획', status: '완료' }),
    )

    await updateWorkLogRequest({
      date: '2026-07-13',
      endedDate: '2026-07-13',
      endedTime: '10:00',
      id: 15,
      originalStatus: 'complete',
      status: 'complete',
      time: '09:00',
      workPlan: '수정 계획',
      workRecord: '기존 완료 기록',
      workType: '수리점검',
    })

    expect(http.post).not.toHaveBeenCalled()
  })
})
