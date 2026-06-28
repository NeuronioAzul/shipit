import type { ActivityData, UserProfileData } from '../vite-env'
import { isRichTextEmpty } from './richText'

export interface ValidationError {
  field: string
  message: string
}

export function validateActivity(activity: Partial<ActivityData>): ValidationError[] {
  const errors: ValidationError[] = []

  if (isRichTextEmpty(activity.description)) {
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

type ProfileValidationTarget = Partial<
  Omit<UserProfileData, 'daily_availability' | 'monthly_availability' | 'minimum_effort_hours'>
> & {
  daily_availability?: number | string | null
  monthly_availability?: number | string | null
  minimum_effort_hours?: number | string | null
}

function addRequiredPositiveIntegerValidation(
  errors: ValidationError[],
  field: 'daily_availability' | 'monthly_availability' | 'minimum_effort_hours',
  label: string,
  value: unknown,
): void {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    errors.push({ field, message: `${label} é obrigatória` })
    return
  }

  const parsedValue = typeof value === 'string'
    ? (/^\d+$/.test(value.trim()) ? Number.parseInt(value.trim(), 10) : Number.NaN)
    : typeof value === 'number'
      ? value
      : Number.NaN

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    errors.push({ field, message: `${label} deve ser um número inteiro maior que zero` })
  }
}

export function validateProfile(profile: ProfileValidationTarget): ValidationError[] {
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

  addRequiredPositiveIntegerValidation(
    errors,
    'daily_availability',
    'Disponibilidade diária',
    profile.daily_availability,
  )
  addRequiredPositiveIntegerValidation(
    errors,
    'monthly_availability',
    'Disponibilidade mensal',
    profile.monthly_availability,
  )
  addRequiredPositiveIntegerValidation(
    errors,
    'minimum_effort_hours',
    'Esforço mínimo em horas',
    profile.minimum_effort_hours,
  )

  return errors
}

/** Check if an activity has all required fields for report generation */
export function isActivityComplete(activity: ActivityData): boolean {
  return !!(
    !isRichTextEmpty(activity.description) &&
    activity.date_start &&
    activity.date_end &&
    activity.status
  )
}
