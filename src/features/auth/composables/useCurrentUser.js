import { reactive } from 'vue'

const currentUser = reactive({
  department: '생산기술팀',
  name: '이준호',
  userId: 'employee1',
})

function updateCurrentUser(nextUser) {
  currentUser.department = nextUser.department?.trim() || currentUser.department
  currentUser.name = nextUser.name?.trim() || currentUser.name
  currentUser.userId = nextUser.userId?.trim() || currentUser.userId
}

function logoutCurrentUser() {
  currentUser.department = '생산기술팀'
  currentUser.name = '이준호'
  currentUser.userId = 'employee1'
}

export function useCurrentUser() {
  return {
    currentUser,
    logoutCurrentUser,
    updateCurrentUser,
  }
}
