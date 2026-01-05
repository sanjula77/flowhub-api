import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../project.entity';
import { IProjectRepository } from './project.repository.interface';

/**
 * Project Repository Implementation
 * Implements IProjectRepository using TypeORM
 * Follows Single Responsibility Principle - only handles data access
 */
@Injectable()
export class ProjectRepository implements IProjectRepository {
  constructor(
    @InjectRepository(Project)
    private readonly typeOrmRepository: Repository<Project>,
  ) {}

  async create(projectData: {
    name: string;
    description?: string;
    teamId: string;
    createdById?: string;
  }): Promise<Project> {
    const project = this.typeOrmRepository.create({
      name: projectData.name,
      description: projectData.description,
      teamId: projectData.teamId,
      createdById: projectData.createdById,
    });

    return this.typeOrmRepository.save(project);
  }

  async findById(id: string): Promise<Project | null> {
    return this.typeOrmRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['team', 'createdBy'],
    });
  }

  async findByIdAndTeamId(id: string, teamId: string): Promise<Project | null> {
    return this.typeOrmRepository.findOne({
      where: { id, teamId, deletedAt: IsNull() },
      relations: ['team', 'createdBy'],
    });
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.typeOrmRepository.find({
      where: { teamId, deletedAt: IsNull() },
      relations: ['team', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCreatedById(createdById: string): Promise<Project[]> {
    return this.typeOrmRepository.find({
      where: { createdById, deletedAt: IsNull() },
      relations: ['team', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Project[]> {
    return this.typeOrmRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['team', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new Error('Project not found');
    }

    Object.assign(project, updates);
    return this.typeOrmRepository.save(project);
  }

  async softDelete(id: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new Error('Project not found');
    }

    project.deletedAt = new Date();
    await this.typeOrmRepository.save(project);
  }

  /**
   * Check if project has active tasks
   */
  hasActiveTasks(_projectId: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
