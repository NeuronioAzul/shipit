import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Activity } from './Activity'

@Entity('evidences')
export class Evidence {
  @PrimaryColumn({ type: 'text' })
  id!: string // UUID v7

  @Column({ type: 'text' })
  activity_id!: string

  @Column({ type: 'text' })
  file_path!: string

  @Column({ type: 'text', nullable: true })
  caption!: string | null

  @Column({ type: 'integer', default: 0 })
  sort_index!: number

  @CreateDateColumn()
  date_added!: Date

  @Column({ type: 'datetime', nullable: true })
  deleted_at!: Date | null

  @ManyToOne(() => Activity, (activity) => activity.evidences)
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity
}
