import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtPayload } from 'src/domain/dtos/jwt-payload.interface';
import { APPOINTMENT_EVENTS } from 'src/domain/events/appointments/appointment-events';
import { AppointmentStatusChangedEvent } from 'src/domain/events/appointments/appointment-status-changed-event';
import { VEHICLE_EVENTS } from 'src/domain/events/vehicles/vehicle-events';
import { VehicleKmUpdatedEvent } from 'src/domain/events/vehicles/vehicle-km-updated-event';
import { AppointmentStatus } from 'src/infraestructure/entities/appointment/appointment-status.enum';
import { INotificationService } from 'src/domain/interfaces/notification-service.interface';
import {
  INotificationRepositoryToken,
  type INotificationRepository,
} from 'src/infraestructure/repositories/interfaces/notification-repository.interface';
import {
  IReminderRepositoryToken,
  type IReminderRepository,
} from 'src/infraestructure/repositories/interfaces/reminder-repository.interface';
import {
  IAppointmentRepositoryToken,
  type IAppointmentRepository,
} from 'src/infraestructure/repositories/interfaces/appointment-repository.interface';
import {
  IVehicleServiceToken,
  type IVehicleService,
} from 'src/domain/interfaces/vehicle-service.interface';
import {
  IUsersServiceToken,
  type IUsersService,
} from 'src/domain/interfaces/users-service.interface';
import {
  IEmailServiceToken,
  type IEmailService,
} from 'src/domain/interfaces/email-service.interface';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @Inject(INotificationRepositoryToken)
    private readonly notificationRepository: INotificationRepository,
    @Inject(IReminderRepositoryToken)
    private readonly reminderRepository: IReminderRepository,
    @Inject(IAppointmentRepositoryToken)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(IVehicleServiceToken)
    private readonly vehicleService: IVehicleService,
    @Inject(IUsersServiceToken)
    private readonly usersService: IUsersService,
    @Inject(IEmailServiceToken)
    private readonly emailService: IEmailService,
  ) {}

  async getAllNotifications(user: JwtPayload): Promise<any[]> {
    await this.syncReminderMonthsNotifications(user.id, user.email);
    return this.notificationRepository.findUserNotifications(user.id);
  }

  async markAsRead(user: JwtPayload, notificationId: number): Promise<void> {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user.id !== user.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.notificationRepository.markAsRead(notificationId);
  }

  @OnEvent(APPOINTMENT_EVENTS.STATUS_CHANGED)
  async createNotification(event: AppointmentStatusChangedEvent) {
    const message = event.getMessage();
    const userToNotify = event.getUserToNotify();
    if (!message) return;

    await this.notificationRepository.save({
      user: { id: userToNotify.id },
      message,
    });
  }

  @OnEvent(APPOINTMENT_EVENTS.STATUS_CHANGED)
  async createReviewRequestNotification(event: AppointmentStatusChangedEvent) {
    if (event.appointment.status !== AppointmentStatus.COMPLETED) return;

    const appt = event.appointment;
    const reviewMessage = `⭐ Te invitamos a calificar tu turno #${appt.id}.`;

    await this.notificationRepository.save({
      user: { id: appt.user.id },
      message: reviewMessage,
    });
  }

  private async syncReminderMonthsNotifications(
    userId: number,
    userEmail: string,
  ): Promise<void> {
    const reminders = await this.reminderRepository.findByUserId(userId);
    if (!reminders.length) return;

    const vehicles = await this.vehicleService.getVehiclesOfUser(userId);
    if (!vehicles.length) return;

    const today = this.startOfDay(new Date());

    for (const vehicle of vehicles) {
      for (const reminder of reminders) {
        if (!reminder.months || reminder.months <= 0) continue;

        const lastCompleted =
          await this.appointmentRepository.findLastCompletedAppointmentForService(
            {
              userId,
              vehicleId: vehicle.id,
              serviceId: reminder.service.id,
            },
          );
        if (!lastCompleted?.date) continue;

        const dueDate = this.startOfDay(
          this.addMonths(new Date(lastCompleted.date), reminder.months),
        );
        const windowStart = this.startOfDay(new Date(dueDate));
        windowStart.setDate(windowStart.getDate() - 15);

        if (today < windowStart) continue;

        const dueIso = this.toIsoDate(dueDate);
        const dedupeKey = `REMINDER_MONTHS:${userId}:${vehicle.id}:${reminder.id}:${dueIso}`;

        const serviceName = reminder.service.name;
        const vehicleLabel = vehicle.licensePlate
          ? ` (${vehicle.licensePlate})`
          : '';

        const daysDiff = Math.floor(
          (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );

        let message: string;
        if (daysDiff > 0) {
          message = `📅 Recordatorio: faltan ${daysDiff} días para realizar el servicio de "${serviceName}"${vehicleLabel}. (Aviso con 15 días de anticipación)`;
        } else if (daysDiff === 0) {
          message = `📅 Recordatorio: hoy corresponde realizar el servicio de "${serviceName}"${vehicleLabel}.`;
        } else {
          message = `⚠️ Recordatorio: se venció hace ${Math.abs(daysDiff)} días el servicio de "${serviceName}"${vehicleLabel}. Hacelo ya!`;
        }

        const created =
          await this.notificationRepository.saveIfNotExistsByDedupeKey({
            userId,
            message,
            dedupeKey,
          });

        if (!created) continue;

        await this.emailService.sendNotification(
          userEmail,
          'Recordatorio de mantenimiento',
          `<p>${message}</p>`,
        );
      }
    }
  }

  @OnEvent(VEHICLE_EVENTS.KM_UPDATED)
  async onVehicleKmUpdated(event: VehicleKmUpdatedEvent) {
    const user = await this.usersService.findById(event.userId);
    await this.syncReminderMileageNotificationsForVehicle({
      userId: event.userId,
      vehicleId: event.vehicleId,
      currentKm: event.km,
      userEmail: user.email,
    });
  }

  private async syncReminderMileageNotificationsForVehicle(params: {
    userId: number;
    vehicleId: number;
    currentKm: number;
    userEmail: string;
  }): Promise<void> {
    const { userId, vehicleId, currentKm, userEmail } = params;

    const reminders = await this.reminderRepository.findByUserId(userId);
    if (!reminders.length) return;

    const vehicle = await this.vehicleService.getById(vehicleId);

    for (const reminder of reminders) {
      if (!reminder.mileage || reminder.mileage <= 0) continue;

      const lastCompleted =
        await this.appointmentRepository.findLastCompletedAppointmentForService(
          {
            userId,
            vehicleId,
            serviceId: reminder.service.id,
          },
        );

      if (!lastCompleted) continue;

      const baselineKm = lastCompleted.kmAtService ?? null;
      if (baselineKm == null) continue;

      const interval = reminder.mileage;
      const dueKm = baselineKm + interval;
      const windowKm = Math.ceil(interval * 0.1);
      const thresholdKm = dueKm - windowKm;

      if (currentKm < thresholdKm) continue;

      const serviceName = reminder.service.name;
      const vehicleLabel = vehicle.licensePlate
        ? ` (${vehicle.licensePlate})`
        : '';

      const dedupeKey = `REMINDER_MILEAGE:${userId}:${vehicleId}:${reminder.id}:${currentKm}`;

      let message: string;
      if (currentKm < dueKm) {
        const remaining = dueKm - currentKm;
        message = `⏰ Recordatorio: Te quedan ${remaining} km para realizar el servicio de "${serviceName}"${vehicleLabel}.`;
      } else if (currentKm === dueKm) {
        message = `⏰ Recordatorio: ya corresponde realizar el servicio de "${serviceName}"${vehicleLabel}. Llegaste a ${dueKm} km.`;
      } else {
        const overdue = currentKm - dueKm;
        message = `⚠️ Recordatorio: te pasaste ${overdue} km del servicio de "${serviceName}"${vehicleLabel}.`;
      }

      const created =
        await this.notificationRepository.saveIfNotExistsByDedupeKey({
          userId,
          message,
          dedupeKey,
        });

      if (!created) continue;

      await this.emailService.sendNotification(
        userEmail,
        'Recordatorio por kilometraje',
        `<p>${message}</p>`,
      );
    }
  }

  private addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toIsoDate(date: Date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
