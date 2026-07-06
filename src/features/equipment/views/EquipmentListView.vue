<script setup>
import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import EquipmentListPanel from '@/features/equipment/components/EquipmentListPanel.vue'
import { equipmentListGroups } from '@/features/equipment/mock/equipmentListMock'
</script>

<template>
  <DashboardFramePage active-navigation-id="equipment" content-label="설비 목록 영역">
    <EquipmentListPanel :groups="equipmentListGroups" />
  </DashboardFramePage>
</template>
