import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from 'src/infraestructure/entities/appointment/appointment.entity';
import { AppointmentController } from './appointment.controller';
import { IAppointmentRepositoryToken } from 'src/infraestructure/repositories/interfaces/appointment-repository.interface';
import { AppointmentRepository } from 'src/infraestructure/repositories/appointment.repository';
import { IAppointmentServiceToken } from 'src/domain/interfaces/appointment-service.interface';
import { AppointmentService } from 'src/domain/services/appointment/appointment.service';
import { ServiceModule } from '../service/service.module';
import { UsersModule } from '../users/users.module';
import { SparePartModule } from '../spare-part/spare-part.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { ExpenseTrackerModule } from 'src/infraestructure/services/expense-tracker/expense-tracker.module';
import { DiscountCouponService } from 'src/domain/services/users/discount-coupon.service';
import { IDiscountCouponServiceToken } from 'src/domain/interfaces/discount-coupon-service.interface';
import { DiscountCouponRepository } from 'src/infraestructure/repositories/discount-coupon.repository';
import { IDiscountCouponRepositoryToken } from 'src/infraestructure/repositories/interfaces/discount-coupon-repository.interface';
import { IUserReviewRepositoryToken } from 'src/infraestructure/repositories/interfaces/user-review.repository.interface';
import { UserReviewRepository } from 'src/infraestructure/repositories/user-review.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    ConfigModule,
    ServiceModule,
    UsersModule,
    SparePartModule,
    VehicleModule,
    ExpenseTrackerModule,
  ],
  controllers: [AppointmentController],
  providers: [
    { provide: IAppointmentRepositoryToken, useClass: AppointmentRepository },
    { provide: IAppointmentServiceToken, useClass: AppointmentService },
    {
      provide: IDiscountCouponRepositoryToken,
      useClass: DiscountCouponRepository,
    },
    { provide: IDiscountCouponServiceToken, useClass: DiscountCouponService },
    { provide: IUserReviewRepositoryToken, useClass: UserReviewRepository },
  ],
  exports: [IAppointmentServiceToken, IAppointmentRepositoryToken],
})
export class AppointmentModule {}
