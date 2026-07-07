import { ref } from 'vue'

const isSidebarOpen = ref(false)
const sidebarActiveIndex = ref(-1)

export function useDashboardSidebar() {
  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  return {
    isSidebarOpen,
    sidebarActiveIndex,
    toggleSidebar,
  }
}
