import { Injectable } from '@nestjs/common';
import { Appointment } from 'src/infraestructure/entities/appointment/appointment.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import {
  CreateAppointmentData,
  DateFilter,
  IAppointmentRepository,
} from './interfaces/appointment-repository.interface';
import { SelectQueryBuilder } from 'typeorm/browser';
import { AppointmentStatus } from '../entities/appointment/appointment-status.enum';

@Injectable()
export class AppointmentRepository
  extends Repository<Appointment>
  implements IAppointmentRepository
{
  constructor(private dataSource: DataSource) {
    super(Appointment, dataSource.createEntityManager());
  }

  async getNextAppointmentsOfUser(userId: number): Promise<Appointment[]> {
    const qb = this.baseQueryBuilder();
    const appointments = this.addFutureAppointmentCondition(qb)
      .andWhere('appointment.user_id = :userId', { userId })
      .getMany();
    return appointments;
  }

  findById(id: number): Promise<Appointment | null> {
    return this.findOne({ where: { id }, relations: ['user', 'workshop'] });
  }

  findDetailsById(id: number): Promise<Appointment | null> {
    return this.findOne({
      where: { id },
      relations: ['user', 'workshop', 'vehicle', 'services'],
    });
  }

  async setKmAtServiceIfNull(
    appointmentId: number,
    kmAtService: number,
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(Appointment)
      .set({ kmAtService })
      .where('id = :appointmentId', { appointmentId })
      .andWhere('kmAtService IS NULL')
      .execute();
  }

  findLastCompletedAppointmentForService(params: {
    userId: number;
    vehicleId: number;
    serviceId: number;
  }): Promise<Appointment | null> {
    const { userId, vehicleId, serviceId } = params;
    return this.createQueryBuilder('appointment')
      .leftJoin('appointment.services', 'service')
      .where('appointment.user_id = :userId', { userId })
      .andWhere('appointment.vehicle_id = :vehicleId', { vehicleId })
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.COMPLETED,
      })
      .andWhere('service.id = :serviceId', { serviceId })
      .orderBy('appointment.date', 'DESC')
      .addOrderBy('appointment.time', 'DESC')
      .addOrderBy('appointment.id', 'DESC')
      .getOne();
  }

  async deletePendingAppointmentsOfVehicle(id: number): Promise<void> {
    const { today, nowTime } = this.getTodayAndNow();
    await this.createQueryBuilder()
      .delete()
      .from(Appointment)
      .where('vehicle_id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('date > :today', { today }).orWhere(
            'date = :today AND time >= :nowTime',
            { today, nowTime },
          );
        }),
      )
      .execute();
  }
  getAppointmentsOfWorkshop(
    workshopId: number,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]> {
    let qb = this.baseQueryBuilder();
    if (dateFilter) {
      qb = this.addDateFilterCondition(qb, dateFilter);
    }
    const appointments = qb
      .andWhere('appointment.workshop_id = :workshopId', { workshopId })
      .getMany();
    return appointments;
  }

  getAppointmentsBySearch(
    workshopId: number,
    status?: AppointmentStatus,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]> {
    let qb = this.baseQueryBuilder();
    if (dateFilter) {
      qb = this.addDateFilterCondition(qb, dateFilter);
    }
    if (status) {
      qb.andWhere('appointment.status = :status', { status });
    }
    return qb
      .andWhere('appointment.workshop_id = :workshopId', { workshopId })
      .getMany();
  }

  private addDateFilterCondition(
    qb: SelectQueryBuilder<Appointment>,
    dateFilter: DateFilter,
  ) {
    const { today, nowTime } = this.getTodayAndNow();
    switch (dateFilter) {
      case DateFilter.PAST:
        qb.andWhere(
          'appointment.date < :today OR (appointment.date = :today AND appointment.time < :nowTime)',
          {
            today,
            nowTime,
          },
        );
        break;
      case DateFilter.TODAY:
        qb.andWhere(
          'appointment.date = :today AND appointment.time >= :nowTime',
          {
            today: today,
            nowTime,
          },
        );
        break;
      case DateFilter.FUTURE:
        qb.andWhere('appointment.date > :today', { today });
        break;
      default:
        break;
    }
    return qb;
  }

  private getTodayAndNow() {
    const today = new Date();
    const nowTime = today.toTimeString().slice(0, 8);
    return { today, nowTime };
  }

  async getAppointmentsOfUser(
    userId: number,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]> {
    let qb = this.baseQueryBuilder();

    if (dateFilter) {
      qb = this.addDateFilterCondition(qb, dateFilter);
    }

    const appointments = qb
      .andWhere('appointment.user_id = :userId', { userId })
      .getMany();

    return appointments;
  }

  addFutureAppointmentCondition(qb: SelectQueryBuilder<Appointment>) {
    const { today, nowTime } = this.getTodayAndNow();
    return qb.andWhere(
      new Brackets((qb) => {
        qb.where('appointment.date = :today AND appointment.time >= :nowTime', {
          today,
          nowTime,
        }).orWhere('appointment.date > :today', { today });
      }),
    );
  }

  private baseQueryBuilder() {
    return this.createQueryBuilder('appointment')
      .withDeleted()
      .leftJoinAndSelect('appointment.services', 'services')
      .leftJoin('appointment.user', 'user')
      .leftJoin('appointment.workshop', 'workshop')
      .leftJoinAndSelect('appointment.vehicle', 'vehicle')
      .addSelect([
        'user.id',
        'user.fullName',
        'user.email',
        'workshop.id',
        'workshop.workshopName',
        'workshop.address',
        'workshop.email',
        'workshop.addressLatitude',
        'workshop.addressLongitude',
      ]);
  }

  async createAppointment(
    data: CreateAppointmentData,
  ): Promise<Appointment | null> {
    const appointment = this.create({
      user: { id: data.userId } as any,
      workshop: { id: data.workshopId } as any,
      vehicle: { id: data.vehicleId } as any,
      date: data.date,
      time: data.time,
      originalPrice: data.originalPrice,
      finalPrice: data.finalPrice,
      discountCouponId: data.discountCouponId,
    });

    await this.save(appointment);

    if (data.serviceIds?.length) {
      await this.manager
        .createQueryBuilder()
        .relation(Appointment, 'services')
        .of(appointment)
        .add(data.serviceIds);
    }

    return this.findDetailsById(appointment.id);
  }

  async findAppointmentRangeByWorkshop(
    workshopId: number,
    timeRange: 'week' | 'two_weeks' | 'month',
  ): Promise<{ date: string; count: number }[]> {
    let days = 7;
    if (timeRange === 'two_weeks') days = 14;
    else if (timeRange === 'month') days = 30;

    const results = await this.createQueryBuilder('appointment')
      .select("TO_CHAR(appointment.date, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('appointment.workshop_id = :workshopId', { workshopId })
      .andWhere(`appointment.date >= CURRENT_DATE - INTERVAL '${days} days'`)
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));

    const allDates: { date: string; count: number }[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const formatted = d.toISOString().split('T')[0];
      const found = results.find((r) => r.date === formatted);
      allDates.push({
        date: formatted,
        count: found ? Number(found.count) : 0,
      });
    }

    return allDates;
  }
}
