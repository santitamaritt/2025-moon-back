import { Test, TestingModule } from '@nestjs/testing';
import {
  IHashService,
  IHashServiceToken,
} from 'src/domain/interfaces/hash-service.interface';
import {
  IJwtService,
  IJwtServiceToken,
} from 'src/domain/interfaces/jwt-service.interface';
import {
  IUsersService,
  IUsersServiceToken,
} from 'src/domain/interfaces/users-service.interface';
import {
  IUsersRepository,
  IUsersRepositoryToken,
} from 'src/infraestructure/repositories/interfaces/users-repository.interface';
import { UsersService } from './users.service';
import { mockDeep } from 'jest-mock-extended';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { CreateUserDto } from 'src/infraestructure/dtos/users/create-user.dto';
import { LoginUserDto } from 'src/infraestructure/dtos/users/login-user.dto';
import { UpdateUserDto } from 'src/infraestructure/dtos/users/update-user.dto';
import { UpdateUserPasswordDto } from 'src/infraestructure/dtos/users/update-user-password.dto';
import { User } from 'src/infraestructure/entities/user/user.entity';
import { UserRole } from 'src/infraestructure/entities/user/user-role.enum';
import {
  IExpenseTrackerService,
  IExpenseTrackerServiceToken,
} from 'src/domain/interfaces/expense-tracker-service.interface';
import {
  IUsersTokenRepository,
  IUsersTokenRepositoryToken,
} from 'src/infraestructure/repositories/interfaces/users-token-repository.interface';

describe('UsersService', () => {
  let usersService: IUsersService;

  const usersRepositoryMock = mockDeep<IUsersRepository>();
  const hashServiceMock = mockDeep<IHashService>();
  const jwtServiceMock = mockDeep<IJwtService>();
  const expenseTrackerMock = mockDeep<IExpenseTrackerService>();
  const usersTokenRepositoryMock = mockDeep<IUsersTokenRepository>();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        { provide: IUsersServiceToken, useClass: UsersService },
        { provide: IUsersRepositoryToken, useValue: usersRepositoryMock },
        { provide: IHashServiceToken, useValue: hashServiceMock },
        { provide: IJwtServiceToken, useValue: jwtServiceMock },
        { provide: IExpenseTrackerServiceToken, useValue: expenseTrackerMock },
        {
          provide: IUsersTokenRepositoryToken,
          useValue: usersTokenRepositoryMock,
        },
      ],
    }).compile();

    usersService = module.get<IUsersService>(IUsersServiceToken);
  });

  it('should get all workshops', async () => {
    const users = [{ id: 1 } as any as User, { id: 2 } as User];
    usersRepositoryMock.getAllWorkshops.mockResolvedValue(users);
    const result = await usersService.getAllWorkshops();
    expect(result).toBe(users);
    expect(usersRepositoryMock.getAllWorkshops).toHaveBeenCalled();
  });

  it('should get workshop by id', async () => {
    const user = { id: 1 } as any as User;
    usersRepositoryMock.findWorkshopById.mockResolvedValue(user);
    const result = await usersService.getWorkshopById(1);
    expect(result).toBe(user);
    expect(usersRepositoryMock.findWorkshopById).toHaveBeenCalledWith(1);
  });

  describe('updatePassword', () => {
    it('should throw if current password is invalid', async () => {
      const user = { id: 1, hashedPassword: 'hashed' } as User;
      usersRepositoryMock.findByIdOrThrowWithPassword.mockResolvedValue(user);
      hashServiceMock.verify.mockResolvedValue(false);
      const dto: UpdateUserPasswordDto = {
        currentPassword: 'wrong',
        newPassword: 'newpass',
      };
      await expect(
        usersService.updatePassword({ id: 1 } as any, dto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update password if current password is valid', async () => {
      const user = { id: 1, hashedPassword: 'hashed' } as User;
      usersRepositoryMock.findByIdOrThrowWithPassword.mockResolvedValue(user);
      hashServiceMock.verify.mockResolvedValue(true);
      hashServiceMock.hash.mockResolvedValue('newHashed');
      usersRepositoryMock.save.mockResolvedValue(user);
      const dto: UpdateUserPasswordDto = {
        currentPassword: 'correct',
        newPassword: 'newpass',
      };
      await usersService.updatePassword({ id: 1 } as any, dto);
      expect(user.hashedPassword).toBe('newHashed');
      expect(usersRepositoryMock.save).toHaveBeenCalledWith(user);
    });
  });

  describe('update', () => {
    it('should update user and return new token', async () => {
      const user = { id: 1 } as any as User;
      usersRepositoryMock.findByIdOrThrow.mockResolvedValue(user);
      usersRepositoryMock.save.mockResolvedValue(user);
      jwtServiceMock.sign.mockReturnValue('token123');
      const dto: UpdateUserDto = {
        fullName: 'New Name',
        workshopName: 'New Workshop',
        address: 'New Address',
        addressLatitude: 1,
        addressLongitude: 2,
      };
      const result = await usersService.update({ id: 1 } as any, dto);
      expect(usersRepositoryMock.save).toHaveBeenCalledWith(user);
      expect(result.token).toBe('token123');
    });
  });

  describe('create', () => {
    it('should throw if email already exists', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValue({} as User);
      const dto: CreateUserDto = {
        address: '',
        addressLatitude: 0,
        addressLongitude: 0,
        email: 'test@mail.com',
        fullName: '',
        password: '',
        workshopName: '',
        userRole: UserRole.USER,
      };
      await expect(usersService.create(dto)).rejects.toThrow(HttpException);
    });

    it('should create user if email does not exist', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValue(null);
      hashServiceMock.hash.mockResolvedValue('hashed');
      usersRepositoryMock.save.mockResolvedValue({ id: 1 } as any as User);
      usersRepositoryMock.findByIdOrThrow.mockResolvedValue({ id: 1 } as any);
      const dto: CreateUserDto = {
        address: 'addr',
        addressLatitude: 1,
        addressLongitude: 2,
        email: 'test@mail.com',
        fullName: 'Test',
        password: 'pass',
        workshopName: 'workshop',
        userRole: UserRole.USER,
      };
      const result = await usersService.create(dto);
      expect(usersRepositoryMock.save).toHaveBeenCalled();
      expect(usersRepositoryMock.findByIdOrThrow).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 } as any);
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      usersRepositoryMock.findByEmailWithPassword.mockResolvedValue(null);
      const dto: LoginUserDto = { email: 'a', password: 'b' };
      await expect(usersService.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if password is invalid', async () => {
      usersRepositoryMock.findByEmailWithPassword.mockResolvedValue({
        hashedPassword: 'x',
      } as User);
      hashServiceMock.verify.mockResolvedValue(false);
      const dto: LoginUserDto = { email: 'a', password: 'b' };
      await expect(usersService.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return token if login is valid', async () => {
      usersRepositoryMock.findByEmailWithPassword.mockResolvedValue({
        hashedPassword: 'x',
      } as User);
      hashServiceMock.verify.mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('token123');
      const dto: LoginUserDto = { email: 'a', password: 'b' };
      const result = await usersService.login(dto);
      expect(result.token).toBe('token123');
    });
  });
});
