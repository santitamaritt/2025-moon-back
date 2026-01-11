import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/infraestructure/dtos/users/create-user.dto';
import { LoginUserDto } from 'src/infraestructure/dtos/users/login-user.dto';
import { IUsersService } from 'src/domain/interfaces/users-service.interface';

import { IHashServiceToken } from 'src/domain/interfaces/hash-service.interface';
import type { IHashService } from 'src/domain/interfaces/hash-service.interface';
import type { IJwtService } from 'src/domain/interfaces/jwt-service.interface';
import { IJwtServiceToken } from 'src/domain/interfaces/jwt-service.interface';
import { IUsersRepositoryToken } from 'src/infraestructure/repositories/interfaces/users-repository.interface';
import type { IUsersRepository } from 'src/infraestructure/repositories/interfaces/users-repository.interface';
import { JwtPayload } from 'src/infraestructure/dtos/shared/jwt-payload.interface';
import { UpdateUserDto } from 'src/infraestructure/dtos/users/update-user.dto';
import { UpdateUserPasswordDto } from 'src/infraestructure/dtos/users/update-user-password.dto';
import { User } from 'src/infraestructure/entities/user/user.entity';
import {
  IExpenseTrackerServiceToken,
  type IExpenseTrackerService,
} from 'src/domain/interfaces/expense-tracker-service.interface';
import {
  type IUsersTokenRepository,
  IUsersTokenRepositoryToken,
} from 'src/infraestructure/repositories/interfaces/users-token-repository.interface';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    @Inject(IUsersRepositoryToken)
    private readonly usersRepository: IUsersRepository,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
    @Inject(IJwtServiceToken) private readonly jwtService: IJwtService,
    @Inject(IExpenseTrackerServiceToken)
    private readonly expenseTracker: IExpenseTrackerService,
    @Inject(IUsersTokenRepositoryToken)
    private readonly usersTokenRepository: IUsersTokenRepository,
  ) {}

  async spendeeAuth(mechanic: JwtPayload, code: string): Promise<void> {
    const [token, refreshToken] = await this.expenseTracker.fetchToken(code);
    await this.usersTokenRepository.upsertToken(
      mechanic.id,
      token,
      refreshToken,
    );
  }

  getAllWorkshops(): Promise<User[]> {
    return this.usersRepository.getAllWorkshops();
  }

  getWorkshopById(id: number): Promise<User | null> {
    return this.usersRepository.findWorkshopById(id);
  }

  async updatePassword(
    userPayload: JwtPayload,
    dto: UpdateUserPasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdOrThrowWithPassword(
      userPayload.id,
    );
    if (
      !(await this.hashService.verify(dto.currentPassword, user.hashedPassword))
    ) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.hashedPassword = await this.hashService.hash(dto.newPassword);
    await this.usersRepository.save(user);
  }

  async update(
    userPayload: JwtPayload,
    dto: UpdateUserDto,
  ): Promise<{ token: string }> {
    const user = await this.usersRepository.findByIdOrThrow(userPayload.id);
    user.fullName = dto.fullName;
    user.workshopName = dto.workshopName;
    user.address = dto.address;
    user.addressLatitude = dto.addressLatitude;
    user.addressLongitude = dto.addressLongitude;
    await this.usersRepository.save(user);
    const token = this.jwtService.sign(user);
    return { token };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const conflictingUser = await this.usersRepository.findByEmail(dto.email);
    if (conflictingUser) {
      throw new HttpException('email already existing', HttpStatus.CONFLICT);
    }

    const created = await this.usersRepository.save({
      address: dto.address,
      addressLatitude: dto.addressLatitude,
      addressLongitude: dto.addressLongitude,
      email: dto.email,
      fullName: dto.fullName,
      hashedPassword: await this.hashService.hash(dto.password),
      workshopName: dto.workshopName,
      userRole: dto.userRole,
    });

    return this.usersRepository.findByIdOrThrow(created.id);
  }

  async login(dto: LoginUserDto) {
    const user = await this.usersRepository.findByEmailWithPassword(dto.email);
    if (
      !user ||
      !(await this.hashService.verify(dto.password, user?.hashedPassword))
    ) {
      throw new UnauthorizedException('invalid login');
    }

    const token = this.jwtService.sign(user);

    return { token };
  }

  async findById(id: number): Promise<User> {
    return await this.usersRepository.findByIdOrThrow(id);
  }
}
