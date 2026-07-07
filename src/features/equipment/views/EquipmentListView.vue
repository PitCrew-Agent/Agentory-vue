<script setup>
import { onMounted, ref } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import EquipmentListPanel from '@/features/equipment/components/EquipmentListPanel.vue'
import {
  equipmentListGroups,
  loadEquipmentListMock,
} from '@/features/equipment/mock/equipmentListMock'

const groups = ref(equipmentListGroups)

onMounted(async () => {
  groups.value = await loadEquipmentListMock()
})
</script>

<template>
  <DashboardFramePage active-navigation-id="equipment" content-label="설비 목록 영역">
    <EquipmentListPanel :groups="groups" />
  </DashboardFramePage>
</template>
