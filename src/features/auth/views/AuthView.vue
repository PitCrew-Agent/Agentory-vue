<script setup>
import { computed, reactive, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'

import helpIcon from '@/assets/icons/help.png'
import AuthShell from '@/features/auth/components/AuthShell.vue'
import { useCurrentUser } from '@/features/auth/composables/useCurrentUser'

const props = defineProps({
  screen: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const { updateCurrentUser } = useCurrentUser()

const screens = {
  login: {
    title: '로그인',
    variant: 'login',
    fields: [
      {
        id: 'userId',
        label: 'ID',
        type: 'text',
        placeholder: 'employee1',
        autocomplete: 'username',
      },
      {
        id: 'password',
        label: 'Password',
        type: 'password',
        placeholder: '************',
        autocomplete: 'current-password',
      },
    ],
    link: { to: '/password/find', text: '비밀번호를 잊으셨나요?', icon: true },
    actions: [{ id: 'login', text: '로그인' }],
    secondaryAction: { to: '/signup', text: '회원가입' },
  },
  passwordFind: {
    title: '비밀번호 찾기',
    variant: 'password-find',
    backTo: '/login',
    fields: [
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'admin@metanet.co.kr',
        autocomplete: 'email',
      },
      {
        id: 'code',
        label: '인증번호',
        type: 'text',
        placeholder: '123456',
        autocomplete: 'one-time-code',
      },
    ],
    actions: [
      { id: 'sendCode', text: '인증번호 전송', afterField: 'email' },
      { id: 'verify', text: '인증' },
    ],
  },
  passwordReset: {
    title: '비밀번호 찾기',
    variant: 'password-reset',
    backTo: '/password/find',
    fields: [
      {
        id: 'newPassword',
        label: '새 비밀번호 입력',
        type: 'password',
        placeholder: '************',
        autocomplete: 'new-password',
      },
      {
        id: 'confirmPassword',
        label: '재입력',
        type: 'password',
        placeholder: '************',
        autocomplete: 'new-password',
      },
    ],
    actions: [{ id: 'complete', text: '완료' }],
  },
  signup: {
    title: '회원가입',
    variant: 'signup',
    backTo: '/login',
    fields: [
      { id: 'name', label: '이름', type: 'text', placeholder: '이준호', autocomplete: 'name' },
      {
        id: 'userId',
        label: 'ID',
        type: 'text',
        placeholder: 'employee1',
        autocomplete: 'username',
      },
      {
        id: 'department',
        label: '부서',
        type: 'text',
        placeholder: '생산기술팀',
        autocomplete: 'organization',
      },
      {
        id: 'password',
        label: 'password',
        type: 'password',
        placeholder: '************',
        autocomplete: 'new-password',
      },
      {
        id: 'email',
        label: 'email',
        type: 'email',
        placeholder: 'admin@metanet.co.kr',
        autocomplete: 'email',
      },
    ],
    actions: [{ id: 'complete', text: '완료' }],
  },
}

const currentScreen = computed(() => screens[props.screen] ?? screens.login)
const showBackButton = computed(() => currentScreen.value.variant !== 'login')
const formValues = reactive({})

function resetFormValues() {
  Object.keys(formValues).forEach((key) => {
    delete formValues[key]
  })
  currentScreen.value.fields.forEach((field) => {
    formValues[field.id] = ''
  })
}

function actionsAfterField(fieldId) {
  return currentScreen.value.actions.filter((action) => action.afterField === fieldId)
}

const footerActions = computed(() =>
  currentScreen.value.actions.filter((action) => !action.afterField),
)

function handleSubmit() {
  if (currentScreen.value.variant === 'signup') {
    updateCurrentUser({
      department: formValues.department,
      name: formValues.name,
      userId: formValues.userId,
    })
    router.push('/dashboard')
  }
}

watch(() => props.screen, resetFormValues, { immediate: true })
</script>

<template>
  <AuthShell
    :title="currentScreen.title"
    :card-variant="currentScreen.variant"
    :show-back="showBackButton"
    :back-to="currentScreen.backTo"
  >
    <Transition name="auth-screen" mode="out-in">
      <form :key="currentScreen.variant" class="auth-form" @submit.prevent="handleSubmit">
        <template v-for="field in currentScreen.fields" :key="field.id">
          <label class="auth-field" :for="field.id">
            <span class="auth-label">{{ field.label }}</span>
            <input
              :id="field.id"
              v-model="formValues[field.id]"
              class="auth-input"
              :type="field.type"
              :autocomplete="field.autocomplete"
              :placeholder="field.placeholder"
            />
          </label>

          <button
            v-for="action in actionsAfterField(field.id)"
            :key="action.id"
            class="auth-button"
            type="button"
          >
            <span>{{ action.text }}</span>
          </button>
        </template>

        <RouterLink v-if="currentScreen.link" class="auth-link" :to="currentScreen.link.to">
          <img
            v-if="currentScreen.link.icon"
            class="auth-link-icon"
            :src="helpIcon"
            alt=""
            width="16"
            height="16"
          />
          <span>{{ currentScreen.link.text }}</span>
        </RouterLink>

        <button
          v-for="action in footerActions"
          :key="action.id"
          class="auth-button auth-button--footer"
          type="submit"
        >
          <span>{{ action.text }}</span>
        </button>

        <RouterLink
          v-if="currentScreen.secondaryAction"
          class="auth-secondary-button"
          :to="currentScreen.secondaryAction.to"
        >
          <span>{{ currentScreen.secondaryAction.text }}</span>
        </RouterLink>
      </form>
    </Transition>
  </AuthShell>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  width: var(--auth-form-width);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: var(--auth-field-gap);
  margin-bottom: var(--auth-field-margin);
}

.auth-label,
.auth-input,
.auth-link,
.auth-button,
.auth-secondary-button {
  font-family: var(--agentory-font-family-auth);
  letter-spacing: 0.1em;
}

.auth-label {
  color: var(--agentory-color-text-inverse);
  font-size: var(--auth-label-font-size);
  font-weight: var(--agentory-font-weight-regular);
  line-height: 1.5;
}

.auth-input {
  width: 100%;
  height: var(--auth-control-height);
  padding: clamp(7px, 0.83vh, 11px) clamp(14px, 0.94vw, 22px);
  color: var(--agentory-color-text-auth);
  background: var(--agentory-color-bg-app);
  border: 0;
  border-radius: var(--auth-control-radius);
  outline: none;
  font-size: var(--auth-control-font-size);
  font-weight: var(--agentory-font-weight-regular);
}

.auth-input[type='password'] {
  color: var(--agentory-color-text-primary);
}

.auth-input:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--agentory-color-bg-app), transparent 50%);
}

