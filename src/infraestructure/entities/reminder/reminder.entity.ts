import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Service } from '../service/service.entity';

@Entity('reminders')
export class Reminder extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'time', type: 'int', default: 12 })
  months: number;

  @Column({ type: 'int', default: 10000 })
  mileage: number;

  @Column({ name: 'lastTime', type: 'int', default: 12 })
  lastMonths: number;

  @Column({ type: 'int', default: 10000 })
  lastMileage: number;

  @ManyToOne(() => User, (user) => user.reminders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
