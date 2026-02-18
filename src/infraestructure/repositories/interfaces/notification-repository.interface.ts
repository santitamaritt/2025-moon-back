import { Notification } from 'src/infraestructure/entities/notification/notification.entity';
import { IBaseRepository } from './base-repository.interface';

export interface INotificationRepository extends IBaseRepository<Notification> {
  findUserNotifications(id: number): Promise<Notification[]>;
  findById(notificationId: number): Promise<Notification | null>;
  findByDedupeKey(dedupeKey: string): Promise<Notification | null>;
  saveIfNotExistsByDedupeKey(params: {
    userId: number;
    message: string;
    dedupeKey: string;
  }): Promise<boolean>;
  markAsRead(notificationId: number): Promise<void>;
}

export const INotificationRepositoryToken = 'INotificationRepository';
