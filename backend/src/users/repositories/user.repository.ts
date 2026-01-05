import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { User, UserRole } from '../user.entity';
import { IUserRepository } from './user.repository.interface';

/**
 * User Repository Implementation
 * Implements IUserRepository using TypeORM
 * Follows Single Responsibility Principle - only handles data access
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly typeOrmRepository: Repository<User>,
  ) {}

  async create(
    userData: {
      email: string;
      password: string;
      teamId: string;
      role?: UserRole;
      firstName?: string;
      lastName?: string;
    },
    entityManager?: EntityManager,
  ): Promise<User> {
    const repository = entityManager
      ? entityManager.getRepository(User)
      : this.typeOrmRepository;

    const user = repository.create({
      email: userData.email,
      password: userData.password,
      teamId: userData.teamId,
      role: userData.role || UserRole.USER,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    return repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.typeOrmRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['team'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.typeOrmRepository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['team'],
    });
  }

  async findByTeamId(teamId: string): Promise<User[]> {
    return this.typeOrmRepository.find({
      where: { teamId, deletedAt: IsNull() },
      relations: ['team'],
    });
  }

  async findAll(): Promise<User[]> {
    return this.typeOrmRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['team'],
    });
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, updates);
    return this.typeOrmRepository.save(user);
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.deletedAt = new Date();
    await this.typeOrmRepository.save(user);
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.typeOrmRepository.count({
      where: { email, deletedAt: IsNull() },
    });
    return count > 0;
  }

  async countActiveUsers(): Promise<number> {
    return this.typeOrmRepository.count({
      where: { deletedAt: IsNull() },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.typeOrmRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }
}
