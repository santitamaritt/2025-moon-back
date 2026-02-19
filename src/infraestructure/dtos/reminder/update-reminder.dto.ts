import { IsInt, Min } from 'class-validator';

export class UpdateReminderDto {
  @IsInt()
  @Min(1)
  months: number;

  @IsInt()
  @Min(0)
  mileage: number;
}
