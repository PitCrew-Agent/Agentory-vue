<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import aiEvidenceDocumentsImage from '@/assets/images/onboarding/ai-evidence-documents.png'
import equipmentRiskAlertImage from '@/assets/images/onboarding/equipment-risk-alert.png'
import factoryEquipmentMonitoringImage from '@/assets/images/onboarding/factory-equipment-monitoring.png'

const carouselStep = 120
const rotationDelay = 4600

const slides = [
  {
    id: 'factory-monitoring',
    image: factoryEquipmentMonitoringImage,
    titleLines: ['공장 장비 상태', '한눈에 모니터링'],
    descriptionLines: [
      '3D 공장 전경과 장비 상태 그래프를 함께 확인하고',
      '이상 징후와 생산 현황을 빠르게 파악하세요.',
    ],
  },
  {
    id: 'risk-alert',
    image: equipmentRiskAlertImage,
    titleLines: ['장비 위험 알림', '즉시 확인'],
    descriptionLines: [
      '장비별 위험 · 주의 알림을 빠르게 파악하고',
      '긴급도 높은 이슈부터 즉시 대응하세요.',
    ],
  },
  {
    id: 'ai-evidence',
    image: aiEvidenceDocumentsImage,
    titleLines: ['AI 근거 문서', '기반 확인'],
    descriptionLines: ['RAG 기반으로', 'AI가 답변 근거를 높은 정확도로 빠르게 찾아줍니다.'],
  },
]

const serviceSummaryLines = [
  '3D 공장 모니터링과 장비 위험 알림,',
  'AI 근거 문서까지 한 화면에서 확인하세요.',
]

const rotationIndex = ref(0)
let rotationTimer

const activeIndex = computed(
  () => ((rotationIndex.value % slides.length) + slides.length) % slides.length,
)

const ringStyle = computed(() => ({
  '--showcase-ring-angle': `${rotationIndex.value * -carouselStep}deg`,
}))

function getRelativePosition(index) {
  const total = slides.length
  const rawOffset = index - activeIndex.value

  return ((rawOffset + total + Math.floor(total / 2)) % total) - Math.floor(total / 2)
}

function getPanelStyle(index) {
  const isActive = getRelativePosition(index) === 0

  return {
    '--showcase-back-opacity': isActive ? '0' : '0.72',
    '--showcase-front-opacity': isActive ? '1' : '0.2',
    '--showcase-panel-angle': `${index * carouselStep}deg`,
    '--showcase-panel-scale': isActive ? '1' : '0.92',
  }
}

function stopRotation() {
  window.clearInterval(rotationTimer)
}

function startRotation() {
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return
  }

  stopRotation()
  rotationTimer = window.setInterval(() => {
    rotationIndex.value += 1
  }, rotationDelay)
}

function setActiveSlide(index) {
  const forwardStep = (index - activeIndex.value + slides.length) % slides.length

  rotationIndex.value += forwardStep
  startRotation()
}

onMounted(startRotation)

onBeforeUnmount(stopRotation)
</script>

<template>
  <div class="auth-onboarding" aria-label="Agentory 핵심 기능 소개">
    <div class="auth-onboarding__stage">
      <div class="auth-onboarding__ring" :style="ringStyle">
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          class="auth-onboarding__panel"
          :class="{ 'auth-onboarding__panel--active': index === activeIndex }"
          type="button"
          :style="getPanelStyle(index)"
          :aria-label="`${slide.titleLines.join(' ')} 보기`"
          :aria-pressed="index === activeIndex"
          @click="setActiveSlide(index)"
        >
          <span class="auth-onboarding__face auth-onboarding__face--front">
            <img
              class="auth-onboarding__image"
              :src="slide.image"
              :alt="slide.titleLines.join(' ')"
            />
          </span>

          <span class="auth-onboarding__face auth-onboarding__face--back" aria-hidden="true">
            <span class="auth-onboarding__back-mark"></span>
          </span>
        </button>
      </div>
    </div>

    <p class="auth-onboarding__summary">
      <span v-for="line in serviceSummaryLines" :key="line">{{ line }}</span>
    </p>

    <div class="auth-onboarding__controls" aria-label="온보딩 화면 선택">
      <button
        v-for="(slide, index) in slides"
        :key="`${slide.id}-control`"
        class="auth-onboarding__control"
        :class="{ 'auth-onboarding__control--active': index === activeIndex }"
        type="button"
        :aria-label="slide.titleLines.join(' ')"
        :aria-current="index === activeIndex"
        @click="setActiveSlide(index)"
      ></button>
    </div>
  </div>
