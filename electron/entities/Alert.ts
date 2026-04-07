import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { UserProfile } from './UserProfile'

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', default: '[5,3,2,1,0]' })
  alert_days_before!: string

  @Column({ type: 'text', default: '[2,3,4,5,6]' })
  alert_frequency!: string

  @Column({ type: 'datetime', nullable: true })
  last_alert_sent!: Date | null

  @Column({ type: 'boolean', default: true })
  alert_enabled!: boolean

  @Column({ type: 'text', default: '09:00' })
  alert_time!: string

  @Column({
    type: 'text',
    default: 'Lembrete: Preencha os campos obrigatórios para gerar o relatório mensal!',
  })
  alert_message!: string

  @Column({ type: 'boolean', default: true })
  alert_sound_enabled!: boolean

  @Column({ type: 'text', nullable: true })
  alert_sound_file!: string | null

  @OneToOne(() => UserProfile, (profile) => profile.alert)
  @JoinColumn()
  profile!: UserProfile
}
