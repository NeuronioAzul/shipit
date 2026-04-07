import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm'
import { ActivityReport } from './ActivityReport'

export type ReportStatus = 'Gerado' | 'Falha' | 'Excluído'

@Entity('reports')
export class Report {
  @PrimaryColumn({ type: 'text' })
  id!: string // UUID v7

  @Column({ type: 'text' })
  month_reference!: string // MM/YYYY

  @Column({ type: 'text' })
  file_path!: string

  @CreateDateColumn()
  date_generated!: Date

  @Column({ type: 'text' })
  report_name!: string

  @Column({ type: 'text', default: 'Gerado' })
  status!: ReportStatus

  @OneToMany(() => ActivityReport, (ar) => ar.report, { cascade: true })
  activity_reports!: ActivityReport[]
}
