<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import microsoftIcon from '@/assets/icons/microsoft.svg'
import AuthShell from '@/features/auth/components/AuthShell.vue'
import { redirectToAuthFlow } from '@/features/auth/services/authApi'

const { t } = useI18n()
const isAuthRedirecting = ref(false)
const toastMessage = ref('')

let toastTimeoutId

function showToast(message) {
  toastMessage.value = message

  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId)
  }

  toastTimeoutId = window.setTimeout(() => {
    toastMessage.value = ''
    toastTimeoutId = undefined
  }, 2200)
}

async function startAuthRedirect(flow) {
  if (isAuthRedirecting.value) {
    return
  }

  isAuthRedirecting.value = true

  try {
    await redirectToAuthFlow(flow)
  } catch {
    isAuthRedirecting.value = false
    showToast(t('auth.connectionError'))
  }
}

onBeforeUnmount(() => {
  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId)
  }
})
</script>

<template>
  <div class="auth-view-root">
    <AuthShell :title="t('auth.title')" card-variant="login">
      <section class="auth-sso" aria-labelledby="auth-sso-title">
        <div class="auth-sso__copy">
          <span class="auth-sso__eyebrow">{{ t('auth.eyebrow') }}</span>
          <h2 id="auth-sso-title">{{ t('auth.accessTitle') }}</h2>
          <p>{{ t('auth.accessDescription') }}</p>
        </div>

        <div class="auth-sso__actions">
          <button
            class="auth-sso__button auth-sso__button--primary"
            type="button"
            :disabled="isAuthRedirecting"
            @click="startAuthRedirect('login')"
          >
            <img class="auth-sso__microsoft-icon" :src="microsoftIcon" alt="" />
            <span>{{ t('auth.continueMicrosoft') }}</span>
          </button>

          <button
            class="auth-sso__button auth-sso__button--secondary"
            type="button"
            :disabled="isAuthRedirecting"
            @click="startAuthRedirect('passwordReset')"
          >
            <span>{{ t('auth.passwordReset') }}</span>
          </button>
        </div>

        <p class="auth-sso__note">{{ t('auth.accountNote') }}</p>
      </section>

      <Teleport to="body">
        <Transition name="auth-toast">
          <div v-if="toastMessage" class="auth-toast" role="status" aria-live="polite">
            {{ toastMessage }}
          </div>
        </Transition>
      </Teleport>
    </AuthShell>
  </div>
</template>

<style scoped>
.auth-view-root {
  display: contents;
}

.auth-sso {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-height: clamp(260px, 32dvh, 350px);
  font-family: var(--agentory-font-family-base);
  animation: auth-sso-in 280ms var(--agentory-ease-soft) both;
}

.auth-sso__copy {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.83dvh, 9px);
  margin-bottom: clamp(24px, 3.43dvh, 36px);
}

.auth-sso__eyebrow {
  color: var(--agentory-color-bg-primary);
  font-size: clamp(12px, 0.78vw, 15px);
  font-weight: var(--agentory-font-weight-semi-bold);
  letter-spacing: var(--agentory-letter-spacing-default);
  line-height: 1.4;
}

.auth-sso h2 {
  margin: 0;
  color: var(--agentory-color-text-primary);
  font-size: clamp(24px, 1.67vw, 32px);
  font-weight: var(--agentory-font-weight-bold);
  letter-spacing: var(--agentory-letter-spacing-default);
  line-height: 1.25;
}

.auth-sso p {
  margin: 0;
  color: var(--agentory-color-text-muted);
  font-size: clamp(13px, 0.89vw, 17px);
  font-weight: var(--agentory-font-weight-regular);
  letter-spacing: var(--agentory-letter-spacing-default);
  line-height: 1.6;
}

.auth-sso__actions {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.3dvh, 14px);
  margin-bottom: clamp(14px, 1.94dvh, 21px);
}

.auth-sso__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--agentory-spacing-10);
  width: 100%;
  height: var(--auth-control-height);
  padding: 0 clamp(18px, 1.56vw, 30px);
  border: 0;
  border-radius: var(--auth-control-radius);
  font-family: var(--agentory-font-family-base);
  font-size: var(--auth-control-font-size);
  font-weight: var(--agentory-font-weight-medium);
  letter-spacing: var(--agentory-letter-spacing-default);
  line-height: 1.5;
  cursor: pointer;
  transition:
    filter 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;
}

.auth-sso__button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.auth-sso__button--primary {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
}

.auth-sso__button--secondary {
  color: var(--agentory-color-bg-primary);
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 62%);
}

.auth-sso__microsoft-icon {
  width: clamp(18px, 1.25vw, 24px);
  height: clamp(18px, 1.25vw, 24px);
  object-fit: contain;
}

.auth-sso__note {
  max-width: 26em;
  font-size: clamp(12px, 0.78vw, 15px);
}

.auth-toast {
  position: fixed;
  z-index: 1000;
  top: clamp(24px, 4.44dvh, 48px);
  left: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(42px, 5dvh, 54px);
  padding: 0 clamp(22px, 1.88vw, 36px);
  overflow: hidden;
  color: var(--agentory-color-text-inverse);
  background:
    radial-gradient(
      circle at 22% 0%,
      color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 6%),
      transparent 38%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--agentory-color-bg-primary), transparent 34%),
      color-mix(in srgb, var(--agentory-color-bg-primary), transparent 56%) 42%,
      color-mix(in srgb, var(--agentory-color-bg-app), transparent 72%)
    );
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-inverse), transparent 32%);
  border-radius: var(--agentory-radius-pill);
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%),
    0 8px 20px color-mix(in srgb, var(--agentory-color-text-primary), transparent 86%),
    inset 0 1px 0 color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 4%),
    inset 0 -10px 24px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 58%);
  backdrop-filter: blur(26px) saturate(220%) contrast(118%);
  -webkit-backdrop-filter: blur(26px) saturate(220%) contrast(118%);
  font-family: var(--agentory-font-family-base);
  font-size: var(--auth-control-font-size, 16px);
  font-weight: var(--agentory-font-weight-medium);
  letter-spacing: var(--agentory-letter-spacing-default);
  pointer-events: none;
  text-shadow: 0 1px 8px color-mix(in srgb, var(--agentory-color-text-primary), transparent 70%);
  transform: translateX(-50%);
}

.auth-toast::before {
  position: absolute;
  inset: -80% -34%;
  background:
    linear-gradient(
      112deg,
      transparent 22%,
      color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 18%) 42%,
      transparent 58%
    ),
    radial-gradient(
      ellipse at 72% 18%,
      color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 14%),
      transparent 36%
    );
  content: '';
  opacity: 0.9;
  pointer-events: none;
  transform: rotate(-8deg);
}

.auth-toast::after {
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  box-shadow:
    inset 10px 0 22px color-mix(in srgb, var(--agentory-color-bg-glass-white), transparent 78%),
    inset -14px 0 26px color-mix(in srgb, var(--agentory-color-bg-primary), transparent 60%);
  content: '';
  pointer-events: none;
}

.auth-toast-enter-active,
.auth-toast-leave-active {
  transition:
    opacity 220ms ease,
    transform 280ms var(--agentory-ease-soft);
}

.auth-toast-enter-from,
.auth-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

@media (hover: hover) {
  .auth-sso__button:hover:not(:disabled) {
    filter: brightness(0.96);
  }
}

@media (max-width: 520px) {
  .auth-sso__button {
    width: 100%;
  }
}

@keyframes auth-sso-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-toast-enter-active,
  .auth-toast-leave-active {
    transition: none;
  }

  .auth-sso {
    animation: none;
  }
}
</style>
