<script setup>
import { RouterLink } from 'vue-router'

import backArrowIcon from '@/assets/icons/back-arrow.png'
import logoImage from '@/assets/images/agentory-logo.png'
import AuthOnboardingShowcase from '@/features/auth/components/AuthOnboardingShowcase.vue'
import AppPreferenceControls from '@/features/i18n/components/AppPreferenceControls.vue'

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
    <div class="auth-layout-frame">
      <AppPreferenceControls
        class="auth-layout-frame__preferences"
        test-prefix="auth-preferences"
        variant="auth"
      />

      <section class="auth-content" :class="`auth-content--${cardVariant}`">
        <div class="auth-card" :class="`auth-card--${cardVariant}`">
          <div class="auth-form-wrap">
            <div class="auth-title-row" :class="{ 'auth-title-row--with-back': showBack }">
              <span class="auth-back-space" :class="{ 'auth-back-space--visible': showBack }">
                <RouterLink
                  v-if="showBack"
                  class="auth-back-link"
                  :to="backTo"
                  :aria-label="$t('common.back')"
                >
                  <img class="auth-back-icon" :src="backArrowIcon" alt="" width="30" height="30" />
                </RouterLink>
              </span>
              <h1 class="auth-title">{{ title }}</h1>
            </div>
            <slot />
          </div>
        </div>
      </section>

      <section class="auth-visual">
        <div class="auth-visual-panel">
          <img class="auth-logo" :src="logoImage" alt="Agentory" width="402" height="74" />
          <AuthOnboardingShowcase />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  --auth-back-gap: var(--agentory-spacing-6);
  --auth-back-size: 30px;
  --auth-card-padding-bottom: clamp(40px, 6.73dvh, 72px);
  --auth-card-padding-top: clamp(30px, 4.26dvh, 46px);
  --auth-card-padding-x: clamp(32px, 2.5vw, 48px);
  --auth-card-offset-bottom: clamp(24px, 3.7dvh, 40px);
  --auth-card-offset-top: clamp(50px, 6.85dvh, 74px);
  --auth-card-width: calc(var(--auth-form-width) + (var(--auth-card-padding-x) * 2));
  --auth-control-font-size: clamp(14px, 0.99vw, 19px);
  --auth-control-height: clamp(42px, 5.19dvh, 56px);
  --auth-control-radius: var(--agentory-radius-10);
  --auth-field-gap: clamp(7px, 1.11dvh, 12px);
  --auth-field-margin: clamp(15px, 2.04dvh, 22px);
  --auth-form-width: clamp(300px, 24.69vw, 474px);
  --auth-label-font-size: clamp(14px, 0.99vw, 19px);
  --auth-link-font-size: clamp(12px, 0.73vw, 14px);
  --auth-logo-width: clamp(190px, 14.9vw, 286px);
  --auth-title-font-size: clamp(24px, 1.56vw, 30px);
  --auth-title-line-height: clamp(34px, 4.17dvh, 45px);
  --auth-title-margin: clamp(18px, 2.31dvh, 25px);

  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  padding: clamp(24px, 4.45dvh, 48px) clamp(24px, 5vw, 96px);
  overflow: hidden;
  background: var(--agentory-color-bg-surface);
}

.auth-layout-frame {
  position: relative;
  display: grid;
  grid-template-columns: 751fr 869fr;
  width: min(
    1280px,
    calc(100vw - clamp(48px, 8vw, 120px)),
    calc((100dvh - clamp(72px, 9dvh, 96px)) * 1.5385)
  );
  aspect-ratio: 1280 / 832;
  min-height: 0;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-22);
  box-shadow: var(--agentory-shadow-auth-panel);
}

.auth-layout-frame__preferences {
  position: absolute;
  z-index: 5;
  top: clamp(14px, 2.22dvh, 24px);
  right: clamp(16px, 1.88vw, 30px);
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
  padding: var(--auth-card-offset-top) 0 var(--auth-card-offset-bottom);
  background: var(--agentory-color-bg-app);
}

.auth-content::before {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  width: clamp(180px, 16vw, 300px);
  height: clamp(180px, 16vw, 300px);
  background: var(--agentory-color-bg-primary);
  content: '';
  pointer-events: none;
}

.auth-content::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--agentory-color-bg-app);
  border-top-right-radius: clamp(92px, 7.82vw, 150px);
  content: '';
  pointer-events: none;
}

.auth-visual {
  position: relative;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
}

