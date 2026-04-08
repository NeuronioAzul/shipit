import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm'
import { Evidence } from './Evidence'

export type ActivityStatus = 'Em andamento' | 'Concluído' | 'Cancelado' | 'Pendente'
export type AttendanceType = 'Presencial' | 'Remoto' | 'Híbrido'

@Entity('activities')
export class Activity {
  @PrimaryColumn({ type: 'text' })
  id!: string // UUID v7

  @Column({ type: 'integer', nullable: true })
  order!: number

  @Column({ type: 'text', nullable: true })
  description!: string

  @Column({ type: 'date', nullable: true })
  date_start!: string | null

  @Column({ type: 'date', nullable: true })
  date_end!: string | null

  @Column({ type: 'text', nullable: true })
  link_ref!: string | null // JSON array of URLs

  @Column({ type: 'text', default: 'Pendente' })
  status!: ActivityStatus

  @Column({ type: 'text' })
  month_reference!: string // MM/YYYY

  @Column({ type: 'text', nullable: true })
  attendance_type!: AttendanceType | null

  @Column({ type: 'text', nullable: true })
  project_scope!: string | null

  @UpdateDateColumn()
  last_updated!: Date

  @OneToMany(() => Evidence, (evidence) => evidence.activity, { cascade: true })
  evidences!: Evidence[]
}
