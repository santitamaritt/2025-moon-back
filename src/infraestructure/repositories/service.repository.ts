import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { IServiceRepository } from './interfaces/service-repository.interface';
import { Service } from '../entities/service/service.entity';
import { PaginatedQueryDto } from 'src/domain/dtos/paginated-query.dto';
import { PaginatedResultDto } from 'src/domain/dtos/paginated-result.dto';
import { ServiceSparePart } from '../entities/service/service-spare-part.entity';
import { ServiceStatusEnum } from '../entities/service/service.enum';
import { Appointment } from '../entities/appointment/appointment.entity';

@Injectable()
export class ServiceRepository
  extends Repository<Service>
  implements IServiceRepository
{
  constructor(private dataSource: DataSource) {
    super(Service, dataSource.createEntityManager());
  }

  findByIdWithMechanic(id: number): Promise<Service | null> {
    return this.findOne({
      where: { id },
      relations: ['spareParts', 'spareParts.sparePart', 'mechanic'],
    });
  }

  async removeById(id: number): Promise<void> {
    await ServiceSparePart.delete({ service: { id } });
    const result = await this.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Service not found');
    }
    return;
  }
  getById(id: number): Promise<Service | null> {
    return this.findOne({
      where: { id },
      relations: ['spareParts', 'spareParts.sparePart'],
    });
  }

  async findByMechanicId(id: number): Promise<Service[]> {
    return this.manager
      .getRepository(Service)
      .createQueryBuilder('s')
      .leftJoin('s.spareParts', 'ss')
      .leftJoin('ss.sparePart', 'sp')
      .where('s.mechanicId = :id', { id })
      .andWhere('s.status = :status', { status: ServiceStatusEnum.ACTIVE })
      .groupBy('s.id')
      .having(
        'COUNT(ss.sparePartId) = 0 OR MIN(COALESCE(sp.stock, 0) - COALESCE(ss.quantity, 0)) >= 0',
      )
      .orderBy('s.id', 'DESC')
      .getMany();
  }

  async findPaginated(
    query: PaginatedQueryDto,
    mechanicId: number,
  ): Promise<PaginatedResultDto<Service>> {
    const {
      page = 1,
      pageSize = 10,
      search,
      orderBy = 'id',
      orderDir = 'DESC',
    } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.findAndCount({
      where: {
        mechanic: { id: mechanicId },
        ...(search && { name: ILike(`%${search}%`) }),
      },
      order: {
        [orderBy]: orderDir,
      },
      take: pageSize,
      skip,
      relations: ['spareParts', 'spareParts.sparePart'],
    });

    return {
      data: items,
      total,
      page,
      pageSize,
      orderBy,
      orderDir,
    };
  }

  async findAll() {
    return this.find();
  }

  async findById(id: number) {
    const service = await this.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async findByIds(ids: number[]) {
    const services = await this.find({
      where: { id: In(ids) },
      relations: ['spareParts', 'spareParts.sparePart'],
    });
    if (services.length !== ids.length) {
      throw new NotFoundException('Some services not found');
    }
    return services;
  }

  async findRequestedServices(
    mechanicId: number,
  ): Promise<(Service & { appointmentsCount: number })[]> {
    return this.createQueryBuilder('service')
      .leftJoinAndSelect('service.spareParts', 'spareParts')
      .leftJoin('spareParts.sparePart', 'sp')
      .leftJoin('appointment_services', 'apse', 'apse.service_id = service.id')
      .leftJoin(
        'appointments',
        'appointment',
        'appointment.id = apse.appointment_id',
      )
      .where('service.mechanicId = :mechanicId', { mechanicId })
      .groupBy('service.id')
      .addGroupBy('spareParts.serviceId')
      .addGroupBy('spareParts.sparePartId')
      .addGroupBy('sp.name')
      .select([
        'service',
        'spareParts',
        'sp.name AS "sparePartName"',
        'COUNT(DISTINCT apse.appointment_id) AS "appointmentsCount"',
      ])
      .orderBy('"appointmentsCount"', 'DESC')
      .getRawAndEntities()
      .then(({ entities, raw }) => {
        return entities.map((service) => {
          const rowsForService = raw.filter((r) => r.service_id === service.id);
          const firstRow = rowsForService[0];
          const appointmentsCount = firstRow
            ? Number(firstRow.appointmentsCount)
            : 0;
          service.spareParts.forEach((spItem) => {
            const matchRow = rowsForService.find(
              (r) => r.spareParts_sparePartId === spItem.sparePartId,
            );
            if (matchRow && matchRow.sparePartName) {
              Object.assign(spItem as unknown as Record<string, unknown>, {
                sparePartName: matchRow.sparePartName,
              });
            }
          });

          return {
            ...service,
            appointmentsCount,
          } as Service & { appointmentsCount: number };
        });
      });
  }

  async findServiceStatsByUserId(userId: number): Promise<
    {
      serviceName: string;
      vehicles: { vehiclePlate: string; count: number; totalCost: number }[];
    }[]
  > {
    const rawData = await this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .leftJoin('appointment.services', 'service')
      .leftJoin('appointment.vehicle', 'vehicle')
      .select('service.name', 'serviceName')
      .addSelect('vehicle.licensePlate', 'vehiclePlate')
      .addSelect('COUNT(appointment.id)', 'count')
      .addSelect('SUM(service.price)', 'totalCost')
      .where('appointment.user_id = :userId', { userId })
      .groupBy('service.name')
      .addGroupBy('vehicle.licensePlate')
      .getRawMany();

    const grouped = rawData.reduce(
      (acc, row) => {
        const service = acc.find((s) => s.serviceName === row.serviceName);
        if (service) {
          service.vehicles.push({
            vehiclePlate: row.vehiclePlate,
            count: Number(row.count),
            totalCost: Number(row.totalCost),
          });
        } else {
          acc.push({
            serviceName: row.serviceName,
            vehicles: [
              {
                vehiclePlate: row.vehiclePlate,
                count: Number(row.count),
                totalCost: Number(row.totalCost),
              },
            ],
          });
        }
        return acc;
      },
      [] as {
        serviceName: string;
        vehicles: { vehiclePlate: string; count: number; totalCost: number }[];
      }[],
    );

    return grouped;
  }

  async findTopGrowingServices(
    mechanicId: number,
    days = 30,
  ): Promise<
    {
      serviceName: string;
      currentCount: number;
      previousCount: number;
      growth: number;
    }[]
  > {
    const doubleDays = days * 2;

    const raw = await this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .leftJoin('appointment.services', 'service')
      .where('appointment.workshop_id = :mechanicId', { mechanicId })
      .andWhere(
        'appointment.date >= CURRENT_DATE - make_interval(days := :doubleDays)',
        { doubleDays },
      )
      .select('service.name', 'serviceName')
      .addSelect(
        `
      SUM(
        CASE
          WHEN appointment.date >= CURRENT_DATE - make_interval(days := :days)
          THEN 1 ELSE 0
        END
      )
    `,
        'currentCount',
      )
      .addSelect(
        `
      SUM(
        CASE
          WHEN appointment.date < CURRENT_DATE - make_interval(days := :days)
          THEN 1 ELSE 0
        END
      )
    `,
        'previousCount',
      )
      .setParameters({ mechanicId, days, doubleDays })
      .groupBy('service.name')
      .getRawMany();

    return raw.map((row) => {
      const current = Number(row.currentCount) || 0;
      const previous = Number(row.previousCount) || 0;
      const growth =
        previous === 0 && current === 0
          ? 0
          : previous === 0
            ? 100
            : ((current - previous) / previous) * 100;

      return {
        serviceName: row.serviceName || 'Sin nombre',
        currentCount: current,
        previousCount: previous,
        growth: Math.round(growth * 100) / 100,
      };
    });
  }
}