</template>

<style scoped>
.auth-onboarding {
  --showcase-image-size: clamp(250px, 20.31vw, 390px);
  --showcase-panel-height: var(--showcase-image-size);
  --showcase-panel-width: var(--showcase-image-size);
  --showcase-radius: clamp(150px, 12.92vw, 248px);
  --showcase-stage-height: var(--showcase-image-size);
  --showcase-stage-width: clamp(300px, 27.08vw, 520px);

  display: grid;
  align-content: center;
  justify-items: center;
  width: min(100%, var(--showcase-stage-width));
  min-height: 0;
  color: var(--agentory-color-text-inverse);
}

.auth-onboarding__stage {
  position: relative;
  width: min(100%, var(--showcase-stage-width));
  height: var(--showcase-stage-height);
  perspective: clamp(820px, 64vw, 1180px);
  perspective-origin: center 50%;
}

.auth-onboarding__ring {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--showcase-radius) * -1)) rotateY(var(--showcase-ring-angle));
  transform-style: preserve-3d;
  transition: transform 1150ms cubic-bezier(0.2, 0.74, 0.18, 1);
}

.auth-onboarding__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--showcase-panel-width);
  height: var(--showcase-panel-height);
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  opacity: 0.58;
  transform: translate3d(-50%, -50%, 0) rotateY(var(--showcase-panel-angle))
    translateZ(var(--showcase-radius)) scale(var(--showcase-panel-scale));
  transform-style: preserve-3d;
  transition:
    opacity 780ms ease,
    filter 780ms ease,
    transform 780ms ease;
}

.auth-onboarding__panel--active {
  cursor: default;
  opacity: 1;
}

.auth-onboarding__face {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  overflow: hidden;
  border-radius: var(--agentory-radius-10);
  backface-visibility: hidden;
  transition: opacity 520ms ease;
}

.auth-onboarding__face--front {
  gap: 0;
  overflow: visible;
  opacity: var(--showcase-front-opacity);
}

.auth-onboarding__face--back {
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--agentory-color-bg-app), transparent 4%),
      color-mix(in srgb, var(--agentory-color-bg-primary), transparent 84%)
    ),
    var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 76%);
  box-shadow: 0 22px 50px rgba(35, 124, 226, 0.16);
  opacity: var(--showcase-back-opacity);
  transform: rotateY(180deg);
}

.auth-onboarding__back-mark {
  width: clamp(76px, 7.5vw, 126px);
  height: clamp(76px, 7.5vw, 126px);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-primary), transparent 65%);
  border-radius: var(--agentory-radius-pill);
  background:
    radial-gradient(circle at 50% 50%, rgba(35, 124, 226, 0.16) 0 26%, transparent 27%),
    radial-gradient(circle at 50% 50%, rgba(35, 124, 226, 0.08) 0 56%, transparent 57%);
}

.auth-onboarding__image {
  width: var(--showcase-image-size);
  height: var(--showcase-image-size);
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.auth-onboarding__summary {
  display: grid;
  gap: var(--agentory-spacing-4);
  width: min(100%, clamp(320px, 29vw, 560px));
  margin: 10px 0 0;
  color: var(--agentory-color-text-inverse);
  font-family: var(--agentory-font-family-base);
  font-size: clamp(15px, 1.04vw, 20px);
  font-weight: var(--agentory-font-weight-regular);
  line-height: 1.35;
  letter-spacing: 0.1em;
  text-align: center;
  word-break: keep-all;
}

.auth-onboarding__controls {
  display: flex;
  gap: var(--agentory-spacing-8);
  margin-top: clamp(18px, 2.6dvh, 28px);
}

.auth-onboarding__control {
  width: clamp(7px, 0.56vw, 9px);
  height: clamp(7px, 0.56vw, 9px);
  padding: 0;
  background: color-mix(in srgb, var(--agentory-color-bg-app), transparent 62%);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  transition:
    width 220ms ease,
    background 220ms ease;
}

.auth-onboarding__control--active {
  width: clamp(22px, 1.65vw, 32px);
  background: var(--agentory-color-bg-app);
}

@media (max-height: 760px) {
  .auth-onboarding {
    --showcase-image-size: clamp(220px, 27vw, 320px);
    --showcase-radius: clamp(136px, 15vw, 210px);
  }
}

@media (max-width: 1280px) {
  .auth-onboarding {
    --showcase-stage-width: clamp(330px, 39vw, 500px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-onboarding__control,
  .auth-onboarding__panel,
  .auth-onboarding__ring {
    transition: none;
  }
}
</style>
