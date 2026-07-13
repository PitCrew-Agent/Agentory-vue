<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import bellIcon from '@/assets/icons/dashboard/nav-bell.svg'
import dangerStatusIcon from '@/assets/icons/dashboard/status-danger.svg'
import normalStatusIcon from '@/assets/icons/dashboard/status-normal.svg'
import themeMoonIcon from '@/assets/icons/dashboard/theme-moon.svg'
import themeSunIcon from '@/assets/icons/dashboard/theme-sun.svg'
import warningStatusIcon from '@/assets/icons/dashboard/status-warning.svg'
import logoImage from '@/assets/images/agentory-logo.png'
import { LOCALE_OPTIONS } from '@/features/i18n/constants/locales'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useNotificationCenter } from '@/features/notification/composables/useNotificationCenter'

defineProps({
  summary: {
    type: Array,
    default: () => [],
  },
})

const statusIconMap = {
  danger: dangerStatusIcon,
  normal: normalStatusIcon,
  warning: warningStatusIcon,
}

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const { loadNotifications, markNotificationRead, unreadNotifications } = useNotificationCenter()
const isNotificationOpen = ref(false)
const isProfileOpen = ref(false)
const notificationRef = ref(null)
const profileRef = ref(null)
const shouldSkipHeaderApi = import.meta.env.MODE === 'test'
const hasUnreadNotifications = computed(() => unreadNotifications.value.length > 0)
const currentUser = computed(() => authStore.currentUser)
const currentUserName = computed(() => authStore.currentUserName)
const currentUserInitial = computed(() => currentUserName.value.trim().charAt(0).toUpperCase() || 'A')
const userRoleLabelMap = {
  admin: '관리자',
  engineer: '엔지니어',
  field_engineer: '현장 엔지니어',
  manager: '운영 관리자',
  operator: '운영 담당자',
}
const userStatusLabelMap = {
  active: '이용 가능',
  inactive: '비활성',
  pending: '승인 대기',
  suspended: '이용 제한',
}
const currentUserRoleLabel = computed(() => {
  const role = String(currentUser.value.role ?? '').trim().toLowerCase()

  return userRoleLabelMap[role] ?? (role ? role.replaceAll('_', ' ') : '-')
})
const currentUserStatusLabel = computed(() => {
  const status = String(currentUser.value.status ?? '').trim().toLowerCase()

  return userStatusLabelMap[status] ?? (status ? '상태 확인 필요' : '-')
})

function toggleNotificationPanel() {
  isNotificationOpen.value = !isNotificationOpen.value
  isProfileOpen.value = false
}

function toggleProfilePanel() {
  isProfileOpen.value = !isProfileOpen.value
  isNotificationOpen.value = false
}

function toggleTheme() {
  uiStore.toggleTheme()
}

function selectLocale(locale) {
  if (!uiStore.setLocale(locale)) {
    return
  }

  window.location.reload()
}

function closeHeaderPopoversOnOutsidePointer(event) {
  if (isNotificationOpen.value && !notificationRef.value?.contains(event.target)) {
    isNotificationOpen.value = false
  }

  if (isProfileOpen.value && !profileRef.value?.contains(event.target)) {
    isProfileOpen.value = false
  }
}

