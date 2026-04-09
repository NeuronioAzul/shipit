import { describe, it, expect } from 'vitest'
import { validateActivity, validateProfile, isActivityComplete } from './validation'
import type { ActivityData, UserProfileData } from '../vite-env'

describe('validateActivity', () => {
  it('returns no errors for a valid activity', () => {
    const activity = {
      description: 'Implementar feature X',
      date_start: '2026-03-01',
      date_end: '2026-03-15',
      status: 'Concluído' as const,
      month_reference: '03/2026',
    }
    expect(validateActivity(activity)).toEqual([])
  })

  it('requires description', () => {
    const errors = validateActivity({ status: 'Pendente', month_reference: '03/2026' })
    expect(errors).toContainEqual({ field: 'description', message: 'Descrição é obrigatória' })
  })

  it('requires status', () => {
    const errors = validateActivity({ description: 'Test', month_reference: '03/2026' })
    expect(errors).toContainEqual({ field: 'status', message: 'Status é obrigatório' })
  })

  it('requires month_reference', () => {
    const errors = validateActivity({ description: 'Test', status: 'Pendente' as any })
    expect(errors).toContainEqual({ field: 'month_reference', message: 'Mês de referência é obrigatório' })
  })

  it('rejects date_end before date_start', () => {
    const errors = validateActivity({
      description: 'Test',
      status: 'Pendente' as any,
      month_reference: '03/2026',
      date_start: '2026-03-15',
      date_end: '2026-03-01',
    })
    expect(errors).toContainEqual({
      field: 'date_end',
      message: 'Data de término deve ser após a data de início',
    })
  })

  it('allows missing dates (optional)', () => {
    const errors = validateActivity({
      description: 'Test',
      status: 'Pendente' as any,
      month_reference: '03/2026',
    })
    expect(errors).toEqual([])
  })

  it('treats whitespace-only description as missing', () => {
    const errors = validateActivity({
      description: '   ',
      status: 'Pendente' as any,
      month_reference: '03/2026',
    })
    expect(errors).toContainEqual({ field: 'description', message: 'Descrição é obrigatória' })
  })
})

describe('validateProfile', () => {
  const validProfile: Partial<UserProfileData> = {
    full_name: 'JOÃO SILVA',
    role: 'ENGENHEIRO DE SOFTWARE',
    seniority_level: 'Pleno',
    contract_identifier: 'CT-001',
    profile_type: 'Técnico',
    attendance_type: 'Remoto',
    project_scope: 'Squad Alpha',
    correlating_activities: 'Desenvolvimento de software',
  }

  it('returns no errors for a valid profile', () => {
    expect(validateProfile(validProfile)).toEqual([])
  })

  it('requires all mandatory fields', () => {
    const errors = validateProfile({})
    expect(errors.length).toBe(8)
    expect(errors.map(e => e.field)).toEqual([
      'full_name', 'role', 'seniority_level', 'contract_identifier',
      'profile_type', 'attendance_type', 'project_scope', 'correlating_activities',
    ])
  })

  it('treats whitespace-only full_name as missing', () => {
    const errors = validateProfile({ ...validProfile, full_name: '  ' })
    expect(errors).toContainEqual({ field: 'full_name', message: 'Nome completo é obrigatório' })
  })

  it('rejects full_name containing numbers', () => {
    const errors = validateProfile({ ...validProfile, full_name: 'MARIA 123 SILVA' })
    expect(errors).toContainEqual({ field: 'full_name', message: 'Nome completo não pode conter números' })
  })
})

describe('isActivityComplete', () => {
  const completeActivity: ActivityData = {
    id: '1',
    order: 0,
    description: 'Task',
    date_start: '2026-03-01',
    date_end: '2026-03-15',
    link_ref: null,
    status: 'Concluído',
    month_reference: '03/2026',
    attendance_type: null,
    project_scope: null,
    last_updated: '2026-03-15T00:00:00',
    evidences: [],
  }

  it('returns true for a complete activity', () => {
    expect(isActivityComplete(completeActivity)).toBe(true)
  })

  it('returns false when description is missing', () => {
    expect(isActivityComplete({ ...completeActivity, description: '' })).toBe(false)
  })

  it('returns false when date_start is missing', () => {
    expect(isActivityComplete({ ...completeActivity, date_start: null })).toBe(false)
  })

  it('returns false when date_end is missing', () => {
    expect(isActivityComplete({ ...completeActivity, date_end: null })).toBe(false)
  })

  it('returns false when status is missing', () => {
    expect(isActivityComplete({ ...completeActivity, status: '' as any })).toBe(false)
  })
})
