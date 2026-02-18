import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Reminder } from '../entities/reminder/reminder.entity';
import { IReminderRepository } from './interfaces/reminder-repository.interface';

@Injectable()
export class ReminderRepository
  extends Repository<Reminder>
  implements IReminderRepository
{
  constructor(private dataSource: DataSource) {
    super(Reminder, dataSource.createEntityManager());
  }

  findById(reminderId: number): Promise<Reminder | null> {
    return this.findOne({
      where: { id: reminderId },
      relations: ['user', 'service'],
    });
  }

  findByUserId(userId: number): Promise<Reminder[]> {
    return this.find({
      where: { user: { id: userId } },
      relations: ['service'],
    });
  }
}
