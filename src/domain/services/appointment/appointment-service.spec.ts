import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import {
  IAppointmentService,
  IAppointmentServiceToken,
} from 'src/domain/interfaces/appointment-service.interface';
import { AppointmentService } from './appointment.service';
import {
  DateFilter,
  IAppointmentRepository,
  IAppointmentRepositoryToken,
} from 'src/infraestructure/repositories/interfaces/appointment-repository.interface';
import { JwtPayload } from 'src/infraestructure/dtos/shared/jwt-payload.interface';
import { Service } from 'src/infraestructure/entities/service/service.entity';
import { User } from 'src/infraestructure/entities/user/user.entity';
import { Appointment } from 'src/infraestructure/entities/appointment/appointment.entity';
import { UserRole } from 'src/infraestructure/entities/user/user-role.enum';
import {
  IServiceService,
  IServiceServiceToken,
} from 'src/domain/interfaces/service-service.interface';
import {
  ISparePartService,
  ISparePartServiceToken,
} from 'src/domain/interfaces/spare-part-service.interface';
import { Vehicle } from 'src/infraestructure/entities/vehicle/vehicle.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IExpenseTrackerService,
  IExpenseTrackerServiceToken,
} from 'src/domain/interfaces/expense-tracker-service.interface';
import {
  IDiscountCouponService,
  IDiscountCouponServiceToken,
} from 'src/domain/interfaces/discount-coupon-service.interface';
import {
  IDiscountCouponRepository,
  IDiscountCouponRepositoryToken,
} from 'src/infraestructure/repositories/interfaces/discount-coupon-repository.interface';
import {
  IUsersTokenService,
  IUsersTokenServiceToken,
} from 'src/domain/interfaces/users-token-service.interface';

describe('AppointmentService', () => {
  let appointmentService: IAppointmentService;
  const appointmentRepositoryMock = mockDeep<IAppointmentRepository>();
  const sparePartsServiceMock = mockDeep<ISparePartService>();
  const serviceServiceMock = mockDeep<IServiceService>();
  const expenseTrackerServiceMock = mockDeep<IExpenseTrackerService>();
  const usersTokenServiceMock = mockDeep<IUsersTokenService>();
  const discountCouponServiceMock = mockDeep<IDiscountCouponService>();
  const discountCouponRepositoryMock = mockDeep<IDiscountCouponRepository>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: IAppointmentServiceToken, useClass: AppointmentService },
        {
          provide: IAppointmentRepositoryToken,
          useValue: appointmentRepositoryMock,
        },
        {
          provide: IServiceServiceToken,
          useValue: serviceServiceMock,
        },
        {
          provide: ISparePartServiceToken,
          useValue: sparePartsServiceMock,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: IDiscountCouponServiceToken,
          useValue: discountCouponServiceMock,
        },
        {
          provide: IDiscountCouponRepositoryToken,
          useValue: discountCouponRepositoryMock,
        },
        {
          provide: IExpenseTrackerServiceToken,
          useValue: expenseTrackerServiceMock,
        },
        {
          provide: IUsersTokenServiceToken,
          useValue: usersTokenServiceMock,
        },
      ],
    }).compile();

    appointmentService = module.get<IAppointmentService>(
      IAppointmentServiceToken,
    );
  });

  describe('create', () => {
    it('should call appointmentRepository.createAppointment with correct params and return the result', async () => {
      const user: JwtPayload = {
        id: 1,
        email: 'test@test.com',
        userRole: UserRole.USER,
      } as any;
      const workshop: User = { id: 3 } as User;
      const vehicle: Vehicle = { id: 5 } as any;
      const date = '2024-06-01';
      const time = '10:00';
      const service = {
        id: 1,
        name: 'Service 1',
        price: 100,
        spareParts: [],
      } as unknown as Service;
      const appointment: Appointment = {
        id: 123,
        services: [service],
      } as unknown as Appointment;

      appointmentRepositoryMock.createAppointment.mockResolvedValue(
        appointment,
      );

      serviceServiceMock.getByIds.mockResolvedValue([service]);

      const result = await appointmentService.create(
        user,
        date,
        time,
        [service],
        workshop,
        vehicle,
      );

      expect(appointmentRepositoryMock.createAppointment).toHaveBeenCalledWith({
        userId: user.id,
        date,
        time,
        serviceIds: [service.id],
        workshopId: workshop.id,
        vehicleId: vehicle.id,
        originalPrice: 100,
        finalPrice: 100,
        discountCouponId: null,
      });
      expect(result).toBe(appointment);
    });
  });

  describe('getNextAppointmentsOfUser', () => {
    it('should call appointmentRepository.getNextAppointmentsOfUser and return the result', async () => {
      const userId = 1;
      const appointments: Appointment[] = [{ id: 1 } as Appointment];
      appointmentRepositoryMock.getNextAppointmentsOfUser.mockResolvedValue(
        appointments,
      );

      const result = await appointmentService.getNextAppointmentsOfUser(userId);

      expect(
        appointmentRepositoryMock.getNextAppointmentsOfUser,
      ).toHaveBeenCalledWith(userId);
      expect(result).toBe(appointments);
    });
  });

  describe('getNextAppointmentsOfWorkshop', () => {
    it('should call appointmentRepository.getNextAppointmentsOfWorkshop and return the result', async () => {
      const workshopId = 2;
      const appointments: Appointment[] = [{ id: 2 } as Appointment];
      appointmentRepositoryMock.getAppointmentsOfWorkshop.mockResolvedValue(
        appointments,
      );

      const result = await appointmentService.getNextAppointmentsOfWorkshop(
        workshopId,
        DateFilter.FUTURE,
      );

      expect(
        appointmentRepositoryMock.getAppointmentsOfWorkshop,
      ).toHaveBeenCalledWith(workshopId, DateFilter.FUTURE);
      expect(result).toBe(appointments);
    });
  });
});
