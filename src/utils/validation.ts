import type { ActivityData, UserProfileData } from '../vite-env'

export interface ValidationError {
  field: string
  message: string
}

export function validateActivity(activity: Partial<ActivityData>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!activity.description?.trim()) {
    errors.push({ field: 'description', message: 'Descrição é obrigatória' })
  }
  if (activity.date_start && activity.date_end && activity.date_start > activity.date_end) {
    errors.push({ field: 'date_end', message: 'Data de término deve ser após a data de início' })
  }
  if (!activity.status) {
    errors.push({ field: 'status', message: 'Status é obrigatório' })
  }
  if (!activity.month_reference?.trim()) {
    errors.push({ field: 'month_reference', message: 'Mês de referência é obrigatório' })
  }

  return errors
}

export function validateProfile(profile: Partial<UserProfileData>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!profile.full_name?.trim()) {
    errors.push({ field: 'full_name', message: 'Nome completo é obrigatório' })
  } else if (/\d/.test(profile.full_name)) {
    errors.push({ field: 'full_name', message: 'Nome completo não pode conter números' })
  }
  if (!profile.role) {
    errors.push({ field: 'role', message: 'Cargo é obrigatório' })
  }
  if (!profile.seniority_level) {
    errors.push({ field: 'seniority_level', message: 'Senioridade é obrigatória' })
  }
  if (!profile.contract_identifier?.trim()) {
    errors.push({ field: 'contract_identifier', message: 'Identificador do contrato é obrigatório' })
  }
  if (!profile.profile_type) {
    errors.push({ field: 'profile_type', message: 'Tipo de perfil é obrigatório' })
  }
  if (!profile.attendance_type) {
    errors.push({ field: 'attendance_type', message: 'Tipo de atendimento é obrigatório' })
  }
  if (!profile.project_scope?.trim()) {
    errors.push({ field: 'project_scope', message: 'Squad / Projeto é obrigatório' })
  }
  if (!profile.correlating_activities?.trim()) {
    errors.push({ field: 'correlating_activities', message: 'Atividades correlatas é obrigatório' })
  }

  return errors
}

/** Check if an activity has all required fields for report generation */
export function isActivityComplete(activity: ActivityData): boolean {
  return !!(
    activity.description?.trim() &&
    activity.date_start &&
    activity.date_end &&
    activity.status
  )
}