.auth-input::placeholder {
  color: color-mix(in srgb, var(--agentory-color-text-auth), transparent 58%);
  opacity: 1;
}

.auth-input[type='password']::placeholder {
  color: color-mix(in srgb, var(--agentory-color-text-primary), transparent 64%);
}

.auth-link {
  display: inline-flex;
  align-items: center;
  gap: clamp(4px, 0.31vw, 7px);
  width: fit-content;
  margin: 0 0 clamp(22px, 2.13vh, 27px);
  color: var(--agentory-color-text-inverse);
  font-size: var(--auth-link-font-size);
  font-weight: var(--agentory-font-weight-regular);
  line-height: 1.5;
}

.auth-link-icon {
  width: clamp(12px, 0.83vw, 18px);
  height: clamp(12px, 0.83vw, 18px);
  object-fit: contain;
}

.auth-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--auth-control-height);
  margin-bottom: var(--auth-field-margin);
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--auth-control-radius);
  font-size: var(--auth-control-font-size);
  font-weight: var(--agentory-font-weight-regular);
  line-height: 1.5;
}

.auth-button--footer {
  margin-top: 0;
  margin-bottom: 0;
}

.auth-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--auth-control-height);
  margin-top: clamp(12px, 1.11vh, 15px);
  color: var(--agentory-color-text-inverse);
  border: 1px solid color-mix(in srgb, var(--agentory-color-border-inverse), transparent 38%);
  border-radius: var(--auth-control-radius);
  background: rgba(248, 249, 246, 0.08);
  font-size: var(--auth-control-font-size);
  font-weight: var(--agentory-font-weight-regular);
  line-height: 1.5;
  transition:
    background 180ms ease,
    border-color 180ms ease;
}

.auth-screen-enter-active,
.auth-screen-leave-active {
  transition:
    opacity 200ms ease,
    transform 240ms ease;
}

.auth-screen-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.auth-screen-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (hover: hover) {
  .auth-link:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .auth-button:hover {
    filter: brightness(0.96);
  }

  .auth-secondary-button:hover {
    background: rgba(248, 249, 246, 0.14);
    border-color: var(--agentory-color-border-inverse);
  }
}

@media (max-width: 520px) {
  .auth-form,
  .auth-input,
  .auth-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-screen-enter-active,
  .auth-screen-leave-active {
    transition: none;
  }
}
</style>
