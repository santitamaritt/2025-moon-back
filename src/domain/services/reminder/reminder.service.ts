import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  IReminderRepositoryToken,
  type IReminderRepository,
} from 'src/infraestructure/repositories/interfaces/reminder-repository.interface';
import { IReminderService } from 'src/domain/interfaces/reminder-service.interface';
import { UpdateReminderDto } from 'src/infraestructure/dtos/reminder/update-reminder.dto';
import { CreateReminderDto } from 'src/infraestructure/dtos/reminder/create-reminder.dto';
import { Reminder } from 'src/infraestructure/entities/reminder/reminder.entity';
import { Service } from 'src/infraestructure/entities/service/service.entity';
import { User } from 'src/infraestructure/entities/user/user.entity';

@Injectable()
export class ReminderService implements IReminderService {
  constructor(
    @Inject(IReminderRepositoryToken)
    private readonly reminderRepository: IReminderRepository,
    private readonly dataSource: DataSource,
  ) {}

  getUserReminders(userId: number): Promise<Reminder[]> {
    return this.reminderRepository.findByUserId(userId);
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
}
