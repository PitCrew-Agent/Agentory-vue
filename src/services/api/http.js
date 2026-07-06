const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function joinEndpoint(baseUrl, endpoint) {
  if (!baseUrl || /^https?:\/\//.test(endpoint)) {
    return endpoint
  }

  return `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
}

function buildUrl(endpoint, params) {
  const origin = globalThis.location?.origin ?? 'http://localhost'
  const url = new URL(joinEndpoint(API_BASE_URL, endpoint), origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (response.status === 204) {
    return null
  }

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

export async function apiRequest(endpoint, options = {}) {
  const { params, headers, body, ...requestOptions } = options
  const requestHeaders = new Headers(headers)
  const hasJsonBody = body !== undefined && body !== null && !(body instanceof FormData)

  if (hasJsonBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(endpoint, params), {
    ...requestOptions,
    headers: requestHeaders,
    body: hasJsonBody ? JSON.stringify(body) : body,
  })
  const data = await parseResponse(response)

  if (!response.ok) {
    const error = new Error('API request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export const http = {
  get(endpoint, options) {
    return apiRequest(endpoint, { ...options, method: 'GET' })
  },
  post(endpoint, body, options) {
    return apiRequest(endpoint, { ...options, method: 'POST', body })
  },
  put(endpoint, body, options) {
    return apiRequest(endpoint, { ...options, method: 'PUT', body })
  },
  patch(endpoint, body, options) {
    return apiRequest(endpoint, { ...options, method: 'PATCH', body })
  },
  remove(endpoint, options) {
    return apiRequest(endpoint, { ...options, method: 'DELETE' })
  },
}
