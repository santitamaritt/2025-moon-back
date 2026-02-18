import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  IReminderRepositoryToken,
  type IReminderRepository,
} from 'src/infraestructure/repositories/interfaces/reminder-repository.interface';
import {
  type ExpiringReminderDashboardItem,
  IReminderService,
} from 'src/domain/interfaces/reminder-service.interface';
import { UpdateReminderDto } from 'src/infraestructure/dtos/reminder/update-reminder.dto';
import { CreateReminderDto } from 'src/infraestructure/dtos/reminder/create-reminder.dto';
import { Reminder } from 'src/infraestructure/entities/reminder/reminder.entity';
import { Service } from 'src/infraestructure/entities/service/service.entity';
import { User } from 'src/infraestructure/entities/user/user.entity';
import {
  IAppointmentRepositoryToken,
  type IAppointmentRepository,
} from 'src/infraestructure/repositories/interfaces/appointment-repository.interface';
import {
  IVehicleServiceToken,
  type IVehicleService,
} from 'src/domain/interfaces/vehicle-service.interface';

@Injectable()
export class ReminderService implements IReminderService {
  constructor(
    @Inject(IReminderRepositoryToken)
    private readonly reminderRepository: IReminderRepository,
    @Inject(IAppointmentRepositoryToken)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(IVehicleServiceToken)
    private readonly vehicleService: IVehicleService,
    private readonly dataSource: DataSource,
  ) {}

  getUserReminders(userId: number): Promise<Reminder[]> {
    return this.reminderRepository.findByUserId(userId);
  }

  async getUserExpiringReminders(
    userId: number,
  ): Promise<ExpiringReminderDashboardItem[]> {
    const reminders = await this.reminderRepository.findByUserId(userId);
    if (!reminders.length) return [];

    const vehicles = await this.vehicleService.getVehiclesOfUser(userId);
    if (!vehicles.length) return [];

    const today = this.startOfDay(new Date());
    const results: ExpiringReminderDashboardItem[] = [];

    for (const vehicle of vehicles) {
      for (const reminder of reminders) {
        const lastCompleted =
          await this.appointmentRepository.findLastCompletedAppointmentForService(
            {
              userId,
              vehicleId: vehicle.id,
              serviceId: reminder.service.id,
            },
          );

        if (!lastCompleted?.date) continue;

        const lastPerformedAt = this.toIsoDate(
          this.startOfDay(new Date(lastCompleted.date)),
        );

        const base: ExpiringReminderDashboardItem = {
          reminderId: reminder.id,
          service: { id: reminder.service.id, name: reminder.service.name },
          vehicle: {
            id: vehicle.id,
            licensePlate: vehicle.licensePlate,
            model: vehicle.model,
            year: vehicle.year,
            km: vehicle.km,
          },
          lastPerformedAt,
        };

        let monthsInfo: ExpiringReminderDashboardItem['months'];
        if (reminder.months && reminder.months > 0) {
          const dueDate = this.startOfDay(
            this.addMonths(new Date(lastCompleted.date), reminder.months),
          );
          const windowStart = this.startOfDay(new Date(dueDate));
          windowStart.setDate(windowStart.getDate() - 15);

          if (today >= windowStart) {
            const daysDiff = Math.floor(
              (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
            );
            monthsInfo = {
              dueDate: this.toIsoDate(dueDate),
              status:
                daysDiff > 0
                  ? 'DUE_SOON'
                  : daysDiff === 0
                    ? 'DUE_TODAY'
                    : 'OVERDUE',
              daysRemaining: Math.max(daysDiff, 0),
              daysOverdue: Math.max(-daysDiff, 0),
            };
          }
        }

        let mileageInfo: ExpiringReminderDashboardItem['mileage'];
        if (
          reminder.mileage != null &&
          reminder.mileage > 0 &&
          lastCompleted.kmAtService != null
        ) {
          const interval = reminder.mileage;
          const baselineKm = lastCompleted.kmAtService;
          const dueKm = baselineKm + interval;
          const windowKm = Math.ceil(interval * 0.1);
          const thresholdKm = dueKm - windowKm;
          const currentKm = vehicle.km;

          if (currentKm >= thresholdKm) {
            const diff = dueKm - currentKm;
            mileageInfo = {
              baselineKm,
              dueKm,
              windowKm,
              status:
                diff > 0 ? 'DUE_SOON' : diff === 0 ? 'DUE_NOW' : 'OVERDUE',
              kmRemaining: Math.max(diff, 0),
              kmOverdue: Math.max(-diff, 0),
            };
          }
        }

        if (monthsInfo) base.months = monthsInfo;
        if (mileageInfo) base.mileage = mileageInfo;
        if (base.months || base.mileage) results.push(base);
      }
    }

    return results;
  }

  async updateReminder(
    reminderId: number,
    dto: UpdateReminderDto,
  ): Promise<Reminder> {
    const reminder = await this.reminderRepository.findById(reminderId);
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    reminder.lastMonths = reminder.months;
    reminder.lastMileage = reminder.mileage;
    reminder.months = dto.months;
    reminder.mileage = dto.mileage;

    return this.reminderRepository.save(reminder);
  }

  async createReminder(
    userId: number,
    dto: CreateReminderDto,
  ): Promise<Reminder> {
    const service = await this.dataSource.getRepository(Service).findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const reminder = this.reminderRepository.create({
      months: dto.months,
      mileage: dto.mileage,
      lastMonths: dto.months,
      lastMileage: dto.mileage,
      user: { id: userId } as User,
      service,
    });

    return this.reminderRepository.save(reminder);
  }

  async deleteReminder(reminderId: number): Promise<void> {
    const result = await this.reminderRepository.delete(reminderId);
    if (!result.affected) {
      throw new NotFoundException('Reminder not found');
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