function closeHeaderPopoversOnEscape(event) {
  if (event.key === 'Escape') {
    isNotificationOpen.value = false
    isProfileOpen.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  isProfileOpen.value = false
  router.push('/login')
}

onMounted(async () => {
  document.addEventListener('pointerdown', closeHeaderPopoversOnOutsidePointer)
  document.addEventListener('keydown', closeHeaderPopoversOnEscape)
  await authStore.loadCurrentUser()

  if (!shouldSkipHeaderApi) {
    loadNotifications({ unreadOnly: true })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeHeaderPopoversOnOutsidePointer)
  document.removeEventListener('keydown', closeHeaderPopoversOnEscape)
})
</script>

<template>
  <header class="dashboard-header">
    <img class="dashboard-header__logo" :src="logoImage" alt="Agentory" width="266" height="49" />

    <ul v-if="summary.length" class="dashboard-header__summary" aria-label="설비 상태 요약">
      <li
        v-for="item in summary"
        :key="item.id"
        class="dashboard-header__status"
        :class="`dashboard-header__status--${item.tone}`"
      >
        <img
          class="dashboard-header__dot"
          :src="statusIconMap[item.tone]"
          alt=""
          width="20"
          height="20"
        />
        <span>{{ item.label }}</span>
        <span class="dashboard-header__divider">·</span>
        <strong>{{ item.count }}</strong>
      </li>
    </ul>

    <div class="dashboard-header__tools">
      <div ref="notificationRef" class="dashboard-header__notification">
        <button
          class="dashboard-header__notification-button"
          type="button"
          aria-label="읽지 않은 알림 확인"
          :aria-expanded="isNotificationOpen"
          data-test="dashboard-header-notification-toggle"
          @click="toggleNotificationPanel"
        >
          <img
            class="dashboard-header__notification-icon"
            :src="bellIcon"
            alt=""
            width="20"
            height="20"
            data-test="dashboard-header-notification-icon"
          />
          <span
            v-if="hasUnreadNotifications"
            class="dashboard-header__notification-dot"
            data-test="dashboard-header-notification-dot"
            aria-hidden="true"
          ></span>
        </button>

        <section
          v-if="isNotificationOpen"
          class="dashboard-header__notification-panel"
          data-test="dashboard-header-notification-dropdown"
          aria-label="읽지 않은 알림"
        >
          <header class="dashboard-header__notification-panel-header">
            <strong>읽지 않은 알림</strong>
          </header>

          <ul v-if="unreadNotifications.length" class="dashboard-header__notification-list">
            <li
              v-for="notification in unreadNotifications"
              :key="notification.id"
              class="dashboard-header__notification-item"
              :class="`dashboard-header__notification-item--${notification.tone}`"
            >
              <div class="dashboard-header__notification-copy">
                <div class="dashboard-header__notification-code">
                  <span class="dashboard-header__notification-status-dot" aria-hidden="true"></span>
                  <strong>{{ notification.code }}</strong>
                </div>
                <span>{{ notification.message }}</span>
                <time>{{ notification.occurredAt }}</time>
              </div>
              <button
                class="dashboard-header__notification-read"
                type="button"
                :data-test="`dashboard-header-notification-read-${notification.id}`"
                @click="markNotificationRead(notification.id)"
              >
                읽음
              </button>
            </li>
          </ul>

          <p v-else class="dashboard-header__notification-empty">읽지 않은 알림 없음</p>
        </section>
      </div>

      <button
        class="dashboard-header__theme-button"
        type="button"
        :aria-label="uiStore.isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'"
        :aria-pressed="uiStore.isDarkMode"
        :title="uiStore.isDarkMode ? '라이트 모드' : '다크 모드'"
        data-test="dashboard-header-theme-toggle"
        @click="toggleTheme"
      >
        <img
          class="dashboard-header__theme-icon"
          :src="uiStore.isDarkMode ? themeSunIcon : themeMoonIcon"
          alt=""
          width="20"
          height="20"
        />
      </button>

      <div class="dashboard-header__language-switch" role="group" aria-label="응답 언어 선택">
        <button
          v-for="option in LOCALE_OPTIONS"
          :key="option.locale"
          class="dashboard-header__language-option"
          :class="{
            'dashboard-header__language-option--active': uiStore.currentLocale === option.locale,
          }"
          type="button"
          :aria-label="option.name"
          :aria-pressed="uiStore.currentLocale === option.locale"
          :data-test="`dashboard-header-locale-${option.locale}`"
          @click="selectLocale(option.locale)"
        >
          {{ option.label }}
        </button>
      </div>

      <div ref="profileRef" class="dashboard-header__profile">
        <button
          class="dashboard-header__user-button"
          type="button"
          :aria-expanded="isProfileOpen"
          data-test="dashboard-header-user-button"
          @click="toggleProfilePanel"
        >
          {{ currentUserName }}
        </button>

        <section
          v-if="isProfileOpen"
          class="dashboard-header__profile-card"
          data-test="dashboard-header-profile-card"
          aria-label="사용자 프로필"
        >
          <div class="dashboard-header__profile-summary">
            <span class="dashboard-header__profile-avatar" aria-hidden="true">
              {{ currentUserInitial }}
            </span>
            <div class="dashboard-header__profile-copy">
              <strong>{{ currentUserName }}</strong>
              <span>{{ currentUser.email || currentUser.userId || '-' }}</span>
            </div>
          </div>

          <dl class="dashboard-header__profile-list">
            <div>
              <dt>권한</dt>
              <dd data-test="dashboard-header-profile-department">{{ currentUserRoleLabel }}</dd>
            </div>
            <div>
              <dt>담당 라인</dt>
              <dd>{{ currentUser.assignedLineLabel || '-' }}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd class="dashboard-header__profile-status">
                <span aria-hidden="true"></span>
                {{ currentUserStatusLabel }}
              </dd>
            </div>
          </dl>

          <button
            class="dashboard-header__logout-button"
            type="button"
            data-test="dashboard-header-logout"
            @click="handleLogout"
          >
            로그아웃
          </button>
        </section>
      </div>
    </div>
  </header>
