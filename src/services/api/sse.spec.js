import { afterEach, describe, expect, it, vi } from 'vitest'

import { subscribeToSse } from '@/services/api/sse'

describe('subscribeToSse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch 응답의 SSE 이벤트를 이름과 데이터로 파싱한다', async () => {
    const onEvent = vi.fn()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'id: 12\nevent: notification\ndata: {"id":12,"message":"Cooling anomaly"}\n\n',
          ),
        )
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue({
      body,
      ok: true,
    })

    vi.stubGlobal('fetch', fetchMock)

    const stop = subscribeToSse({
      getUrl: () => '/api/v1/notifications/stream',
      headers: {
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      },
      onEvent,
      reconnectDelayMs: 60_000,
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({
        data: '{"id":12,"message":"Cooling anomaly"}',
        event: 'notification',
        id: '12',
      })
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/stream',
      expect.objectContaining({
        credentials: 'include',
        headers: {
          'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        },
      }),
    )

    stop()
  })
})
