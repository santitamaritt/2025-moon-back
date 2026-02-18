import { Module } from '@nestjs/common';
import { ReminderController } from './reminder.controller';
import { ReminderRepository } from 'src/infraestructure/repositories/reminder.repository';
import { IReminderRepositoryToken } from 'src/infraestructure/repositories/interfaces/reminder-repository.interface';
import { ReminderService } from 'src/domain/services/reminder/reminder.service';
import { IReminderServiceToken } from 'src/domain/interfaces/reminder-service.interface';

@Module({
  controllers: [ReminderController],
  providers: [
    { provide: IReminderRepositoryToken, useClass: ReminderRepository },
    { provide: IReminderServiceToken, useClass: ReminderService },
  ],
})
export class ReminderModule {}
