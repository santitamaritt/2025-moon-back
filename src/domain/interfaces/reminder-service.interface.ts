import { Reminder } from 'src/infraestructure/entities/reminder/reminder.entity';
import { UpdateReminderDto } from 'src/infraestructure/dtos/reminder/update-reminder.dto';
import { CreateReminderDto } from 'src/infraestructure/dtos/reminder/create-reminder.dto';

export interface IReminderService {
  getUserReminders(userId: number): Promise<Reminder[]>;
  updateReminder(reminderId: number, dto: UpdateReminderDto): Promise<Reminder>;
  createReminder(userId: number, dto: CreateReminderDto): Promise<Reminder>;
  deleteReminder(reminderId: number): Promise<void>;
}

export const IReminderServiceToken = 'IReminderService';
