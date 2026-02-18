import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Vehicle } from 'src/infraestructure/entities/vehicle/vehicle.entity';
import {
  CreateVehicleData,
  IVehicleRepository,
  UpdateVehicleData,
} from './interfaces/vehicle-repository.interface';

@Injectable()
export class VehicleRepository
  extends Repository<Vehicle>
  implements IVehicleRepository
{
  constructor(private dataSource: DataSource) {
    super(Vehicle, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Vehicle> {
    const vehicle = await this.findOne({ where: { id }, relations: ['user'] });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async getVehiclesOfUser(userId: number): Promise<Vehicle[]> {
    return this.createQueryBuilder('vehicle')
      .leftJoin('vehicle.user', 'user')
      .leftJoin('vehicle.appointments', 'appointments')
      .where('user.id = :userId', { userId })
      .groupBy('vehicle.id')
      .getMany();
  }

  async createVehicle(entityData: CreateVehicleData): Promise<Vehicle> {
    const result = await this.save({
      licensePlate: entityData.licensePlate,
      model: entityData.model,
      year: entityData.year,
      km: entityData.km,
      user: { id: entityData.userId },
    });

    const vehicle = await this.createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.user', 'user')
      .where('vehicle.id = :id', { id: result.id })
      .getOne();

    if (!vehicle) {
      throw new Error('Vehicle not found after creation');
    }

    return vehicle;
  }

  async updateVehicleOfUser(data: UpdateVehicleData): Promise<Vehicle> {
    const vehicle = await this.createQueryBuilder('vehicle')
      .leftJoin('vehicle.user', 'user')
      .where('vehicle.id = :vehicleId', { vehicleId: data.vehicleId })
      .andWhere('user.id = :userId', { userId: data.userId })
      .getOne();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== data.userId) {
      throw new ForbiddenException('You cannot update this vehicle');
    }

    if (data.licensePlate !== undefined)
      vehicle.licensePlate = data.licensePlate;
    if (data.model !== undefined) vehicle.model = data.model;
    if (data.year !== undefined) vehicle.year = data.year;
    if (data.km !== undefined) vehicle.km = data.km;
    if (data.status !== undefined) vehicle.status = data.status;

    return this.save(vehicle);
  }

  async getByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    const vehicle = await this.findOne({
      where: { licensePlate },
    });

    return vehicle || null;
  }
}
