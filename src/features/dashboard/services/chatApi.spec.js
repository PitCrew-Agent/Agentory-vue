import { beforeEach, describe, expect, it, vi } from 'vitest'

const { remove } = vi.hoisted(() => ({
  remove: vi.fn(),
}))

vi.mock('@/services/api/http', () => ({
  buildApiUrl: vi.fn((endpoint) => endpoint),
  http: {
    get: vi.fn(),
    post: vi.fn(),
    remove,
  },
}))

import { deleteChatSession } from '@/features/dashboard/services/chatApi'

describe('chatApi', () => {
  beforeEach(() => {
    remove.mockReset()
  })

  it('대화 히스토리 삭제 API를 호출한다', async () => {
    remove.mockResolvedValue(null)

    await deleteChatSession('session id')

    expect(remove).toHaveBeenCalledWith('/api/v1/chat/sessions/session%20id')
  })
})
