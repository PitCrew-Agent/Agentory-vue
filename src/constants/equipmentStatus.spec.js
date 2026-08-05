import { describe, expect, it } from 'vitest'

import {
  isCriticalCoolingAlarm,
  normalizeAlarmCodeTone,
  resolveEquipmentStatus,
} from '@/constants/equipmentStatus'

describe('equipmentStatus', () => {
  it('classifies every ERR code as danger and every WRN code as warning', () => {
    expect(normalizeAlarmCodeTone('ERR-201')).toBe('danger')
    expect(normalizeAlarmCodeTone('err-401')).toBe('danger')
    expect(normalizeAlarmCodeTone('WRN-702')).toBe('warning')
    expect(normalizeAlarmCodeTone('')).toBeNull()
  })

  it('prioritizes the alarm code over a conflicting backend status', () => {
    expect(resolveEquipmentStatus('warning', 'ERR-301').tone).toBe('danger')
    expect(resolveEquipmentStatus('danger', 'WRN-701').tone).toBe('warning')
    expect(resolveEquipmentStatus('normal', null).tone).toBe('normal')
  })

  it('identifies the dedicated critical cooling alarm code', () => {
    expect(isCriticalCoolingAlarm('ERR-402')).toBe(true)
    expect(isCriticalCoolingAlarm(' err-402 ')).toBe(true)
    expect(isCriticalCoolingAlarm('ERR-401')).toBe(false)
  })
})
