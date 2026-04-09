import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm'
import { Alert } from './Alert'

export type Role =
  | 'ADMINISTRADOR DE DADOS'
  | 'ANALISTA DE DADOS E BUSINESS INTELLIGENCE'
  | 'ANALISTA DE QUALIDADE E TESTES DE SOFTWARE'
  | 'ANALISTA DE REQUISITOS'
  | 'ARQUITETO DE DADOS'
  | 'ARQUITETO DE SOFTWARE'
  | 'ARQUITETO DE SOFTWARE DEVOPS'
  | 'ENGENHEIRO DE AUTOMAÇÃO'
  | 'CIENTISTA DE DADOS'
  | 'ENGENHEIRO DE SOFTWARE'
  | 'ENGENHEIRO DE DADOS'

export type SeniorityLevel =
  | 'Aprendiz'
  | 'Júnior'
  | 'Pleno'
  | 'Sênior'
  | 'Especialista'
  | 'Líder'
  | 'Master'

export type AttendanceType = 'Presencial' | 'Remoto' | 'Híbrido'

@Entity('user_profile')
export class UserProfile {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', nullable: true })
  full_name!: string

  @Column({ type: 'text', nullable: true })
  role!: Role

  @Column({ type: 'text', nullable: true })
  seniority_level!: SeniorityLevel

  @Column({ type: 'text', nullable: true })
  contract_identifier!: string

  @Column({ type: 'text', nullable: true })
  profile_type!: string

  @Column({ type: 'text', nullable: true })
  correlating_activities!: string

  @Column({ type: 'text', nullable: true })
  attendance_type!: AttendanceType

  @Column({ type: 'text', nullable: true })
  project_scope!: string

  @UpdateDateColumn()
  last_updated!: Date

  @OneToOne(() => Alert, (alert) => alert.profile, { cascade: true, eager: true })
  alert!: Alert
}
