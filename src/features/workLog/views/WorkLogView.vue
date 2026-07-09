<script setup>
import { onMounted, ref } from 'vue'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import WorkLogPanel from '@/features/workLog/components/WorkLogPanel.vue'
import { createWorkLogRequest, fetchWorkLogGroups } from '@/features/workLog/services/workLogApi'

const workLogGroupState = ref([])
const isWorkLogLoading = ref(false)
const isWorkLogSubmitting = ref(false)
const workLogErrorMessage = ref('')
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
  isWorkLogLoading.value = true
  workLogErrorMessage.value = ''

  try {
    workLogGroupState.value = await fetchWorkLogGroups()
  } catch {
    workLogGroupState.value = []
    workLogErrorMessage.value = '작업 로그를 불러오지 못했습니다.'
  } finally {
    isWorkLogLoading.value = false
  }
}

async function createWorkLog(log, controls = {}) {
  if (isWorkLogSubmitting.value) {
    return
  }

  isWorkLogSubmitting.value = true
  workLogErrorMessage.value = ''

  try {
    const createdLog = await createWorkLogRequest(log)

    insertWorkLog(createdLog)
    controls.onSuccess?.()

    try {
      workLogGroupState.value = await fetchWorkLogGroups()
    } catch {
      workLogErrorMessage.value = '작업 로그는 저장됐지만 목록을 다시 불러오지 못했습니다.'
    }
  } catch {
    workLogErrorMessage.value = '작업 로그를 저장하지 못했습니다.'
    controls.onError?.()
  } finally {
    isWorkLogSubmitting.value = false
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
  <DashboardFramePage
    active-navigation-id="workLog"
    content-label="작업 로그 영역"
    :is-loading="isWorkLogLoading"
  >
    <WorkLogPanel
      :error-message="workLogErrorMessage"
      :groups="workLogGroupState"
      :is-loading="isWorkLogLoading"
      :is-submitting="isWorkLogSubmitting"
      @create-log="createWorkLog"
    />
  </DashboardFramePage>
</template>
