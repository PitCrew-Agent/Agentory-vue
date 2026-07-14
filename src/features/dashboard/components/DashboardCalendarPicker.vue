<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import calendarIcon from '@/assets/icons/dashboard/calendar.svg'

const props = defineProps({
  ariaLabel: {
    type: String,
    required: true,
  },
  dataTestPrefix: {
    type: String,
    required: true,
  },
  dates: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['select'])
const { locale, t, tm } = useI18n()
const isOpen = ref(false)
const currentMonthIndex = ref(0)

const monthFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      year: 'numeric',
    }),
)
const weekdayLabels = computed(() => tm('calendar.weekdays'))

const availableDateSet = computed(() => new Set(props.dates))
const sortedDates = computed(() => [...props.dates].sort())
const availableMonths = computed(() => {
  const monthSet = new Set(sortedDates.value.map((date) => date.slice(0, 7)))

  return [...monthSet].sort()
})

const currentMonth = computed(
  () => availableMonths.value[currentMonthIndex.value] ?? sortedDates.value[0]?.slice(0, 7),
)
const currentMonthLabel = computed(() => {
  if (!currentMonth.value) {
    return ''
  }

  const [year, month] = currentMonth.value.split('-').map(Number)

  return monthFormatter.value.format(new Date(year, month - 1, 1))
})

const calendarCells = computed(() => {
  if (!currentMonth.value) {
    return []
  }

  const [year, month] = currentMonth.value.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const dayCount = new Date(year, month, 0).getDate()
  const cells = Array.from({ length: firstDay.getDay() }, (_, index) => ({
    id: `blank-${index}`,
    isBlank: true,
  }))

  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${currentMonth.value}-${String(day).padStart(2, '0')}`

    cells.push({
      date,
      day,
      id: date,
      isAvailable: availableDateSet.value.has(date),
      isBlank: false,
    })
  }

  return cells
})

function openCalendar() {
  currentMonthIndex.value = Math.max(availableMonths.value.length - 1, 0)
  isOpen.value = true
}

function toggleCalendar() {
  if (isOpen.value) {
    isOpen.value = false
    return
  }

  openCalendar()
}

function moveMonth(delta) {
  currentMonthIndex.value = Math.min(
    Math.max(currentMonthIndex.value + delta, 0),
    availableMonths.value.length - 1,
  )
}

function selectDate(date) {
  emit('select', date)
  isOpen.value = false
}

watch(
  availableMonths,
  (months) => {
    currentMonthIndex.value = Math.max(months.length - 1, 0)
  },
  { immediate: true },
)
</script>

<template>
  <div class="dashboard-calendar-picker">
    <button
      class="dashboard-calendar-picker__toggle"
      type="button"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      :data-test="`${dataTestPrefix}-calendar-toggle`"
      @click="toggleCalendar"
    >
      <img :src="calendarIcon" alt="" width="28" height="28" />
    </button>

    <Transition name="dashboard-calendar-picker">
      <section
        v-if="isOpen"
        class="dashboard-calendar-picker__modal"
        role="dialog"
        aria-modal="false"
        :aria-label="ariaLabel"
        :data-test="`${dataTestPrefix}-calendar-modal`"
      >
        <header class="dashboard-calendar-picker__header">
          <button
            class="dashboard-calendar-picker__month-button"
            type="button"
            :aria-label="t('calendar.previousMonth')"
            :disabled="currentMonthIndex === 0"
            :data-test="`${dataTestPrefix}-calendar-prev`"
            @click="moveMonth(-1)"
          >
            ‹
          </button>
          <strong>{{ currentMonthLabel }}</strong>
          <button
            class="dashboard-calendar-picker__month-button"
            type="button"
            :aria-label="t('calendar.nextMonth')"
            :disabled="currentMonthIndex >= availableMonths.length - 1"
            :data-test="`${dataTestPrefix}-calendar-next`"
            @click="moveMonth(1)"
          >
            ›
          </button>
        </header>

        <div class="dashboard-calendar-picker__weekdays" aria-hidden="true">
          <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="dashboard-calendar-picker__grid">
          <template v-for="cell in calendarCells" :key="cell.id">
            <span
              v-if="cell.isBlank"
              class="dashboard-calendar-picker__day dashboard-calendar-picker__day--blank"
            ></span>
            <button
              v-else
              class="dashboard-calendar-picker__day"
              :class="{ 'dashboard-calendar-picker__day--available': cell.isAvailable }"
              type="button"
              :disabled="!cell.isAvailable"
              :data-test="
                cell.isAvailable ? `${dataTestPrefix}-calendar-date-${cell.date}` : undefined
              "
              @click="selectDate(cell.date)"
            >
              {{ cell.day }}
            </button>
          </template>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.dashboard-calendar-picker {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.dashboard-calendar-picker__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 84%);
  border: 0;
  border-radius: var(--agentory-radius-8);
  cursor: pointer;
  transition:
    background-color 160ms var(--agentory-ease-soft),
    transform 180ms var(--agentory-ease-soft);
}

.dashboard-calendar-picker__toggle img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(48%) sepia(4%) saturate(14%) hue-rotate(33deg)
    brightness(96%) contrast(88%);
}

.dashboard-calendar-picker__toggle:hover {
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 70%);
  transform: translateY(-1px);
}

.dashboard-calendar-picker__modal {
  position: absolute;
  z-index: 14;
  top: calc(100% + var(--agentory-spacing-8));
  left: 0;
  width: 286px;
  padding: var(--agentory-spacing-14);
  background: var(--agentory-color-bg-app);
  border: 1px solid color-mix(in srgb, var(--agentory-color-bg-muted), transparent 42%);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel-soft);
}

.dashboard-calendar-picker__header {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 30px;
  align-items: center;
  gap: var(--agentory-spacing-8);
  margin-bottom: var(--agentory-spacing-10);
}

.dashboard-calendar-picker__header strong {
  color: var(--agentory-color-text-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-body-lg);
  text-align: center;
}

.dashboard-calendar-picker__month-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--agentory-color-text-muted);
  background: color-mix(in srgb, var(--agentory-color-bg-muted), transparent 78%);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  font-size: var(--agentory-font-size-h3);
  line-height: 1;
  cursor: pointer;
}

.dashboard-calendar-picker__month-button:disabled {
  color: var(--agentory-color-text-subtle);
  background: var(--agentory-color-bg-surface);
  cursor: default;
}

.dashboard-calendar-picker__weekdays,
.dashboard-calendar-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--agentory-spacing-6);
}

.dashboard-calendar-picker__weekdays {
  margin-bottom: var(--agentory-spacing-6);
}

.dashboard-calendar-picker__weekdays span {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-bold);
  line-height: var(--agentory-line-height-caption);
  text-align: center;
}

.dashboard-calendar-picker__day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-width: 0;
  color: var(--agentory-color-text-subtle);
  background: var(--agentory-color-bg-surface);
  border: 0;
  border-radius: var(--agentory-radius-8);
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
}

.dashboard-calendar-picker__day--blank {
  background: transparent;
}

.dashboard-calendar-picker__day--available {
  color: var(--agentory-color-text-inverse);
  background: var(--agentory-color-bg-primary);
  cursor: pointer;
}

.dashboard-calendar-picker__day--available:hover {
  background: color-mix(
    in srgb,
    var(--agentory-color-bg-primary),
    var(--agentory-color-text-primary) 14%
  );
}

.dashboard-calendar-picker-enter-active,
.dashboard-calendar-picker-leave-active {
  transition:
    opacity 180ms ease,
    transform 200ms ease;
}

.dashboard-calendar-picker-enter-from,
.dashboard-calendar-picker-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
