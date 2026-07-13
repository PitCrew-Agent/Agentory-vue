import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createWorkLogRequest,
  updateWorkLogRequest,
} from '@/features/workLog/services/workLogApi'
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
    content: '압력 센서 점검',
    created_at: '2026-07-13T10:00:00+09:00',
    ended_at: null,
    equipment_id: 'EQP-A05',
    id: 15,
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
      task: '압력 센서 점검',
      time: '09:00',
      workType: '긴급수리',
    })

    expect(http.post).toHaveBeenCalledWith('/api/v1/work-logs', {
      content: '압력 센서 점검',
      ended_at: null,
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

  it('작업 로그 수정에서는 변경 불가한 원본 알림 id를 제외한다', async () => {
    http.patch.mockResolvedValue(createApiResponse())

    await updateWorkLogRequest({
      date: '2026-07-13',
      endedDate: '2026-07-13',
      endedTime: '10:00',
      id: 15,
      sourceNotificationId: 27,
      status: 'complete',
      task: '압력 센서 점검 완료',
      time: '09:00',
      workType: '수리점검',
    })

    expect(http.patch).toHaveBeenCalledWith('/api/v1/work-logs/15', {
      content: '압력 센서 점검 완료',
      ended_at: '2026-07-13T10:00:00',
      started_at: '2026-07-13T09:00:00',
      status: '완료',
      work_type: '수리점검',
    })
  })
})
