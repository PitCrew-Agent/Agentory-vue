<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import calendarIcon from '@/assets/icons/dashboard/calendar.svg'
import previousIcon from '@/assets/icons/dashboard/chat-back.svg'

const props = defineProps({
  align: {
    type: String,
    default: 'start',
    validator: (value) => ['start', 'end'].includes(value),
  },
  dataTest: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
const { locale, t, tm } = useI18n()
const fieldRef = ref(null)
const isOpen = ref(false)
const pickerRef = ref(null)
const pickerStyle = ref({ left: '-9999px', top: '-9999px' })
const viewMonth = ref(new Date().getMonth())
const viewYear = ref(new Date().getFullYear())

const weekdayLabels = computed(() => tm('calendar.weekdays'))
const selectedDate = computed(() => {
  const date = new Date(props.modelValue)

  return Number.isNaN(date.getTime()) ? new Date() : date
})
const displayValue = computed(() =>
  new Intl.DateTimeFormat(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(selectedDate.value),
)
const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(viewYear.value, viewMonth.value, 1)),
)
const hourLabel = computed(() => String(selectedDate.value.getHours()).padStart(2, '0'))
const minuteLabel = computed(() => String(selectedDate.value.getMinutes()).padStart(2, '0'))
const calendarCells = computed(() => {
  const firstWeekday = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const dayCount = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1

    return day > 0 && day <= dayCount
      ? { day, id: `${viewYear.value}-${viewMonth.value}-${day}` }
      : { day: null, id: `blank-${index}` }
  })
})

function isSelectedDay(day) {
  return (
    day === selectedDate.value.getDate() &&
    viewMonth.value === selectedDate.value.getMonth() &&
    viewYear.value === selectedDate.value.getFullYear()
  )
}

function isToday(day) {
  const today = new Date()

  return (
    day === today.getDate() &&
    viewMonth.value === today.getMonth() &&
    viewYear.value === today.getFullYear()
  )
}

function emitDate(date) {
  emit('update:modelValue', date.toISOString())
}

function selectDay(day) {
  if (!day) {
    return
  }

  emitDate(
    new Date(
      viewYear.value,
      viewMonth.value,
      day,
      selectedDate.value.getHours(),
      selectedDate.value.getMinutes(),
    ),
  )
}

function moveMonth(delta) {
  const nextMonth = new Date(viewYear.value, viewMonth.value + delta, 1)

  viewYear.value = nextMonth.getFullYear()
  viewMonth.value = nextMonth.getMonth()
}

function adjustTime(unit, delta) {
  const nextDate = new Date(selectedDate.value)

  if (unit === 'hour') {
    nextDate.setHours(nextDate.getHours() + delta)
  } else {
    nextDate.setMinutes(nextDate.getMinutes() + delta * 5)
  }

  emitDate(nextDate)
  viewYear.value = nextDate.getFullYear()
  viewMonth.value = nextDate.getMonth()
}

async function updatePickerPosition() {
  await nextTick()

  const trigger = fieldRef.value?.querySelector('.chart-date-time-field__trigger')
  const picker = pickerRef.value

  if (!trigger || !picker || !isOpen.value) {
    return
  }

  const viewportMargin = 8
  const pickerGap = 8
  const triggerRect = trigger.getBoundingClientRect()
  const pickerRect = picker.getBoundingClientRect()
  const pickerWidth = pickerRect.width || 268
  const pickerHeight = pickerRect.height || 352
  const availableBelow = window.innerHeight - triggerRect.bottom - viewportMargin
  const availableAbove = triggerRect.top - viewportMargin
  const shouldOpenAbove =
    availableBelow < pickerHeight + pickerGap && availableAbove > availableBelow
  const preferredLeft = props.align === 'end' ? triggerRect.right - pickerWidth : triggerRect.left
  const left = Math.min(
    Math.max(preferredLeft, viewportMargin),
    Math.max(viewportMargin, window.innerWidth - pickerWidth - viewportMargin),
  )
  const preferredTop = shouldOpenAbove
    ? triggerRect.top - pickerHeight - pickerGap
    : triggerRect.bottom + pickerGap
  const top = Math.min(
    Math.max(preferredTop, viewportMargin),
    Math.max(viewportMargin, window.innerHeight - pickerHeight - viewportMargin),
  )

  pickerStyle.value = {
    left: `${left}px`,
    maxHeight: `${Math.max(window.innerHeight - viewportMargin * 2, 180)}px`,
    top: `${top}px`,
  }
}

