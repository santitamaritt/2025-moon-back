import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'src/infraestructure/entities/user/user.entity';
import { DataSource, Repository } from 'typeorm';
import { IUsersRepository } from './interfaces/users-repository.interface';
import { UserRole } from '../entities/user/user-role.enum';

@Injectable()
export class UsersRepository
  extends Repository<User>
  implements IUsersRepository
{
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  getAllWorkshops(): Promise<User[]> {
    return this.find({ where: { userRole: UserRole.MECHANIC } });
  }

  findWorkshopById(id: number): Promise<User | null> {
    return this.findOne({ where: { id, userRole: UserRole.MECHANIC } });
  }

  async findByIdOrThrow(id: number): Promise<User> {
    const user = await this.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdOrThrowWithPassword(id: number): Promise<User> {
    const user = await this.createQueryBuilder('user')
      .addSelect('user.hashedPassword')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.hashedPassword')
      .where('user.email = :email', { email })
      .getOne();
  }
}
