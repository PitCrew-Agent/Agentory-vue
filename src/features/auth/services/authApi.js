import { buildApiUrl, http } from '@/services/api/http'

const AUTH_API_PREFIX = '/api/v1/auth'

const authFlowEndpointMap = {
  login: `${AUTH_API_PREFIX}/login`,
  passwordReset: `${AUTH_API_PREFIX}/password-reset`,
}

const authRedirectEndpointMap = {
  login: `${AUTH_API_PREFIX}/login/redirect`,
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
  const redirectEndpoint = authRedirectEndpointMap[flow]

  if (redirectEndpoint) {
    window.location.assign(buildApiUrl(redirectEndpoint))
    return
  }

  const response = await requestAuthUrl(flow)

  if (!response?.authorization_url) {
    throw new Error('Auth redirect URL is missing')
  }

  window.location.assign(response.authorization_url)
}

export async function fetchCurrentAuthUser() {
  return http.get(`${AUTH_API_PREFIX}/me`)
}

export async function refreshAuthTokens() {
  return http.post(`${AUTH_API_PREFIX}/refresh`)
}

export async function logoutAuthSession() {
  return http.post(`${AUTH_API_PREFIX}/logout`)
}
