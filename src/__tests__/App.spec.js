import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

function mountApp() {
  return mount(App, {
    global: {
      plugins: [createPinia(), router],
    },
  })
}

describe('App', () => {
  it('renders the login route by default', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.auth-page').exists()).toBe(true)
  })

  it('renders the dashboard route', async () => {
    await router.push('/dashboard')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.dashboard-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-sidebar"]').exists()).toBe(true)
  })

  it('renders the work log route', async () => {
    await router.push('/work-log')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.dashboard-frame-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="work-log-panel"]').exists()).toBe(true)
  })

  it('renders the equipment list route', async () => {
    await router.push('/equipment')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.dashboard-frame-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="equipment-list-panel"]').exists()).toBe(true)
  })

  it('renders the notification log route', async () => {
    await router.push('/notifications')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.dashboard-frame-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="notification-log-panel"]').exists()).toBe(true)
  })
})
