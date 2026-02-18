import { Appointment } from 'src/infraestructure/entities/appointment/appointment.entity';
import { IBaseRepository } from './base-repository.interface';
import { AppointmentStatus } from 'src/infraestructure/entities/appointment/appointment-status.enum';
import { VehicleStatusEnum } from 'src/infraestructure/entities/vehicle/vehicle-type.enum';

export interface CreateAppointmentData {
  userId: number;
  date: string;
  time: string;
  serviceIds: number[];
  workshopId: number;
  vehicleId: number;
  originalPrice: number;
  finalPrice: number | null;
  discountCouponId: number | null;
}

export enum DateFilter {
  PAST = 'past',
  TODAY = 'today',
  FUTURE = 'future',
}

export interface IAppointmentRepository extends IBaseRepository<Appointment> {
  findById(id: number): Promise<Appointment | null>;
  findDetailsById(id: number): Promise<Appointment | null>;

  setKmAtServiceIfNull(
    appointmentId: number,
    kmAtService: number,
  ): Promise<void>;

  setVehicleStatusAtServiceIfNull(
    appointmentId: number,
    vehicleStatusAtService: VehicleStatusEnum,
  ): Promise<void>;

  findLastCompletedAppointmentForService(params: {
    userId: number;
    vehicleId: number;
    serviceId: number;
  }): Promise<Appointment | null>;

  deletePendingAppointmentsOfVehicle(id: number): Promise<void>;

  getNextAppointmentsOfUser(userId: number): Promise<Appointment[]>;
  getAppointmentsOfWorkshop(
    workshopId: number,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]>;

  getAppointmentsBySearch(
    workshopId: number,
    status?: AppointmentStatus,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]>;

  getAppointmentsOfUser(
    userId: number,
    dateFilter?: DateFilter,
  ): Promise<Appointment[]>;

  createAppointment(data: CreateAppointmentData): Promise<Appointment | null>;

  findAppointmentRangeByWorkshop(
    workshopId: number,
    timeRange: 'week' | 'two_weeks' | 'month',
  ): Promise<{ date: string; count: number }[]>;
}

export const IAppointmentRepositoryToken = 'IAppointmentRepository';
