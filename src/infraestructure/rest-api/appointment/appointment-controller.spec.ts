import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentController } from './appointment.controller';
import {
  IAppointmentService,
  IAppointmentServiceToken,
} from 'src/domain/interfaces/appointment-service.interface';
import {
  IServiceService,
  IServiceServiceToken,
} from 'src/domain/interfaces/service-service.interface';
import {
  IUsersService,
  IUsersServiceToken,
} from 'src/domain/interfaces/users-service.interface';
import { NotFoundException } from '@nestjs/common';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { CreateAppointmentDto } from 'src/infraestructure/dtos/appointment/create-appointment.dto';
import { DateFilter } from 'src/infraestructure/repositories/interfaces/appointment-repository.interface';
import {
  IVehicleService,
  IVehicleServiceToken,
} from 'src/domain/interfaces/vehicle-service.interface';

describe('AppointmentController', () => {
  let controller: AppointmentController;
  let appointmentServiceMock: MockProxy<IAppointmentService>;
  let serviceServiceMock: MockProxy<IServiceService>;
  let usersServiceMock: MockProxy<IUsersService>;
  let vehicleServiceMock: MockProxy<IVehicleService>;

  const userPayload = { id: 'user-1' } as any;
  const workshopPayload = { id: 2 } as any;
  const queryPayload = { dateFilter: DateFilter.FUTURE };
  const service = { id: 1 };
  const workshop = { id: 2 };
  const appointment = { id: 'appointment-1' };

  beforeEach(async () => {
    appointmentServiceMock = mockDeep<IAppointmentService>();
    serviceServiceMock = mockDeep<IServiceService>();
    usersServiceMock = mockDeep<IUsersService>();
    vehicleServiceMock = mockDeep<IVehicleService>();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentController],
      providers: [
        {
          provide: IAppointmentServiceToken,
          useValue: appointmentServiceMock,
        },
        {
          provide: IServiceServiceToken,
          useValue: serviceServiceMock,
        },
        {
          provide: IUsersServiceToken,
          useValue: usersServiceMock,
        },
        {
          provide: IVehicleServiceToken,
          useValue: vehicleServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AppointmentController>(AppointmentController);
  });

  describe('getNextAppointmentsOfUser', () => {
    it('should call appointmentService.getNextAppointmentsOfUser with user id', async () => {
      appointmentServiceMock.getNextAppointmentsOfUser.mockResolvedValue([
        appointment as any,
      ]);
      const result = await controller.getNextAppointmentsOfUser(userPayload);
      expect(
        appointmentServiceMock.getNextAppointmentsOfUser,
      ).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([appointment]);
    });
  });

  describe('getNextAppointments', () => {
    it('should call appointmentService.getNextAppointmentsOfWorkshop with workshop id', async () => {
      appointmentServiceMock.getNextAppointmentsOfWorkshop.mockResolvedValue([
        appointment as any,
      ]);
      const result = await controller.getNextAppointments(
        workshopPayload,
        queryPayload,
      );
      expect(
        appointmentServiceMock.getNextAppointmentsOfWorkshop,
      ).toHaveBeenCalledWith(2, DateFilter.FUTURE);
      expect(result).toEqual([appointment]);
    });
  });

  describe('createAppointment', () => {
    const dto: CreateAppointmentDto = {
      serviceIds: [1],
      workshopId: 2,
      vehicleId: 9,
      date: '2024-06-01',
      time: '10:00',
    };

    it('should throw NotFoundException if service not found', async () => {
      serviceServiceMock.getByIds.mockResolvedValue([] as any);
      await expect(
        controller.createAppointment(userPayload, dto),
      ).rejects.toThrow(NotFoundException);
      expect(serviceServiceMock.getByIds).toHaveBeenCalledWith([1]);
    });

    it('should throw NotFoundException if workshop not found', async () => {
      serviceServiceMock.getByIds.mockResolvedValue([service] as any);
      usersServiceMock.getWorkshopById.mockResolvedValue(null);
      await expect(
        controller.createAppointment(userPayload, dto),
      ).rejects.toThrow(NotFoundException);
      expect(usersServiceMock.getWorkshopById).toHaveBeenCalledWith(2);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      serviceServiceMock.getByIds.mockResolvedValue([service] as any);
      usersServiceMock.getWorkshopById.mockResolvedValue(workshop as any);
      vehicleServiceMock.getById.mockResolvedValue(null as any);
      await expect(
        controller.createAppointment(userPayload, dto),
      ).rejects.toThrow(NotFoundException);
      expect(vehicleServiceMock.getById).toHaveBeenCalledWith(9);
    });

    it('should call appointmentService.create with correct params', async () => {
      serviceServiceMock.getByIds.mockResolvedValue([service] as any);
      usersServiceMock.getWorkshopById.mockResolvedValue(workshop as any);
      vehicleServiceMock.getById.mockResolvedValue({ id: 9 } as any);
      appointmentServiceMock.create.mockResolvedValue(appointment as any);

      const result = await controller.createAppointment(userPayload, dto);

      expect(serviceServiceMock.getByIds).toHaveBeenCalledWith([1]);
      expect(usersServiceMock.getWorkshopById).toHaveBeenCalledWith(2);
      expect(vehicleServiceMock.getById).toHaveBeenCalledWith(9);
      expect(appointmentServiceMock.create).toHaveBeenCalledWith(
        userPayload,
        dto.date,
        dto.time,
        [service],
        workshop,
        { id: 9 },
        undefined,
      );
      expect(result).toBe(appointment);
    });
  });
});
