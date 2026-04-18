import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Activity } from './Activity'

export type EvidenceType = 'image' | 'text'

@Entity('evidences')
export class Evidence {
  @PrimaryColumn({ type: 'text' })
  id!: string // UUID v7

  @Column({ type: 'text' })
  activity_id!: string

  @Column({ type: 'text', default: 'image' })
  type!: EvidenceType

  @Column({ type: 'text', nullable: true })
  file_path!: string | null

  @Column({ type: 'text', nullable: true })
  text_content!: string | null

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
