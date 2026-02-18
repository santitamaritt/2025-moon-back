import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IReminderServiceToken,
  type IReminderService,
} from 'src/domain/interfaces/reminder-service.interface';
import { UpdateReminderDto } from 'src/infraestructure/dtos/reminder/update-reminder.dto';
import { CreateReminderDto } from 'src/infraestructure/dtos/reminder/create-reminder.dto';
import { AuthenticatedUser } from '../decorators/authenticated-user.decorator';
import type { JwtPayload } from 'src/infraestructure/dtos/shared/jwt-payload.interface';

@Controller('reminders')
export class ReminderController {
  constructor(
    @Inject(IReminderServiceToken)
    private readonly reminderService: IReminderService,
  ) {}

  @Get('/user/:userId')
  getUserReminders(@Param('userId', new ParseIntPipe()) userId: number) {
    return this.reminderService.getUserReminders(userId);
  }

  @Put('/:id')
  updateReminder(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminderService.updateReminder(id, dto);
  }

  @Post()
  createReminder(
    @AuthenticatedUser() user: JwtPayload,
    @Body() dto: CreateReminderDto,
  ) {
    return this.reminderService.createReminder(user.id, dto);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReminder(@Param('id', new ParseIntPipe()) id: number) {
    return this.reminderService.deleteReminder(id);
  }
}
