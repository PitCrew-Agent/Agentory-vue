import { createRouter, createWebHistory } from 'vue-router'

import { useCurrentUser } from '@/features/auth/composables/useCurrentUser'

const authRouteNames = new Set(['Login', 'PasswordFind', 'PasswordReset', 'Signup'])
const protectedRouteNames = new Set(['Dashboard', 'WorkLog', 'EquipmentList', 'NotificationLog'])
const shouldBypassAuthGuard = import.meta.env.MODE === 'test'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'Login' },
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/features/auth/views/AuthView.vue'),
    },
    {
      path: '/password/find',
      name: 'PasswordFind',
      redirect: { name: 'Login' },
    },
    {
      path: '/password/reset',
      name: 'PasswordReset',
      redirect: { name: 'Login' },
    },
    {
      path: '/signup',
      name: 'Signup',
      redirect: { name: 'Login' },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/features/dashboard/views/DashboardView.vue'),
    },
    {
      path: '/work-log',
      name: 'WorkLog',
      component: () => import('@/features/workLog/views/WorkLogView.vue'),
    },
    {
      path: '/equipment',
      name: 'EquipmentList',
      component: () => import('@/features/equipment/views/EquipmentListView.vue'),
    },
    {
      path: '/notifications',
      name: 'NotificationLog',
      component: () => import('@/features/notification/views/NotificationLogView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (shouldBypassAuthGuard) {
    return true
  }

  const { isCurrentUserAuthenticated, loadCurrentUser } = useCurrentUser()

  if (authRouteNames.has(to.name)) {
    const isAuthenticated = await loadCurrentUser()

    if (isAuthenticated) {
      return { name: 'Dashboard', replace: true }
    }

    return true
  }

  if (protectedRouteNames.has(to.name)) {
    const isAuthenticated = isCurrentUserAuthenticated.value || (await loadCurrentUser())

    if (!isAuthenticated) {
      return { name: 'Login', replace: true }
    }
  }

  return true
})

export default router
