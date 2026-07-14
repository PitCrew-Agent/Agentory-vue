export function isApiResponse(payload) {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    typeof payload.success === 'boolean' &&
    typeof payload.code === 'string' &&
    Object.hasOwn(payload, 'result')
  )
}

export function createApiResponseError(payload, status) {
  const apiError = new Error(payload?.message || payload?.detail || 'API request failed')

  apiError.code = isApiResponse(payload) ? payload.code : undefined
  apiError.data = isApiResponse(payload) ? payload.result : payload
  apiError.response = payload
  apiError.status = status

  return apiError
}

export function unwrapApiResponse(payload) {
  if (!isApiResponse(payload)) {
    return payload
  }

  if (!payload.success) {
    throw createApiResponseError(payload)
  }

  return payload.result
}

export function createHttpError(error) {
  const apiError = createApiResponseError(error.response?.data, error.response?.status)

  apiError.cause = error

  return apiError
}
