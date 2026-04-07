import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Report } from './Report'
import { Activity } from './Activity'

@Entity('activities_report')
export class ActivityReport {
  @PrimaryColumn({ type: 'text' })
  id!: string // UUID v7

  @Column({ type: 'text' })
  report_id!: string

  @Column({ type: 'text' })
  activity_id!: string

  @CreateDateColumn()
  date_added!: Date

  @ManyToOne(() => Report, (report) => report.activity_reports)
  @JoinColumn({ name: 'report_id' })
  report!: Report

  @ManyToOne(() => Activity)
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity
}
