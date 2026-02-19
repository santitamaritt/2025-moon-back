import { IsInt, Min } from 'class-validator';

export class CreateReminderDto {
  @IsInt()
  @Min(1)
  months: number;

  @IsInt()
  @Min(0)
  mileage: number;

  @IsInt()
  @Min(1)
  serviceId: number;
}
