import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { AUTH_SESSION_EXPIRED_EVENT } from './features/auth/constants/authEvents'
import { i18n } from './features/i18n'
import { useAuthStore } from './stores/authStore'
import { useUiStore } from './stores/uiStore'

import './assets/styles/reset.css'
import './assets/styles/tokens.css'
import './assets/styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)

useUiStore(pinia).initialize()

window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => {
  const authStore = useAuthStore(pinia)
  authStore.logoutCurrentUser()

  if (router.currentRoute.value.name !== 'Login') {
    router.replace({ name: 'Login' })
  }
})

app.mount('#app')
