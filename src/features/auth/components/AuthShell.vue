<script setup>
import { RouterLink } from 'vue-router'

import backArrowIcon from '@/assets/icons/back-arrow.png'
import logoImage from '@/assets/images/agentory-logo.png'

defineProps({
  title: {
    type: String,
    required: true,
  },
  cardVariant: {
    type: String,
    default: 'default',
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  backTo: {
    type: String,
    default: '/login',
  },
})
</script>

<template>
  <main class="auth-page" :class="`auth-page--${cardVariant}`">
    <section class="auth-visual" aria-hidden="true"></section>

    <section class="auth-content" :class="`auth-content--${cardVariant}`">
      <div class="auth-card" :class="`auth-card--${cardVariant}`">
        <div class="auth-header" :class="{ 'auth-header--with-back': showBack }">
          <span class="auth-back-space" :class="{ 'auth-back-space--visible': showBack }">
            <Transition name="auth-back">
              <RouterLink
                v-if="showBack"
                class="auth-back-link"
                :to="backTo"
                aria-label="이전 화면으로 이동"
              >
                <img class="auth-back-icon" :src="backArrowIcon" alt="" width="30" height="30" />
              </RouterLink>
            </Transition>
          </span>
          <img class="auth-logo" :src="logoImage" alt="Agentory" width="266" height="49" />
        </div>
        <div class="auth-form-wrap">
          <Transition name="auth-title" mode="out-in">
            <h1 :key="title" class="auth-title">{{ title }}</h1>
          </Transition>
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  --auth-back-gap: 4px;
  --auth-back-size: 30px;
  --auth-card-height: clamp(420px, 53.25vh, 662px);
  --auth-card-height-password-find: clamp(445px, 54.9vh, 682px);
  --auth-card-height-password-reset: clamp(380px, 46.75vh, 581px);
  --auth-card-height-signup: clamp(440px, 54.6vh, 679px);
  --auth-card-padding-bottom: clamp(48px, 6.67vh, 83px);
  --auth-card-padding-top: clamp(32px, 4.17vh, 52px);
  --auth-card-padding-x: clamp(52px, 3.75vw, 84px);
  --auth-card-top: clamp(110px, 7.8125vw, 150px);
  --auth-card-width: clamp(330px, 21.95vw, 486px);
  --auth-control-font-size: clamp(11px, 0.73vw, 16px);
  --auth-control-height: clamp(32px, 3.7vh, 46px);
  --auth-control-radius: var(--agentory-radius-5);
  --auth-field-gap: clamp(10px, 1.2vh, 16px);
  --auth-field-margin: clamp(18px, 2.32vh, 29px);
  --auth-form-gap: clamp(18px, 2.5vh, 32px);
  --auth-form-width: clamp(215px, 14.12vw, 318px);
  --auth-label-font-size: clamp(11px, 0.73vw, 16px);
  --auth-link-font-size: clamp(10px, 0.68vw, 15px);
  --auth-logo-height: clamp(34px, 4.07vh, 50px);
  --auth-logo-width: clamp(190px, 12.45vw, 286px);
  --auth-title-font-size: clamp(25px, 1.67vw, 37px);
  --auth-title-line-height: clamp(38px, 4.54vh, 56px);
  --auth-title-margin: clamp(17px, 2.13vh, 27px);

  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
}

.auth-visual {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--agentory-color-bg-primary);
}

.auth-visual::before {
  position: absolute;
  inset: 0;
  background: var(--agentory-color-bg-app);
  border-top-right-radius: 150px;
  content: '';
}

.auth-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: var(--auth-card-top) var(--agentory-spacing-40) var(--agentory-spacing-40);
  background: var(--agentory-color-bg-app);
}

.auth-content::before {
  position: absolute;
  inset: 0;
  background: var(--agentory-color-bg-primary);
  border-bottom-left-radius: 150px;
  content: '';
}

