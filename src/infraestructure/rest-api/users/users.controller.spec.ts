import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import {
  IUsersService,
  IUsersServiceToken,
} from 'src/domain/interfaces/users-service.interface';
import {
  IPasswordRecoveryService,
  IPasswordRecoveryServiceToken,
} from 'src/domain/interfaces/password-recovery-service.interface';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { CreateUserDto } from 'src/infraestructure/dtos/users/create-user.dto';
import { LoginUserDto } from 'src/infraestructure/dtos/users/login-user.dto';
import { PasswordRecoveryDto } from 'src/infraestructure/dtos/users/password-recovery.dto';
import { ChangePasswordDto } from 'src/infraestructure/dtos/users/change-password.dto';
import { UpdateUserDto } from 'src/infraestructure/dtos/users/update-user.dto';
import { UpdateUserPasswordDto } from 'src/infraestructure/dtos/users/update-user-password.dto';
import {
  IUserReviewService,
  IUserReviewServiceToken,
} from 'src/domain/interfaces/user-review.interface';
import {
  IDiscountCouponService,
  IDiscountCouponServiceToken,
} from 'src/domain/interfaces/discount-coupon-service.interface';

describe('UsersController', () => {
  let controller: UsersController;
  const usersServiceMock: MockProxy<IUsersService> = mockDeep<IUsersService>();
  const passwordRecoveryServiceMock: MockProxy<IPasswordRecoveryService> =
    mockDeep<IPasswordRecoveryService>();
  const userReviewServiceMock: MockProxy<IUserReviewService> =
    mockDeep<IUserReviewService>();
  const discountCouponServiceMock: MockProxy<IDiscountCouponService> =
    mockDeep<IDiscountCouponService>();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: IUsersServiceToken, useValue: usersServiceMock },
        {
          provide: IPasswordRecoveryServiceToken,
          useValue: passwordRecoveryServiceMock,
        },
        {
          provide: IUserReviewServiceToken,
          useValue: userReviewServiceMock,
        },
        {
          provide: IDiscountCouponServiceToken,
          useValue: discountCouponServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should call usersService.getAllWorkshops on getAllWorkshops', async () => {
    const result = [{ id: 1, name: 'Workshop' }];
    usersServiceMock.getAllWorkshops.mockResolvedValue(result as any);
    const expected = result.map((w) => ({
      ...w,
      reviews: [],
      subCategories: [],
    }));
    await expect(controller.getAllWorkshops()).resolves.toEqual(
      expected as any,
    );
    expect(usersServiceMock.getAllWorkshops).toHaveBeenCalled();
  });

  it('should call usersService.create on create', async () => {
    const dto: CreateUserDto = {
      email: 'test@mail.com',
      password: 'pass',
    } as any;
    const createdUser = { id: 1, ...dto };
    usersServiceMock.create.mockResolvedValue(createdUser as any);
    await expect(controller.create(dto)).resolves.toBe(createdUser);
    expect(usersServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('should call usersService.update on update', async () => {
    const dto: UpdateUserDto = { name: 'New Name' } as any;
    const user = { sub: 1 } as any;
    const updatedUser = { id: 1, ...dto };
    usersServiceMock.update.mockResolvedValue(updatedUser as any);
    await expect(controller.update(dto, user)).resolves.toBe(updatedUser);
    expect(usersServiceMock.update).toHaveBeenCalledWith(user, dto);
  });

  it('should call usersService.updatePassword on updatePassword', async () => {
    const dto: UpdateUserPasswordDto = {
      oldPassword: 'old',
      newPassword: 'new',
    } as any;
    const user = { sub: 1 } as any;
    const result = { success: true };
    usersServiceMock.updatePassword.mockResolvedValue(result as any);
    await expect(controller.updatePassword(dto, user)).resolves.toBe(result);
    expect(usersServiceMock.updatePassword).toHaveBeenCalledWith(user, dto);
  });

  it('should call usersService.login on login', async () => {
    const dto: LoginUserDto = {
      email: 'test@mail.com',
      password: 'pass',
    } as any;
    const token = { accessToken: 'jwt' };
    usersServiceMock.login.mockResolvedValue(token as any);
    await expect(controller.login(dto)).resolves.toBe(token);
    expect(usersServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('should call passwordRecoveryService.request on passwordRecovery', async () => {
    const dto: PasswordRecoveryDto = { email: 'test@mail.com' } as any;
    const result = { message: 'sent' };
    passwordRecoveryServiceMock.request.mockResolvedValue(result as any);
    await expect(controller.passwordRecovery(dto)).resolves.toBe(result);
    expect(passwordRecoveryServiceMock.request).toHaveBeenCalledWith(dto);
  });

  it('should call passwordRecoveryService.change on changePassword', async () => {
    const dto: ChangePasswordDto = {
      token: 'token',
      newPassword: 'new',
    } as any;
    const result = { success: true };
    passwordRecoveryServiceMock.change.mockResolvedValue(result as any);
    await expect(controller.changePassword(dto)).resolves.toBe(result);
    expect(passwordRecoveryServiceMock.change).toHaveBeenCalledWith(dto);
  });
});
