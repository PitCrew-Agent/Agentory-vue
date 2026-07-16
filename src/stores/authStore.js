import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchCurrentAuthUser, logoutAuthSession } from '@/features/auth/services/authApi'
import { useAssistantStore } from '@/stores/assistantStore'

function createEmptyUser() {
  return {
    assignedLineLabel: '',
    department: '',
    email: '',
    id: null,
    lines: [],
    name: '',
    role: '',
    status: '',
    userId: '',
  }
}

function normalizeLine(line, index) {
  if (typeof line === 'string') {
    return {
      code: line,
      id: index,
      name: line,
    }
  }

  return {
    code: line?.code?.trim?.() ?? '',
    id: line?.id ?? index,
    name: line?.name?.trim?.() ?? line?.code?.trim?.() ?? '',
  }
}

function normalizeAuthUser(nextUser = {}) {
  const email = nextUser.email?.trim?.() ?? ''
  const name = nextUser.name?.trim?.() ?? ''
  const role = nextUser.role?.trim?.() ?? ''
  const lines = Array.isArray(nextUser.lines) ? nextUser.lines.map(normalizeLine) : []
  const assignedLineLabel = lines
    .map((line) => line.name || line.code)
    .filter(Boolean)
    .join(', ')

  return {
    assignedLineLabel,
    department: nextUser.department?.trim?.() || assignedLineLabel || role,
    email,
    id: nextUser.id ?? null,
    lines,
    name: name || email,
    role,
    status: nextUser.status?.trim?.() ?? '',
    userId: nextUser.userId?.trim?.() || email || (nextUser.id ? String(nextUser.id) : ''),
  }
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(createEmptyUser())
  const isAuthenticated = ref(false)
  const isLoaded = ref(false)
  let currentUserRequest = null

  const currentUserName = computed(
    () => currentUser.value.name || currentUser.value.email || '사용자',
  )

  function updateCurrentUser(nextUser) {
    currentUser.value = normalizeAuthUser(nextUser)
  }

  function clearCurrentUser() {
    currentUser.value = createEmptyUser()
  }

  function logoutCurrentUser() {
    useAssistantStore().reset()
    clearCurrentUser()
    isAuthenticated.value = false
    isLoaded.value = true
  }

  async function loadCurrentUser({ force = false } = {}) {
    if (isLoaded.value && !force) {
      return isAuthenticated.value
    }

    if (currentUserRequest) {
      return currentUserRequest
    }

    currentUserRequest = fetchCurrentAuthUser()
      .then((user) => {
        updateCurrentUser(user)
        isAuthenticated.value = true
        return true
      })
      .catch(() => {
        clearCurrentUser()
        isAuthenticated.value = false
        return false
      })
      .finally(() => {
        isLoaded.value = true
        currentUserRequest = null
      })

    return currentUserRequest
  }

  async function logout() {
    try {
      await logoutAuthSession()
    } catch {
      // 서버 세션이 없거나 만료되어도 클라이언트 상태는 정리한다.
    } finally {
      logoutCurrentUser()
    }
  }

  return {
    currentUser,
    currentUserName,
    isAuthenticated,
    isLoaded,
    loadCurrentUser,
    logout,
    logoutCurrentUser,
    updateCurrentUser,
  }
})
