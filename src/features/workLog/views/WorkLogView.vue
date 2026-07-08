<script setup>
import { onMounted, ref } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import WorkLogPanel from '@/features/workLog/components/WorkLogPanel.vue'
import { createWorkLogRequest, fetchWorkLogGroups } from '@/features/workLog/services/workLogApi'

const workLogGroupState = ref([])
const shouldSkipWorkLogApi = import.meta.env.MODE === 'test'

function insertWorkLog(log) {
  let targetGroup = workLogGroupState.value.find((group) => group.id === log.date)

  if (!targetGroup) {
    targetGroup = {
      date: log.date,
      id: log.date,
      logs: [],
    }
    workLogGroupState.value.unshift(targetGroup)
  }

  targetGroup.logs.unshift(log)
}

async function loadWorkLogs() {
  try {
    workLogGroupState.value = await fetchWorkLogGroups()
  } catch {
    workLogGroupState.value = []
  }
}

async function createWorkLog(log) {
  try {
    const createdLog = await createWorkLogRequest(log)

    insertWorkLog(createdLog)
  } catch {
    // 저장 실패 시 임시 데이터로 대체하지 않는다.
  }
}

onMounted(() => {
  if (shouldSkipWorkLogApi) {
    return
  }

  loadWorkLogs()
})
</script>

<template>
  <DashboardFramePage active-navigation-id="workLog" content-label="작업 로그 영역">
    <WorkLogPanel :groups="workLogGroupState" @create-log="createWorkLog" />
  </DashboardFramePage>
</template>
