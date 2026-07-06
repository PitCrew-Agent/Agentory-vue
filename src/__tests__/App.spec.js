import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the login route by default', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('.auth-page').exists()).toBe(true)
  })

  it('renders the dashboard route', async () => {
    await router.push('/dashboard')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('.dashboard-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-sidebar"]').exists()).toBe(true)
  })
})
