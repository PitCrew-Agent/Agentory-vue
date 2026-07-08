<script setup>
import { onMounted, ref } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import EquipmentListPanel from '@/features/equipment/components/EquipmentListPanel.vue'
import { fetchEquipmentListPageData } from '@/features/equipment/services/equipmentApi'

const groups = ref([])
const lineGroups = ref([])
const shouldSkipEquipmentApi = import.meta.env.MODE === 'test'

onMounted(async () => {
  if (shouldSkipEquipmentApi) {
    return
  }

  try {
    const pageData = await fetchEquipmentListPageData()

    groups.value = pageData.groups
    lineGroups.value = pageData.lineGroups
  } catch {
    groups.value = []
    lineGroups.value = []
  }
})
</script>

<template>
  <DashboardFramePage active-navigation-id="equipment" content-label="설비 목록 영역">
    <EquipmentListPanel :groups="groups" :line-groups="lineGroups" />
  </DashboardFramePage>
</template>
