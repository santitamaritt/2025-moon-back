import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { Service } from '../service/service.entity';
import { User } from '../user/user.entity';
import { Vehicle } from '../vehicle/vehicle.entity';
import { AppointmentStatus } from './appointment-status.enum';
import { DiscountCoupon } from '../user/discount-coupon.entity';
import { VehicleStatusEnum } from '../vehicle/vehicle-type.enum';

@Entity('appointments')
export class Appointment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workshop_id' })
  workshop: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @ManyToMany(() => Service, { eager: false })
  @JoinTable({
    name: 'appointment_services',
    joinColumn: { name: 'appointment_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_id', referencedColumnName: 'id' },
  })
  services: Service[];

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'int', nullable: true })
  kmAtService: number | null;

  @Column({ type: 'enum', enum: VehicleStatusEnum, nullable: true })
  vehicleStatusAtService: VehicleStatusEnum | null;

  @Column({ type: 'int', nullable: true })
  originalPrice: number | null;

  @Column({ type: 'int', nullable: true })
  finalPrice: number | null;

  @Column({ type: 'int', nullable: true })
  discountCouponId: number | null;

  @ManyToOne(() => DiscountCoupon, { nullable: true })
  @JoinColumn({ name: 'discountCouponId' })
  discountCoupon?: DiscountCoupon | null;
}
