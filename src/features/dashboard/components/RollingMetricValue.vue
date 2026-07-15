<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    default: '',
  },
})

const direction = ref('up')
const displayValue = computed(() => String(props.value ?? ''))
const characters = computed(() => [...displayValue.value])
const transitionName = computed(() => `rolling-metric-${direction.value}`)

watch(
  () => props.value,
  (nextValue, previousValue) => {
    const nextNumber = Number(nextValue)
    const previousNumber = Number(previousValue)

    if (Number.isFinite(nextNumber) && Number.isFinite(previousNumber)) {
      direction.value = nextNumber >= previousNumber ? 'up' : 'down'
    }
  },
)

function isDigit(character) {
  return /^\d$/.test(character)
}
</script>

<template>
  <span class="rolling-metric-value" :aria-label="displayValue">
    <template v-for="(character, index) in characters" :key="index">
      <span v-if="isDigit(character)" class="rolling-metric-value__slot" aria-hidden="true">
        <Transition :name="transitionName">
          <span :key="character" class="rolling-metric-value__digit">{{ character }}</span>
        </Transition>
      </span>
      <span v-else class="rolling-metric-value__separator" aria-hidden="true">{{ character }}</span>
    </template>
  </span>
</template>

<style scoped>
.rolling-metric-value {
  display: inline-flex;
  min-width: 0;
  align-items: baseline;
  font: inherit;
  font-variant-numeric: tabular-nums;
  line-height: inherit;
}

.rolling-metric-value__slot {
  display: inline-grid;
  width: 0.62em;
  height: 1.2em;
  overflow: hidden;
  place-items: center;
}

.rolling-metric-value__digit {
  grid-area: 1 / 1;
  line-height: 1.2;
}

.rolling-metric-value__separator {
  line-height: 1.2;
}

.rolling-metric-up-enter-active,
.rolling-metric-up-leave-active,
.rolling-metric-down-enter-active,
.rolling-metric-down-leave-active {
  transition:
    opacity 220ms var(--agentory-ease-soft),
    transform 360ms var(--agentory-ease-elastic);
}

.rolling-metric-up-enter-from,
.rolling-metric-down-leave-to {
  opacity: 0;
  transform: translateY(88%);
}

.rolling-metric-up-leave-to,
.rolling-metric-down-enter-from {
  opacity: 0;
  transform: translateY(-88%);
}

@media (prefers-reduced-motion: reduce) {
  .rolling-metric-up-enter-active,
  .rolling-metric-up-leave-active,
  .rolling-metric-down-enter-active,
  .rolling-metric-down-leave-active {
    transition: none;
  }
}
</style>
