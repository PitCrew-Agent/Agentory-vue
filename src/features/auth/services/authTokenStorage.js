const AUTH_TOKEN_STORAGE_KEY = 'agentory.auth.tokens'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function readAuthTokens() {
  if (!canUseStorage()) {
    return null
  }

  const savedTokens = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)

  if (!savedTokens) {
    return null
  }

  try {
    return JSON.parse(savedTokens)
  } catch {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return null
  }
}

export function writeAuthTokens(tokenResponse) {
  if (!canUseStorage() || !tokenResponse?.access_token) {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(tokenResponse))
}

export function clearAuthTokens() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function getAccessToken() {
  return readAuthTokens()?.access_token ?? ''
}

export function getRefreshTokenPayload() {
  const tokens = readAuthTokens()

  return {
    refresh_token: tokens?.refresh_token ?? null,
    refresh_token_handle: tokens?.refresh_token_handle ?? null,
  }
}
