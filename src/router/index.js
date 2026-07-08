import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

const authRouteNames = new Set(['Login'])
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
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'Login' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (shouldBypassAuthGuard) {
    return true
  }

  const authStore = useAuthStore()

  if (authRouteNames.has(to.name)) {
    const isAuthenticated = await authStore.loadCurrentUser()

    if (isAuthenticated) {
      return { name: 'Dashboard', replace: true }
    }

    return true
  }

  if (protectedRouteNames.has(to.name)) {
    const isAuthenticated = authStore.isAuthenticated || (await authStore.loadCurrentUser())

    if (!isAuthenticated) {
      return { name: 'Login', replace: true }
    }
  }

  return true
})

export default router