async function openPicker() {
  viewYear.value = selectedDate.value.getFullYear()
  viewMonth.value = selectedDate.value.getMonth()
  pickerStyle.value = { left: '-9999px', top: '-9999px' }
  isOpen.value = true
  await updatePickerPosition()
}

function togglePicker() {
  if (isOpen.value) {
    isOpen.value = false
    return
  }

  openPicker()
}

function handleDocumentPointerDown(event) {
  if (!fieldRef.value?.contains(event.target) && !pickerRef.value?.contains(event.target)) {
    isOpen.value = false
  }
}

function handleViewportChange() {
  if (isOpen.value) {
    updatePickerPosition()
  }
}

watch(
  () => props.modelValue,
  () => {
    if (!isOpen.value) {
      viewYear.value = selectedDate.value.getFullYear()
      viewMonth.value = selectedDate.value.getMonth()
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>

<template>
  <div ref="fieldRef" class="chart-date-time-field" :class="`chart-date-time-field--${align}`">
    <span class="chart-date-time-field__label">{{ label }}</span>
    <button
      class="chart-date-time-field__trigger"
      type="button"
      :aria-expanded="isOpen"
      :aria-label="t('chart.selectDateTime', { label })"
      :data-test="dataTest"
      @click="togglePicker"
    >
      <img :src="calendarIcon" alt="" width="16" height="16" />
      <span>{{ displayValue }}</span>
    </button>

    <Teleport to="body">
      <Transition name="chart-date-time-picker">
        <section
          v-if="isOpen"
          ref="pickerRef"
          class="chart-date-time-field__picker"
          role="dialog"
          :aria-label="t('chart.selectDateTime', { label })"
          :style="pickerStyle"
        >
          <header class="chart-date-time-field__month-header">
            <button type="button" :aria-label="t('calendar.previousMonth')" @click="moveMonth(-1)">
              <img :src="previousIcon" alt="" width="18" height="18" />
            </button>
            <strong>{{ monthLabel }}</strong>
            <button type="button" :aria-label="t('calendar.nextMonth')" @click="moveMonth(1)">
              <img
                class="chart-date-time-field__next-icon"
                :src="previousIcon"
                alt=""
                width="18"
                height="18"
              />
            </button>
          </header>

          <div class="chart-date-time-field__weekdays" aria-hidden="true">
            <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
          </div>

          <div class="chart-date-time-field__days">
            <template v-for="cell in calendarCells" :key="cell.id">
              <span v-if="!cell.day" aria-hidden="true"></span>
              <button
                v-else
                type="button"
                :class="{
                  'chart-date-time-field__day--selected': isSelectedDay(cell.day),
                  'chart-date-time-field__day--today': isToday(cell.day),
                }"
                @click="selectDay(cell.day)"
              >
                {{ cell.day }}
              </button>
            </template>
          </div>

          <div class="chart-date-time-field__time">
            <div>
              <span>{{ t('chart.hour') }}</span>
              <p>
                <button
                  type="button"
                  :aria-label="t('chart.decreaseHour')"
                  @click="adjustTime('hour', -1)"
                >
                  −
                </button>
                <strong>{{ hourLabel }}</strong>
                <button
                  type="button"
                  :aria-label="t('chart.increaseHour')"
                  @click="adjustTime('hour', 1)"
                >
                  +
                </button>
              </p>
            </div>
            <i aria-hidden="true">:</i>
            <div>
              <span>{{ t('chart.minute') }}</span>
              <p>
                <button
                  type="button"
                  :aria-label="t('chart.decreaseMinute')"
                  @click="adjustTime('minute', -1)"
                >
                  −
                </button>
                <strong>{{ minuteLabel }}</strong>
                <button
                  type="button"
                  :aria-label="t('chart.increaseMinute')"
                  @click="adjustTime('minute', 1)"
                >
                  +
                </button>
              </p>
            </div>
          </div>

          <button class="chart-date-time-field__done" type="button" @click="isOpen = false">
            {{ t('chart.done') }}
          </button>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.chart-date-time-field {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--agentory-spacing-4);
}

.chart-date-time-field__label {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
}

.chart-date-time-field__trigger {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 var(--agentory-spacing-8);
  align-items: center;
  gap: var(--agentory-spacing-6);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-caption);
  cursor: pointer;
}

