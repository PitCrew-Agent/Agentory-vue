import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import router from '../router'
import { i18n } from '../features/i18n'

function mountApp() {
  return mount(App, {
    global: {
      plugins: [createPinia(), i18n, router],
    },
  })
}

describe('App', () => {
  it('renders the login route by default', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.auth-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="auth-preferences-theme-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="auth-preferences-locale-ko"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="auth-preferences-locale-en"]').exists()).toBe(true)
  })

  it('renders the dashboard route', async () => {
    await router.push('/dashboard')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('.dashboard-page').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-header-locale-ko"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-header-locale-en"]').exists()).toBe(true)
  }, 12_000)

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

  it('translates dashboard work pages into English', async () => {
    i18n.global.locale.value = 'en'
    await router.push('/work-log')
    await router.isReady()

    const wrapper = mountApp()

    expect(wrapper.find('[data-test="work-log-panel"] h1').text()).toBe('Work logs')
    expect(wrapper.find('[data-test="work-log-panel-action"]').text()).toBe('Create work log')
    await wrapper.find('[data-test="work-log-panel-action"]').trigger('click')
    expect(wrapper.find('#work-log-create-title').text()).toBe('Create work log')

    await router.push('/equipment')
    await nextTick()
    expect(wrapper.find('[data-test="equipment-list-panel"] h1').text()).toBe('Equipment')
    expect(wrapper.find('[data-test="equipment-list-panel-action"]').text()).toBe('Open 3D view')

    await router.push('/notifications')
    await nextTick()
    expect(wrapper.find('[data-test="notification-log-panel"] h1').text()).toBe('Alert history')
    expect(wrapper.find('[data-test="notification-log-panel-action"]').text()).toBe(
      'Mark all as read',
    )
    await wrapper.find('[data-test="notification-log-panel-action"]').trigger('click')
    expect(wrapper.find('#notification-bulk-confirm-title').text()).toBe(
      'Mark all alerts as read?',
    )

    wrapper.unmount()
    i18n.global.locale.value = 'ko'
  })
})
