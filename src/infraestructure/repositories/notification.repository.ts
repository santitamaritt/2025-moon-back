import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { INotificationRepository } from './interfaces/notification-repository.interface';
import { Notification } from '../entities/notification/notification.entity';

@Injectable()
export class NotificationRepository
  extends Repository<Notification>
  implements INotificationRepository
{
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  findUserNotifications(userId: number): Promise<Notification[]> {
    return this.find({ where: { user: { id: userId }, isRead: false } });
  }

  findById(id: number): Promise<Notification | null> {
    return this.findOne({ where: { id }, relations: ['user'] });
  }

  findByDedupeKey(dedupeKey: string): Promise<Notification | null> {
    return this.findOne({ where: { dedupeKey } });
  }

  async saveIfNotExistsByDedupeKey(params: {
    userId: number;
    message: string;
    dedupeKey: string;
  }): Promise<boolean> {
    const existing = await this.findOne({
      where: {
        user: { id: params.userId } as any,
        dedupeKey: params.dedupeKey,
      },
      relations: ['user'],
    });
    if (existing) return false;

    await this.save({
      user: { id: params.userId } as any,
      message: params.message,
      dedupeKey: params.dedupeKey,
    });
    return true;
  }

  async markAsRead(id: number): Promise<void> {
    await this.update(id, { isRead: true });
  }
}
