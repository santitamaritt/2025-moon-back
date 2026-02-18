import { Reminder } from 'src/infraestructure/entities/reminder/reminder.entity';
import { UpdateReminderDto } from 'src/infraestructure/dtos/reminder/update-reminder.dto';
import { CreateReminderDto } from 'src/infraestructure/dtos/reminder/create-reminder.dto';

export type ExpiringReminderDashboardItem = {
  reminderId: number;
  service: { id: number; name: string };
  vehicle: {
    id: number;
    licensePlate: string;
    model: string;
    year: number;
    km: number;
  };
  lastPerformedAt: string;
  months?: {
    dueDate: string;
    status: 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE';
    daysRemaining: number;
    daysOverdue: number;
  };
  mileage?: {
    baselineKm: number;
    dueKm: number;
    windowKm: number;
    status: 'DUE_SOON' | 'DUE_NOW' | 'OVERDUE';
    kmRemaining: number;
    kmOverdue: number;
  };
};

export interface IReminderService {
  getUserReminders(userId: number): Promise<Reminder[]>;
  getUserExpiringReminders(
    userId: number,
  ): Promise<ExpiringReminderDashboardItem[]>;
  updateReminder(reminderId: number, dto: UpdateReminderDto): Promise<Reminder>;
  createReminder(userId: number, dto: CreateReminderDto): Promise<Reminder>;
  deleteReminder(reminderId: number): Promise<void>;
}

export const IReminderServiceToken = 'IReminderService';
