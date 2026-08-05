import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import EquipmentDetailPanel from '@/features/dashboard/components/EquipmentDetailPanel.vue'
import { i18n } from '@/features/i18n'

function createEquipment(alarmCode = 'ERR-402') {
  return {
    alarmCode,
    id: 'EQP-A02',
    inspectedAt: '2026-08-05 12:00',
    metrics: [
      {
        icon: 'gasFlow',
        id: 'gasFlow',
        labelKey: 'metrics.gasFlow',
        statusTone: 'normal',
        unit: 'sccm',
        value: '607',
      },
      {
        icon: 'pressure',
        id: 'pressure',
        labelKey: 'metrics.pressure',
        statusTone: 'danger',
        unit: 'mTorr',
        value: '41.90',
      },
      {
        icon: 'rfPower',
        id: 'rfPower',
        labelKey: 'metrics.rfPower',
        statusTone: 'normal',
        unit: 'kW',
        value: '2.800',
      },
      {
        icon: 'temperature',
        id: 'temperature',
        labelKey: 'metrics.temperature',
        statusTone: 'danger',
        unit: '°C',
        value: '60.31',
      },
    ],
    name: 'EQP-A02',
    ownerDisplay: '김억산',
    status: { label: '위험', labelKey: 'status.danger', tone: 'danger' },
    type: 'Etching',
    updatedAt: { date: '2026-08-05', time: '12:00:00' },
  }
}

function mountPanel(equipment = createEquipment()) {
  i18n.global.locale.value = 'ko'

  return mount(EquipmentDetailPanel, {
    props: { equipment },
    global: { plugins: [i18n] },
  })
}

describe('EquipmentDetailPanel', () => {
  it('shows pulsing double-ring markers only on pressure and temperature for ERR-402', () => {
    const wrapper = mountPanel()
    const markedIcons = wrapper.findAll('.detail-panel__metric-icon--critical-cooling')

    expect(markedIcons).toHaveLength(2)
    expect(
      markedIcons.some((icon) => icon.classes().includes('detail-panel__metric-icon--pressure')),
    ).toBe(true)
    expect(
      markedIcons.some((icon) => icon.classes().includes('detail-panel__metric-icon--temperature')),
    ).toBe(true)
    expect(wrapper.findAll('.detail-panel__metric-alert')).toHaveLength(0)
    expect(wrapper.findAll('.critical-cooling-marker')).toHaveLength(1)
  })

  it('keeps the regular alert marker for other ERR codes', () => {
    const wrapper = mountPanel(createEquipment('ERR-401'))

    expect(wrapper.find('.detail-panel__metric-icon--critical-cooling').exists()).toBe(false)
    expect(wrapper.find('.critical-cooling-marker').exists()).toBe(false)
    expect(wrapper.findAll('.detail-panel__metric-alert')).toHaveLength(2)
  })
})
