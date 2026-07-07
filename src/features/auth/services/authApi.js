import { http } from '@/services/api/http'

import {
  clearAuthTokens,
  getRefreshTokenPayload,
  writeAuthTokens,
} from '@/features/auth/services/authTokenStorage'

const AUTH_API_PREFIX = '/api/v1/auth'

const authFlowEndpointMap = {
  login: `${AUTH_API_PREFIX}/login`,
  passwordReset: `${AUTH_API_PREFIX}/password-reset`,
  signup: `${AUTH_API_PREFIX}/signup`,
}

function getAuthFlowEndpoint(flow) {
  const endpoint = authFlowEndpointMap[flow]

  if (!endpoint) {
    throw new Error(`Unknown auth flow: ${flow}`)
  }

  return endpoint
}

export async function requestAuthUrl(flow) {
  return http.get(getAuthFlowEndpoint(flow))
}

export async function redirectToAuthFlow(flow) {
  const response = await requestAuthUrl(flow)

  if (!response?.authorization_url) {
    throw new Error('Authorization URL is missing')
  }

  window.location.assign(response.authorization_url)
}

export async function fetchCurrentAuthUser() {
  return http.get(`${AUTH_API_PREFIX}/me`)
}

export async function refreshAuthTokens() {
  const response = await http.post(`${AUTH_API_PREFIX}/refresh`, getRefreshTokenPayload())
  writeAuthTokens(response)

  return response
}

export async function logoutAuthSession() {
  const response = await http.post(`${AUTH_API_PREFIX}/logout`, getRefreshTokenPayload())
  clearAuthTokens()

  return response
}
