import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { Team } from '../team.entity';
import { ITeamRepository } from './team.repository.interface';

/**
 * Team Repository Implementation
 * Implements ITeamRepository using TypeORM
 * Follows Single Responsibility Principle - only handles data access
 */
@Injectable()
export class TeamRepository implements ITeamRepository {
  constructor(
    @InjectRepository(Team)
    private readonly typeOrmRepository: Repository<Team>,
  ) {}

  async create(
    teamData: {
      name: string;
      slug: string;
      description?: string;
      adminUserId?: string;
    },
    entityManager?: EntityManager,
  ): Promise<Team> {
    const repository = entityManager
      ? entityManager.getRepository(Team)
      : this.typeOrmRepository;

    const team = repository.create({
      name: teamData.name,
      slug: teamData.slug,
      description: teamData.description,
      adminUserId: teamData.adminUserId,
    });

    return repository.save(team);
  }

  async findById(id: string): Promise<Team | null> {
    return this.typeOrmRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['adminUser', 'users'],
    });
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.typeOrmRepository.findOne({
      where: { slug, deletedAt: IsNull() },
      relations: ['adminUser', 'users'],
    });
  }

  async findAll(): Promise<Team[]> {
    return this.typeOrmRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['adminUser', 'users'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAdminUserId(adminUserId: string): Promise<Team[]> {
    return this.typeOrmRepository.find({
      where: { adminUserId, deletedAt: IsNull() },
      relations: ['adminUser', 'users'],
    });
  }

  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const team = await this.findById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    Object.assign(team, updates);
    return this.typeOrmRepository.save(team);
  }

  async softDelete(id: string): Promise<void> {
    const team = await this.findById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    team.deletedAt = new Date();
    await this.typeOrmRepository.save(team);
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query = this.typeOrmRepository
      .createQueryBuilder('team')
      .where('team.slug = :slug', { slug })
      .andWhere('team.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('team.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async countActiveUsers(teamId: string): Promise<number> {
    return this.typeOrmRepository
      .createQueryBuilder('team')
      .innerJoin('team.users', 'user')
      .where('team.id = :teamId', { teamId })
      .andWhere('user.deletedAt IS NULL')
      .getCount();
  }

  async hasActiveUsers(teamId: string): Promise<boolean> {
    const count = await this.countActiveUsers(teamId);
    return count > 0;
  }
}