</template>

<style scoped>
.dashboard-header {
  position: fixed;
  z-index: 30;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  height: var(--dashboard-header-height, 90px);
  padding: var(--agentory-spacing-10) var(--agentory-spacing-25) var(--agentory-spacing-10)
    var(--agentory-spacing-40);
  background: var(--agentory-color-bg-primary);
}

.dashboard-header__logo {
  width: 213px;
  height: 39px;
  object-fit: contain;
}

.dashboard-header__summary {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-24);
  height: 56px;
  padding: var(--agentory-spacing-17) var(--agentory-spacing-20);
}

.dashboard-header__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-10);
  min-width: 0;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-14);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-glass-light);
  border-radius: var(--agentory-radius-22);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-lg);
  white-space: nowrap;
}

.dashboard-header__dot {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex: 0 0 auto;
}

.dashboard-header__divider {
  font-size: var(--agentory-font-size-h2);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--agentory-line-height-h2);
}

.dashboard-header__status strong {
  font-weight: var(--agentory-font-weight-medium);
}

.dashboard-header__status--normal strong {
  color: var(--agentory-color-status-normal-text);
}

.dashboard-header__status--warning strong {
  color: var(--agentory-color-status-warning);
}

.dashboard-header__status--danger strong {
  color: var(--agentory-color-status-danger);
}

.dashboard-header__tools {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  margin-left: auto;
}

.dashboard-header__notification {
  position: relative;
  display: flex;
  align-items: center;
}

.dashboard-header__notification-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-pill);
  cursor: pointer;
}

.dashboard-header__notification-button:focus-visible {
  outline: 2px solid var(--agentory-color-border-inverse);
  outline-offset: 2px;
}

.dashboard-header__theme-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-pill);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.dashboard-header__theme-button:hover {
  background: var(--agentory-color-bg-glass-white);
}

.dashboard-header__theme-button:focus-visible {
  outline: 2px solid var(--agentory-color-border-inverse);
  outline-offset: 2px;
}

.dashboard-header__theme-button:active {
  transform: scale(0.94);
}

.dashboard-header__theme-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.dashboard-header__language-switch {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: var(--agentory-spacing-2);
  background: color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 10%);
  border-radius: var(--agentory-radius-8);
}

.dashboard-header__language-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 24px;
  padding: 0 var(--agentory-spacing-6);
  color: color-mix(in srgb, var(--agentory-color-text-inverse), transparent 32%);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 160ms var(--agentory-ease-soft),
    background-color 160ms var(--agentory-ease-soft);
}

.dashboard-header__language-option:hover {
  color: var(--agentory-color-text-inverse);
}

.dashboard-header__language-option--active {
  color: var(--agentory-color-bg-primary);
  background: var(--agentory-color-text-inverse);
}

.dashboard-header__language-option:focus-visible {
  outline: 2px solid var(--agentory-color-border-inverse);
  outline-offset: 1px;
}

.dashboard-header__notification-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex: 0 0 auto;
  filter: brightness(0) invert(1);
}

.dashboard-header__notification-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  background: var(--agentory-color-status-warning);
  border-radius: var(--agentory-radius-pill);
}

.dashboard-header__profile {
  position: relative;
}

.dashboard-header__user-button {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-12);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-glass-light);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body);
  cursor: pointer;
}

.dashboard-header__user-button:focus-visible {
  outline: 2px solid var(--agentory-color-border-inverse);
  outline-offset: 2px;
}

.dashboard-header__notification-panel {
  position: absolute;
  z-index: 35;
  top: calc(100% + var(--agentory-spacing-10));
  right: 0;
  display: flex;
  width: 330px;
  max-height: 390px;
  padding: var(--agentory-spacing-16);
  flex-direction: column;
  gap: var(--agentory-spacing-12);
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 14%),
      color-mix(in srgb, var(--agentory-color-bg-app), transparent 34%) 52%,
      color-mix(in srgb, var(--agentory-color-bg-primary-glass), transparent 82%)
    );
  border: 0;
  border-radius: var(--agentory-radius-16);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 24%),
    inset 0 -1px 0 color-mix(in srgb, var(--agentory-color-bg-primary), transparent 86%),
    var(--agentory-shadow-panel-strong);
  backdrop-filter: blur(24px) saturate(190%) contrast(112%);
  -webkit-backdrop-filter: blur(24px) saturate(190%) contrast(112%);
}

.dashboard-header__notification-panel-header {
  display: flex;
  align-items: center;
  min-height: 28px;
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-bold);
}

