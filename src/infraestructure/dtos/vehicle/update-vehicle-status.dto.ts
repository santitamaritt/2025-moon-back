import { IsEnum } from 'class-validator';
import { VehicleStatusEnum } from 'src/infraestructure/entities/vehicle/vehicle-type.enum';

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatusEnum)
  status: VehicleStatusEnum;
}
