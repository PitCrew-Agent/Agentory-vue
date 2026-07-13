import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createIncidentPlanRequest } from '@/features/incident/services/incidentPlanApi'
import { http } from '@/services/api/http'

vi.mock('@/services/api/http', () => ({
  http: {
    post: vi.fn(),
  },
}))

describe('incidentPlanApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('알림 id로 대응 계획을 생성하고 작업 로그 초안을 정규화한다', async () => {
    http.post.mockResolvedValue({
      alarm_code: 'ERR-402',
      citations: [{ doc_id: 'manual-1', excerpt: '압력 센서 확인', score: 0.91 }],
      deviations: [
        {
          baseline: 42,
          delta: 13.2,
          incident: 55.2,
          label: '압력',
          metric: 'pressure',
          unit: 'mTorr',
        },
      ],
      equipment_id: 'EQP-A05',
      notification_id: 27,
      occurred_at: '2026-07-13T10:00:00+09:00',
      summary: '압력 위험 기준 초과',
      warnings: [],
      work_log_draft: {
        content: '압력 센서와 진공 배관을 점검합니다.',
        ended_at: null,
        source_notification_id: 27,
        started_at: '2026-07-13T10:02:00+09:00',
        status: '진행중',
        work_type: '긴급수리',
      },
    })

    const plan = await createIncidentPlanRequest(27)

    expect(http.post).toHaveBeenCalledWith('/api/v1/incident-plans', {
      notification_id: 27,
    })
    expect(plan).toMatchObject({
      alarmCode: 'ERR-402',
      equipmentId: 'EQP-A05',
      notificationId: 27,
      workLogDraft: {
        sourceNotificationId: 27,
        status: 'progress',
        workType: '긴급수리',
      },
    })
  })
})
