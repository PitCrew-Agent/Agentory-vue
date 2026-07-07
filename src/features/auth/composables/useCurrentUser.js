import { reactive, ref } from 'vue'

import { fetchCurrentAuthUser } from '@/features/auth/services/authApi'

const currentUser = reactive({
  department: '',
  email: '',
  id: null,
  name: '',
  role: '',
  status: '',
  userId: '',
})

const isCurrentUserAuthenticated = ref(false)
const isCurrentUserLoaded = ref(false)
let currentUserRequest = null

function normalizeAuthUser(nextUser = {}) {
  const email = nextUser.email?.trim?.() ?? ''
  const name = nextUser.name?.trim?.() ?? ''
  const role = nextUser.role?.trim?.() ?? ''

  return {
    department: nextUser.department?.trim?.() || role,
    email,
    id: nextUser.id ?? null,
    name: name || email,
    role,
    status: nextUser.status?.trim?.() ?? '',
    userId: nextUser.userId?.trim?.() || email || (nextUser.id ? String(nextUser.id) : ''),
  }
}

function updateCurrentUser(nextUser) {
  const normalizedUser = normalizeAuthUser(nextUser)

  currentUser.department = normalizedUser.department
  currentUser.email = normalizedUser.email
  currentUser.id = normalizedUser.id
  currentUser.name = normalizedUser.name
  currentUser.role = normalizedUser.role
  currentUser.status = normalizedUser.status
  currentUser.userId = normalizedUser.userId
}

function clearCurrentUser() {
  currentUser.department = ''
  currentUser.email = ''
  currentUser.id = null
  currentUser.name = ''
  currentUser.role = ''
  currentUser.status = ''
  currentUser.userId = ''
}

function logoutCurrentUser() {
  clearCurrentUser()
  isCurrentUserAuthenticated.value = false
  isCurrentUserLoaded.value = true
}

async function loadCurrentUser({ force = false } = {}) {
  if (isCurrentUserLoaded.value && !force) {
    return isCurrentUserAuthenticated.value
  }

  if (currentUserRequest) {
    return currentUserRequest
  }

  currentUserRequest = fetchCurrentAuthUser()
    .then((user) => {
      updateCurrentUser(user)
      isCurrentUserAuthenticated.value = true
      return true
    })
    .catch(() => {
      clearCurrentUser()
      isCurrentUserAuthenticated.value = false
      return false
    })
    .finally(() => {
      isCurrentUserLoaded.value = true
      currentUserRequest = null
    })

  return currentUserRequest
}

export function useCurrentUser() {
  return {
    currentUser,
    isCurrentUserAuthenticated,
    isCurrentUserLoaded,
    loadCurrentUser,
    logoutCurrentUser,
    updateCurrentUser,
  }
}