.chart-date-time-field__trigger img {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  filter: var(--agentory-filter-header-action);
}

.chart-date-time-field__trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-date-time-field__picker {
  position: fixed;
  z-index: 300;
  display: flex;
  width: 268px;
  overflow-y: auto;
  padding: var(--agentory-spacing-12);
  flex-direction: column;
  gap: var(--agentory-spacing-8);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border: 1px solid var(--agentory-color-table-divider);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-panel);
}

.chart-date-time-field__month-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--agentory-spacing-6);
}

.chart-date-time-field__month-header > button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  padding: 0;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.chart-date-time-field__month-header img {
  filter: var(--agentory-filter-header-action);
}

.chart-date-time-field__next-icon {
  transform: rotate(180deg);
}

.chart-date-time-field__month-header strong {
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  text-align: center;
}

.chart-date-time-field__weekdays,
.chart-date-time-field__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--agentory-spacing-2);
}

.chart-date-time-field__weekdays span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  text-align: center;
}

.chart-date-time-field__days > span,
.chart-date-time-field__days > button {
  aspect-ratio: 1;
  min-width: 0;
}

.chart-date-time-field__days > button {
  display: inline-flex;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: var(--agentory-color-text-primary);
  background: transparent;
  border: 0;
  border-radius: var(--agentory-radius-5);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-caption);
  cursor: pointer;
}

.chart-date-time-field__days > button:hover,
.chart-date-time-field__day--today {
  background: var(--agentory-color-bg-surface) !important;
}

.chart-date-time-field__day--selected {
  color: var(--agentory-color-text-inverse) !important;
  background: var(--agentory-color-bg-primary) !important;
  font-weight: var(--agentory-font-weight-bold);
}

.chart-date-time-field__time {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: var(--agentory-spacing-6);
  padding-top: var(--agentory-spacing-8);
  border-top: 1px solid var(--agentory-color-table-divider);
}

.chart-date-time-field__time > div {
  display: grid;
  gap: var(--agentory-spacing-4);
}

.chart-date-time-field__time > div > span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  text-align: center;
}

.chart-date-time-field__time p {
  display: grid;
  min-height: 30px;
  margin: 0;
  grid-template-columns: 28px minmax(34px, 1fr) 28px;
  align-items: center;
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-8);
}

.chart-date-time-field__time p button {
  height: 100%;
  padding: 0;
  color: var(--agentory-color-text-muted);
  background: transparent;
  border: 0;
  font-size: var(--agentory-font-size-body-lg);
  cursor: pointer;
}

.chart-date-time-field__time p strong {
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  text-align: center;
}

.chart-date-time-field__time > i {
  padding-bottom: var(--agentory-spacing-6);
  color: var(--agentory-color-text-muted);
  font-style: normal;
  font-weight: var(--agentory-font-weight-bold);
}

.chart-date-time-field__done {
  min-height: 30px;
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-family: var(--agentory-font-family-base);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-semi-bold);
  cursor: pointer;
}

.chart-date-time-picker-enter-active,
.chart-date-time-picker-leave-active {
  transition:
    opacity 150ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.chart-date-time-picker-enter-from,
.chart-date-time-picker-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}
</style>
