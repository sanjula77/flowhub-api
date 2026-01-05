import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Task, TaskStatus } from '../task.entity';
import { ITaskRepository } from './task.repository.interface';

/**
 * Task Repository Implementation
 * Implements ITaskRepository using TypeORM
 * Follows Single Responsibility Principle - only handles data access
 */
@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly typeOrmRepository: Repository<Task>,
  ) {}

  async create(taskData: {
    title: string;
    description?: string;
    status?: TaskStatus;
    projectId: string;
    teamId: string;
    assignedToId?: string;
    priority?: number;
    dueDate?: Date;
  }): Promise<Task> {
    const task = this.typeOrmRepository.create({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status || TaskStatus.TODO,
      projectId: taskData.projectId,
      teamId: taskData.teamId,
      assignedToId: taskData.assignedToId,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
    });

    return this.typeOrmRepository.save(task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.typeOrmRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
    });
  }

  async findByIdAndProjectId(
    id: string,
    projectId: string,
  ): Promise<Task | null> {
    return this.typeOrmRepository.findOne({
      where: { id, projectId, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
    });
  }

  async findByIdAndTeamId(id: string, teamId: string): Promise<Task | null> {
    return this.typeOrmRepository.findOne({
      where: { id, teamId, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
    });
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTeamId(teamId: string): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { teamId, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAssignedToId(assignedToId: string): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { assignedToId, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProjectIdAndStatus(
    projectId: string,
    status: TaskStatus,
  ): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { projectId, status, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTeamIdAndStatus(
    teamId: string,
    status: TaskStatus,
  ): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { teamId, status, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAssignedToIdAndStatus(
    assignedToId: string,
    status: TaskStatus,
  ): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { assignedToId, status, deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Task[]> {
    return this.typeOrmRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['project', 'team', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new Error('Task not found'); // Should be caught by service layer
    }
    Object.assign(task, updates);
    return this.typeOrmRepository.save(task);
  }

  async softDelete(id: string): Promise<void> {
    const task = await this.findById(id);
    if (!task) {
      throw new Error('Task not found'); // Should be caught by service layer
    }
    task.deletedAt = new Date();
    await this.typeOrmRepository.save(task);
  }
}