.auth-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: var(--auth-card-width);
  max-height: calc(100dvh - var(--auth-card-top) - var(--agentory-spacing-40));
  min-height: min(var(--auth-card-height), calc(100dvh - var(--auth-card-top) - var(--agentory-spacing-40)));
  padding: var(--auth-card-padding-top) var(--auth-card-padding-x) var(--auth-card-padding-bottom);
  border: 1px solid var(--agentory-color-border-inverse);
  border-radius: var(--agentory-radius-10);
  background: var(--agentory-color-bg-glass-light);
  backdrop-filter: var(--agentory-blur-auth-panel);
  transition:
    width 220ms ease,
    min-height 220ms ease,
    padding 220ms ease;
}

.auth-card--password-find {
  --auth-card-height: var(--auth-card-height-password-find);
}

.auth-card--password-reset {
  --auth-card-height: var(--auth-card-height-password-reset);
  background: var(--agentory-color-bg-glass-white);
}

.auth-card--signup {
  --auth-card-height: var(--auth-card-height-signup);
  background: var(--agentory-color-bg-glass-white);
}

.auth-page--signup {
  --auth-card-padding-bottom: clamp(24px, 3.15vh, 42px);
  --auth-card-padding-top: clamp(24px, 3.15vh, 42px);
  --auth-card-top: clamp(72px, 7.4vh, 110px);
  --auth-control-height: clamp(30px, 3.2vh, 39px);
  --auth-field-gap: clamp(5px, 0.7vh, 9px);
  --auth-field-margin: clamp(10px, 1.2vh, 15px);
  --auth-title-line-height: clamp(32px, 3.6vh, 44px);
  --auth-title-margin: clamp(8px, 1vh, 14px);
}

.auth-header {
  display: flex;
  align-items: center;
  width: var(--auth-form-width);
}

.auth-header--with-back {
  gap: 0;
}

.auth-back-space {
  position: relative;
  flex: 0 0 auto;
  width: 0;
  height: var(--auth-back-size);
  margin-right: 0;
  overflow: hidden;
  transition:
    width 240ms ease,
    margin-right 240ms ease;
}

.auth-back-space--visible {
  width: var(--auth-back-size);
  margin-right: var(--auth-back-gap);
}

.auth-back-link {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--auth-back-size);
  height: var(--auth-back-size);
  border-radius: var(--agentory-radius-5);
}

.auth-back-icon {
  width: var(--auth-back-size);
  height: var(--auth-back-size);
  object-fit: contain;
}

.auth-logo {
  flex: 0 0 auto;
  width: var(--auth-logo-width);
  height: var(--auth-logo-height);
  object-fit: contain;
  transition:
    width 240ms ease,
    transform 240ms ease;
}

.auth-header--with-back .auth-logo {
  width: calc(var(--auth-form-width) - var(--auth-back-size) - var(--auth-back-gap));
}

.auth-form-wrap {
  margin-top: var(--auth-form-gap);
}

.auth-title {
  margin: 0 0 var(--auth-title-margin);
  color: var(--agentory-color-text-inverse);
  font-family: var(--agentory-font-family-base);
  font-size: var(--auth-title-font-size);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--auth-title-line-height);
  letter-spacing: var(--agentory-letter-spacing-default);
}

.auth-back-enter-active,
.auth-back-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.auth-back-enter-from,
.auth-back-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.auth-title-enter-active,
.auth-title-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.auth-title-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.auth-title-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    display: none;
  }

  .auth-content {
    padding: var(--auth-card-top) var(--agentory-spacing-24) var(--agentory-spacing-24);
    background: var(--agentory-color-bg-primary);
  }

  .auth-content::before {
    display: none;
  }
}

@media (max-width: 520px) {
  .auth-page {
    --auth-back-gap: 6px;
    --auth-card-padding-bottom: 44px;
    --auth-card-padding-top: 40px;
    --auth-card-padding-x: 28px;
    --auth-form-width: min(100%, 300px);
    --auth-logo-width: min(239px, 100%);
  }

  .auth-content {
    padding: var(--auth-card-top) var(--agentory-spacing-16) var(--agentory-spacing-16);
  }

  .auth-card {
    width: 100%;
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-back-enter-active,
  .auth-back-leave-active,
  .auth-back-space,
  .auth-card,
  .auth-logo,
  .auth-title-enter-active,
  .auth-title-leave-active {
    transition: none;
  }
}
</style>
