import axios from 'axios'

import { AUTH_SESSION_EXPIRED_EVENT } from '@/features/auth/constants/authEvents'
import { getAcceptLanguage } from '@/features/i18n/services/localePreference'
import { createHttpError, unwrapApiResponse } from '@/services/api/apiResponse'

function getRequiredEnv(key) {
  const value = import.meta.env[key]

  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

const API_BASE_URL = getRequiredEnv('VITE_API_BASE_URL')
const API_TIMEOUT_MS = Number(getRequiredEnv('VITE_API_TIMEOUT_MS'))

if (!Number.isFinite(API_TIMEOUT_MS)) {
  throw new Error('VITE_API_TIMEOUT_MS must be a number')
}

export function buildApiUrl(endpoint) {
  return new URL(endpoint, API_BASE_URL).toString()
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const acceptLanguage = getAcceptLanguage()

  if (typeof config.headers?.set === 'function') {
    config.headers.set('Accept-Language', acceptLanguage)
  } else {
    config.headers = {
      ...config.headers,
      'Accept-Language': acceptLanguage,
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (response.status === 204) {
      return null
    }

    return unwrapApiResponse(response.data)
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
    }

    return Promise.reject(createHttpError(error))
  },
)

export const http = {
  get(endpoint, options) {
    return apiClient.get(endpoint, options)
  },
  post(endpoint, body, options) {
    return apiClient.post(endpoint, body, options)
  },
  put(endpoint, body, options) {
    return apiClient.put(endpoint, body, options)
  },
  patch(endpoint, body, options) {
    return apiClient.patch(endpoint, body, options)
  },
  remove(endpoint, options) {
    return apiClient.delete(endpoint, options)
  },
}