.auth-visual-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(18px, 3.7dvh, 40px);
  min-height: 0;
  padding: clamp(28px, 4.63dvh, 50px) clamp(24px, 3.13vw, 40px);
  background: var(--agentory-color-bg-primary);
  border-top-right-radius: var(--agentory-radius-22);
  border-bottom-right-radius: var(--agentory-radius-22);
  border-bottom-left-radius: clamp(92px, 7.82vw, 150px);
}

.auth-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  width: var(--auth-card-width);
  max-width: calc(100% - clamp(28px, 5vw, 90px));
  max-height: 100%;
  min-height: min(610px, 100%);
  padding: var(--auth-card-padding-top) var(--auth-card-padding-x) var(--auth-card-padding-bottom);
  border-radius: var(--agentory-radius-10);
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--agentory-color-bg-auth-panel);
  backdrop-filter: var(--agentory-blur-auth-panel);
  transition:
    width 220ms ease,
    min-height 220ms ease,
    padding 220ms ease;
  scrollbar-color: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 42%) transparent;
  scrollbar-width: thin;
}

.auth-card::-webkit-scrollbar {
  width: 4px;
}

.auth-card::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--agentory-color-bg-primary), transparent 42%);
  border-radius: var(--agentory-radius-pill);
}

.auth-page--signup {
  --auth-card-padding-bottom: clamp(32px, 4.81dvh, 52px);
  --auth-field-gap: clamp(5px, 0.65dvh, 7px);
  --auth-field-margin: clamp(7px, 0.93dvh, 10px);
  --auth-label-font-size: clamp(13px, 0.89vw, 17px);
}

.auth-back-space {
  position: relative;
  flex: 0 0 auto;
  width: 0;
  height: var(--auth-back-size);
  margin-right: 0;
  overflow: hidden;
  visibility: hidden;
  transition:
    width 240ms ease,
    margin-right 240ms ease;
}

.auth-back-space--visible {
  width: var(--auth-back-size);
  margin-right: var(--auth-back-gap);
  visibility: visible;
}

.auth-back-link {
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
  filter: brightness(0) saturate(100%) invert(40%) sepia(99%) saturate(2223%) hue-rotate(199deg)
    brightness(93%) contrast(91%);
  object-fit: contain;
}

.auth-logo {
  flex: 0 0 auto;
  width: var(--auth-logo-width);
  height: auto;
  object-fit: contain;
  transition:
    width 240ms ease,
    transform 240ms ease;
}

.auth-form-wrap {
  width: var(--auth-form-width);
  max-width: 100%;
}

.auth-title-row {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0 0 var(--auth-title-margin);
  overflow: hidden;
}

.auth-title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--agentory-color-text-primary);
  font-family: var(--agentory-font-family-base);
  font-size: var(--auth-title-font-size);
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--auth-title-line-height);
  letter-spacing: var(--agentory-letter-spacing-default);
}

@media (max-width: 1024px) {
  .auth-layout-frame__preferences {
    --preference-control-background: var(--agentory-color-bg-primary);
  }

  .auth-layout-frame {
    grid-template-columns: 1fr;
    width: min(720px, calc(100vw - clamp(48px, 8vw, 80px)));
    height: min(720px, calc(100dvh - clamp(48px, 8dvh, 80px)));
    aspect-ratio: auto;
  }

  .auth-visual {
    display: none;
  }

  .auth-content {
    background: var(--agentory-color-bg-app);
  }

  .auth-content::before {
    display: none;
  }

  .auth-content::after {
    border-top-right-radius: 0;
  }
}

@media (max-width: 520px) {
  .auth-page {
    --auth-back-gap: 6px;
    --auth-card-padding-bottom: 36px;
    --auth-card-padding-top: 34px;
    --auth-card-padding-x: 28px;
    --auth-form-width: min(100%, 300px);
    padding: var(--agentory-spacing-16);
  }

  .auth-card {
    width: 100%;
    min-height: auto;
    max-width: calc(100% - var(--agentory-spacing-24));
  }

  .auth-layout-frame {
    width: calc(100vw - (var(--agentory-spacing-16) * 2));
    height: calc(100dvh - (var(--agentory-spacing-16) * 2));
  }

  .auth-title-row {
    width: 100%;
    margin-left: 0;
  }

  .auth-back-space {
    width: 0;
  }

  .auth-back-space--visible {
    width: var(--auth-back-size);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-back-space,
  .auth-card,
  .auth-logo {
    transition: none;
  }
}
</style>
