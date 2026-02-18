import { JwtPayload } from 'src/infraestructure/dtos/shared/jwt-payload.interface';
import { Vehicle } from 'src/infraestructure/entities/vehicle/vehicle.entity';
import { VehicleStatusEnum } from 'src/infraestructure/entities/vehicle/vehicle-type.enum';

export interface IVehicleService {
  delete(vehicle: Vehicle): Promise<void>;
  getById(id: number): Promise<Vehicle>;
  getVehiclesOfUser(userId: number): Promise<Vehicle[]>;
  create(
    user: JwtPayload,
    licensePlate: string,
    model: string,
    year: number,
    km: number,
  ): Promise<Vehicle>;
  updateVehicleOfUser(
    userId: number,
    vehicleId: number,
    updates: Partial<
      Pick<Vehicle, 'licensePlate' | 'model' | 'year' | 'km' | 'status'>
    >,
  ): Promise<Vehicle>;
  updateVehicleStatusByMechanic(
    vehicleId: number,
    status: VehicleStatusEnum,
  ): Promise<Vehicle>;
  getByLicensePlate(licensePlate: string): Promise<Vehicle | null>;
}

export const IVehicleServiceToken = 'IVehicleService';
