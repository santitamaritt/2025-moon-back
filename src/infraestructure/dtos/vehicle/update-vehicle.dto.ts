import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VehicleStatusEnum } from 'src/infraestructure/entities/vehicle/vehicle-type.enum';

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  licensePlate: string;

  @IsString()
  @IsOptional()
  model: string;

  @IsNumber()
  @IsOptional()
  year: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  km: number;

  @IsOptional()
  @IsEnum(VehicleStatusEnum)
  status?: VehicleStatusEnum;
}
