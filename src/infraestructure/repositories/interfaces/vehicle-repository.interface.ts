import { Vehicle } from 'src/infraestructure/entities/vehicle/vehicle.entity';
import { IBaseRepository } from './base-repository.interface';
import { VehicleStatusEnum } from 'src/infraestructure/entities/vehicle/vehicle-type.enum';

export interface CreateVehicleData {
  userId: number;
  licensePlate: string;
  model: string;
  year: number;
  km: number;
}

export interface UpdateVehicleData {
  userId: number;
  vehicleId: number;
  licensePlate?: string;
  model?: string;
  year?: number;
  km?: number;
  status?: VehicleStatusEnum | null;
}

export interface IVehicleRepository extends IBaseRepository<Vehicle> {
  getById(vehicleId: number): Promise<Vehicle>;
  getVehiclesOfUser(userId: number): Promise<Vehicle[]>;
  createVehicle(entityData: CreateVehicleData): Promise<Vehicle>;
  updateVehicleOfUser(data: UpdateVehicleData): Promise<Vehicle>;
  getByLicensePlate(licensePlate: string): Promise<Vehicle | null>;
}

export const IVehicleRepositoryToken = 'IVehicleRepository';
