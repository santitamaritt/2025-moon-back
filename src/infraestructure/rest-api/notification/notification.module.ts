import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { INotificationRepositoryToken } from 'src/infraestructure/repositories/interfaces/notification-repository.interface';
import { NotificationRepository } from 'src/infraestructure/repositories/notification.repository';
import { INotificationServiceToken } from 'src/domain/interfaces/notification-service.interface';
import { NotificationService } from 'src/domain/services/notification/notification.service';
import { ReminderModule } from '../reminder/reminder.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ReminderModule, AppointmentModule, VehicleModule, UsersModule],
  controllers: [NotificationController],
  providers: [
    { provide: INotificationRepositoryToken, useClass: NotificationRepository },
    { provide: INotificationServiceToken, useClass: NotificationService },
  ],
})
export class NotificationModule {}
