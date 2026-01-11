import { User } from 'src/infraestructure/entities/user/user.entity';
import { IBaseRepository } from './base-repository.interface';

export interface IUsersRepository extends IBaseRepository<User> {
  findWorkshopById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  findByIdOrThrow(id: number): Promise<User>;
  findByIdOrThrowWithPassword(id: number): Promise<User>;
  getAllWorkshops(): Promise<User[]>;
}

export const IUsersRepositoryToken = 'IUsersRepository';
