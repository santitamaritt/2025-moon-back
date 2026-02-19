import {
  BaseEntity,
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Appointment } from '../appointment/appointment.entity';
import { VehicleStatusEnum } from './vehicle-type.enum';

@Entity('users_vehicles')
export class Vehicle extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  licensePlate: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column()
  km: number;

  @Column({ type: 'enum', enum: VehicleStatusEnum, nullable: true })
  status: VehicleStatusEnum | null;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Appointment, (appointment) => appointment.vehicle)
  appointments: Appointment[];

  @DeleteDateColumn()
  deletedAt?: Date;
}
