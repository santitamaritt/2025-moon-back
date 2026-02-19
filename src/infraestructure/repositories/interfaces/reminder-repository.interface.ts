import { Reminder } from 'src/infraestructure/entities/reminder/reminder.entity';
import { IBaseRepository } from './base-repository.interface';

export interface IReminderRepository extends IBaseRepository<Reminder> {
  findById(reminderId: number): Promise<Reminder | null>;
  findByUserId(userId: number): Promise<Reminder[]>;
}

export const IReminderRepositoryToken = 'IReminderRepository';
