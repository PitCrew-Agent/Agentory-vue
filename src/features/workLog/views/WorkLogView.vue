<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardFramePage from '@/features/dashboard/components/DashboardFramePage.vue'
import WorkLogPanel from '@/features/workLog/components/WorkLogPanel.vue'
import {
  createWorkLogRequest,
  deleteWorkLogRequest,
  fetchWorkLogGroups,
  updateWorkLogRequest,
} from '@/features/workLog/services/workLogApi'
import { useIncidentPlanStore } from '@/features/incident/stores/incidentPlanStore'

const incidentPlanStore = useIncidentPlanStore()
const { t } = useI18n()
const workLogGroupState = ref([])
const isWorkLogLoading = ref(false)
const isWorkLogSubmitting = ref(false)
const workLogErrorMessage = ref('')
const shouldSkipWorkLogApi = import.meta.env.MODE === 'test'
const pendingIncidentPlan = computed(() => incidentPlanStore.pendingPlan)

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
    workLogErrorMessage.value = t('workLog.errors.load')
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
      workLogErrorMessage.value = t('workLog.errors.refresh')
    }
  } catch {
    workLogErrorMessage.value = t('workLog.errors.create')
    controls.onError?.()
  } finally {
    isWorkLogSubmitting.value = false
  }
}

async function updateWorkLog(log, controls = {}) {
  if (isWorkLogSubmitting.value) {
    return
  }

  isWorkLogSubmitting.value = true
  workLogErrorMessage.value = ''

  try {
    await updateWorkLogRequest(log)
    controls.onSuccess?.()

    try {
      workLogGroupState.value = await fetchWorkLogGroups()
    } catch {
      workLogErrorMessage.value = t('workLog.errors.updateRefresh')
    }
  } catch {
    workLogErrorMessage.value = t('workLog.errors.update')
    controls.onError?.()
  } finally {
    isWorkLogSubmitting.value = false
  }
}

async function deleteWorkLog(logId, controls = {}) {
  if (isWorkLogSubmitting.value) {
    return
  }

  isWorkLogSubmitting.value = true
  workLogErrorMessage.value = ''

  try {
    await deleteWorkLogRequest(logId)
    controls.onSuccess?.()

    try {
      workLogGroupState.value = await fetchWorkLogGroups()
    } catch {
      workLogErrorMessage.value = t('workLog.errors.deleteRefresh')
    }
  } catch {
    workLogErrorMessage.value = t('workLog.errors.delete')
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
    :content-label="t('workLog.contentLabel')"
    :is-loading="isWorkLogLoading"
  >
    <WorkLogPanel
      :error-message="workLogErrorMessage"
      :groups="workLogGroupState"
      :incident-plan="pendingIncidentPlan"
      :is-loading="isWorkLogLoading"
      :is-submitting="isWorkLogSubmitting"
      @create-log="createWorkLog"
      @delete-log="deleteWorkLog"
      @incident-draft-consumed="incidentPlanStore.consumePendingPlan"
      @update-log="updateWorkLog"
    />
  </DashboardFramePage>
</template>