.dashboard-header__notification-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  overflow: auto;
  padding-right: var(--agentory-spacing-4);
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%) transparent;
  scrollbar-width: thin;
}

.dashboard-header__notification-list::-webkit-scrollbar {
  width: 6px;
}

.dashboard-header__notification-list::-webkit-scrollbar-track {
  background: transparent;
}

.dashboard-header__notification-list::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 48%);
  border-radius: var(--agentory-radius-pill);
}

.dashboard-header__notification-item {
  --dashboard-notification-tone: var(--agentory-color-status-warning);

  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--agentory-spacing-12);
  padding: var(--agentory-spacing-10) var(--agentory-spacing-12);
  background: transparent;
  border-radius: var(--agentory-radius-8);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 72%);
}

.dashboard-header__notification-item--warning {
  background: transparent;
}

.dashboard-header__notification-item--danger {
  --dashboard-notification-tone: var(--agentory-color-status-danger-text);

  background: transparent;
}

.dashboard-header__notification-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
}

.dashboard-header__notification-code {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--agentory-spacing-6);
}

.dashboard-header__notification-status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: var(--dashboard-notification-tone);
  border-radius: var(--agentory-radius-pill);
}

.dashboard-header__notification-copy strong {
  overflow: hidden;
  color: var(--dashboard-notification-tone);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-header__notification-copy span,
.dashboard-header__notification-copy time,
.dashboard-header__notification-empty {
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-header__notification-copy time {
  color: var(--agentory-color-text-muted);
}

.dashboard-header__notification-read {
  min-height: 28px;
  padding: var(--agentory-spacing-4) var(--agentory-spacing-10);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

.dashboard-header__notification-empty {
  padding: var(--agentory-spacing-12);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-8);
  text-align: center;
}

.dashboard-header__profile-card {
  position: absolute;
  z-index: 35;
  top: calc(100% + var(--agentory-spacing-10));
  right: 0;
  display: flex;
  width: 310px;
  padding: var(--agentory-spacing-20);
  flex-direction: column;
  gap: var(--agentory-spacing-16);
  color: var(--agentory-color-text-primary);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 12%),
      color-mix(in srgb, var(--agentory-color-bg-app), transparent 30%) 54%,
      color-mix(in srgb, var(--agentory-color-bg-primary-glass), transparent 80%)
    );
  border: 0;
  border-radius: var(--agentory-radius-16);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-border-inverse), transparent 20%),
    inset 0 -1px 0 color-mix(in srgb, var(--agentory-color-bg-primary), transparent 86%),
    var(--agentory-shadow-panel-strong);
  backdrop-filter: blur(24px) saturate(190%) contrast(112%);
  -webkit-backdrop-filter: blur(24px) saturate(190%) contrast(112%);
}

.dashboard-header__profile-summary {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-12);
  padding: var(--agentory-spacing-12);
  background: color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 56%);
  border-radius: var(--agentory-radius-12);
}

.dashboard-header__profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.dashboard-header__profile-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-2);
}

.dashboard-header__profile-copy strong {
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-header__profile-copy span {
  overflow: hidden;
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-header__profile-list {
  display: flex;
  flex-direction: column;
  gap: var(--agentory-spacing-6);
}

.dashboard-header__profile-list div {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: var(--agentory-spacing-10);
  min-height: 34px;
  padding: 0 var(--agentory-spacing-8);
  background: color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 66%);
  border-radius: var(--agentory-radius-8);
}

.dashboard-header__profile-list dt {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-body-sm);
}

.dashboard-header__profile-list dd {
  min-width: 0;
  overflow: hidden;
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-header__profile-list .dashboard-header__profile-status {
  display: inline-flex;
  align-items: center;
  gap: var(--agentory-spacing-6);
}

.dashboard-header__profile-status span {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: var(--agentory-color-status-normal-text);
  border-radius: var(--agentory-radius-pill);
}

.dashboard-header__logout-button {
  min-height: 36px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body);
  font-weight: var(--agentory-font-weight-medium);
  cursor: pointer;
}

@media (max-width: 980px) {
  .dashboard-header {
    padding-left: var(--agentory-spacing-20);
  }

  .dashboard-header__summary {
    gap: var(--agentory-spacing-8);
    overflow-x: auto;
    padding-inline: var(--agentory-spacing-12);
  }

  .dashboard-header__status {
    font-size: var(--agentory-font-size-body-sm);
  }

  .dashboard-header__notification-panel {
    right: calc(var(--agentory-spacing-20) * -1);
    width: min(330px, calc(100vw - var(--agentory-spacing-40)));
  }

  .dashboard-header__profile-card {
    width: min(310px, calc(100vw - var(--agentory-spacing-40)));
  }
}
</style>
