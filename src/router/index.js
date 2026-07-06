import { createRouter, createWebHistory } from 'vue-router'

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
      props: { screen: 'login' },
    },
    {
      path: '/password/find',
      name: 'PasswordFind',
      component: () => import('@/features/auth/views/AuthView.vue'),
      props: { screen: 'passwordFind' },
    },
    {
      path: '/password/reset',
      name: 'PasswordReset',
      component: () => import('@/features/auth/views/AuthView.vue'),
      props: { screen: 'passwordReset' },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('@/features/auth/views/AuthView.vue'),
      props: { screen: 'signup' },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/features/dashboard/views/DashboardView.vue'),
    },
  ],
})

export default router
