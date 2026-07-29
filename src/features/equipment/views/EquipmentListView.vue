<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import EquipmentListPanel from '@/features/equipment/components/EquipmentListPanel.vue'
import { fetchEquipmentListPageData } from '@/features/equipment/services/equipmentApi'

const groups = ref([])
const { t } = useI18n()
const isEquipmentListLoading = ref(false)
const lineGroups = ref([])
const shouldSkipEquipmentApi = import.meta.env.MODE === 'test'
let equipmentListInterval = 0
let equipmentListRequestId = 0
let isEquipmentListLoadInFlight = false

async function loadEquipmentListPageData(options = {}) {
  if (shouldSkipEquipmentApi) {
    return
  }

  const isSilent = options.silent === true

  // 이전 로드가 진행 중이면 폴링(무음) 호출은 건너뛰어 요청 중첩을 막는다.
  if (isSilent && isEquipmentListLoadInFlight) {
    return
  }

  const requestId = ++equipmentListRequestId
  isEquipmentListLoadInFlight = true

  if (!isSilent) {
    isEquipmentListLoading.value = true
  }

  try {
    const pageData = await fetchEquipmentListPageData()

    if (requestId !== equipmentListRequestId) {
      return
    }

    groups.value = pageData.groups
    lineGroups.value = pageData.lineGroups
  } catch {
    if (!groups.value.length) {
      groups.value = []
      lineGroups.value = []
    }
  } finally {
    isEquipmentListLoadInFlight = false

    if (!isSilent) {
      isEquipmentListLoading.value = false
    }
  }
}

onMounted(() => {
  if (shouldSkipEquipmentApi) {
    return
  }

  loadEquipmentListPageData()
  equipmentListInterval = window.setInterval(
    () => loadEquipmentListPageData({ silent: true }),
    5000,
  )
})

onBeforeUnmount(() => {
  window.clearInterval(equipmentListInterval)
})
</script>

<template>
  <DashboardFramePage
    active-navigation-id="equipment"
    :content-label="t('equipmentList.contentLabel')"
    :is-loading="isEquipmentListLoading"
  >
    <EquipmentListPanel :groups="groups" :line-groups="lineGroups" />
  </DashboardFramePage>
</template>
