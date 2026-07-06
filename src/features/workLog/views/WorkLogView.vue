<script setup>
import { reactive } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import WorkLogPanel from '@/features/workLog/components/WorkLogPanel.vue'
import { workLogGroups } from '@/features/workLog/mock/workLogMock'

const workLogGroupState = reactive(
  workLogGroups.map((group) => ({
    ...group,
    logs: group.logs.map((log) => ({ ...log })),
  })),
)

function createWorkLog(log) {
  let targetGroup = workLogGroupState.find((group) => group.id === log.date)

  if (!targetGroup) {
    targetGroup = {
      date: log.date,
      id: log.date,
      logs: [],
    }
    workLogGroupState.unshift(targetGroup)
  }

  targetGroup.logs.unshift(log)
}
</script>

<template>
  <DashboardFramePage active-navigation-id="workLog" content-label="작업 로그 영역">
    <WorkLogPanel :groups="workLogGroupState" @create-log="createWorkLog" />
  </DashboardFramePage>
</template>
