import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Task, TaskStatus } from './task.entity';
import { User, UserRole } from '../users/user.entity';
import type { ITaskRepository } from './repositories/task.repository.interface';
import type { IProjectRepository } from '../projects/repositories/project.repository.interface';
import type { ITeamRepository } from '../teams/repositories/team.repository.interface';
import type { IUserRepository } from '../users/repositories/user.repository.interface';
import type { ITeamMemberRepository } from '../teams/repositories/team-member.repository.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';

/**
 * Tasks Service
 * Contains business logic for task operations
 * Follows Single Responsibility Principle - only business logic
 * Depends on repository interfaces (Dependency Inversion Principle)
 */
@Injectable()
export class TasksService {
  constructor(
    @Inject('ITaskRepository') private readonly taskRepository: ITaskRepository,
    @Inject('IProjectRepository')
    private readonly projectRepository: IProjectRepository,
    @Inject('ITeamRepository') private readonly teamRepository: ITeamRepository,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('ITeamMemberRepository')
    private readonly teamMemberRepository: ITeamMemberRepository,
  ) {}

  /**
   * Helper method to check team ownership
   */
  private async checkTeamOwnership(
    userId: string,
    teamId: string,
  ): Promise<boolean> {
    return this.teamMemberRepository.isTeamOwner(userId, teamId);
  }

  /**
   * Create a new task
   * Business rules:
   * - User must belong to the project's team
   * - ADMIN can create tasks for any team project
   * - USER can create tasks only inside their team
   */
  async create(
    user: User,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Validate project exists
    const project = await this.projectRepository.findById(
      createTaskDto.projectId,
    );
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: Enterprise-grade permissions
    const isSystemAdmin = user.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === user.id;
    const isTeamMember = project.teamId === user.teamId;

    // Check if user is team owner
    let isTeamOwner = false;
    if (isTeamMember) {
      isTeamOwner = await this.checkTeamOwnership(user.id, project.teamId);
    }

    if (!isSystemAdmin && !isProjectCreator && !isTeamMember) {
      throw new ForbiddenException(
        'You can only create tasks in projects from your team',
      );
    }

    // Additional validation: Regular users need explicit team membership
    if (!isSystemAdmin && !isProjectCreator && !isTeamOwner && !isTeamMember) {
      throw new ForbiddenException(
        'You must be a member of the team to create tasks',
      );
    }

    // Get team from project (ensures consistency)
    const teamId = project.teamId;

    // Validate team exists
    const team = await this.teamRepository.findById(teamId);
    if (!team || team.deletedAt) {
      throw new NotFoundException('Team not found');
    }

    // Validate assigned user belongs to the same team (if provided)
    if (createTaskDto.assignedToId) {
      const assignedUser = await this.userRepository.findById(
        createTaskDto.assignedToId,
      );
      if (!assignedUser || assignedUser.deletedAt) {
        throw new NotFoundException('Assigned user not found');
      }
      if (assignedUser.teamId !== teamId) {
        throw new BadRequestException(
          'Assigned user must belong to the same team as the project',
        );
      }
    }

    // Validate priority (1-5 scale, where 1 is highest priority)
    if (createTaskDto.priority !== undefined) {
      if (createTaskDto.priority < 1 || createTaskDto.priority > 5) {
        throw new BadRequestException(
          'Priority must be between 1 (highest) and 5 (lowest)',
        );
      }
    }

    // Convert dueDate string to Date if provided
    const dueDate = createTaskDto.dueDate
      ? new Date(createTaskDto.dueDate)
      : undefined;

    // Validate due date is in the future (or allow past dates for flexibility)
    if (dueDate && dueDate < new Date()) {
      // Allow past due dates (for historical tasks or rescheduling)
      // Just log a warning in production
    }

    // Create task via repository (teamId derived from project)
    const task = await this.taskRepository.create({
      title: createTaskDto.title.trim(),
      description: createTaskDto.description?.trim(),
      status: createTaskDto.status || TaskStatus.TODO,
      projectId: createTaskDto.projectId,
      teamId: teamId,
      assignedToId: createTaskDto.assignedToId,
      priority: createTaskDto.priority,
      dueDate: dueDate,
    });

    return this.toResponseDto(task);
  }

  /**
   * Assign task to user
   * Business rules:
   * - Only ADMIN or project creator can assign tasks
   * - Assignee must belong to the same team
   * - Prevent assigning completed tasks
   */
  async assignTask(
    user: User,
    taskId: string,
    assignTaskDto: AssignTaskDto,
  ): Promise<TaskResponseDto> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Find task
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Find project to check creator
    const project = await this.projectRepository.findById(task.projectId);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: Enterprise-grade permissions (ADMIN, project creator, or team owner)
    const isSystemAdmin = user.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === user.id;

    // Check if user is team owner
    let isTeamOwner = false;
    if (user.teamId === task.teamId) {
      isTeamOwner = await this.checkTeamOwnership(user.id, task.teamId);
    }

    if (!isSystemAdmin && !isProjectCreator && !isTeamOwner) {
      throw new ForbiddenException(
        'Only project creators, team owners, or system administrators can assign tasks',
      );
    }

    // Allow assigning completed tasks (enterprise feature - can reassign for review/rework)
    // Allow unassigning tasks (assignedToId can be null)
    if (
      assignTaskDto.assignedToId !== null &&
      assignTaskDto.assignedToId !== undefined
    ) {
      // Validate assigned user exists
      const assignedUser = await this.userRepository.findById(
        assignTaskDto.assignedToId,
      );
      if (!assignedUser || assignedUser.deletedAt) {
        throw new NotFoundException('Assigned user not found');
      }

      // Validate assigned user belongs to the same team
      if (assignedUser.teamId !== task.teamId) {
        throw new BadRequestException(
          'Assigned user must belong to the same team as the task',
        );
      }
    }

    // Update task
    try {
      const updateData: any = {};
      if (
        assignTaskDto.assignedToId !== null &&
        assignTaskDto.assignedToId !== undefined
      ) {
        updateData.assignedToId = assignTaskDto.assignedToId;
      } else {
        updateData.assignedToId = null; // Explicitly set to null to unassign
      }
      await this.taskRepository.update(taskId, updateData);
      // Reload task to ensure all fields are populated
      const reloadedTask = await this.taskRepository.findById(taskId);
      if (!reloadedTask) {
        throw new NotFoundException('Task not found after update');
      }
      return this.toResponseDto(reloadedTask);
    } catch (error: any) {
      // Handle optimistic locking conflicts
      // TypeORM throws OptimisticLockVersionMismatchError when version mismatch occurs
      if (
        error?.name === 'OptimisticLockVersionMismatchError' ||
        error?.code === 'OPTIMISTIC_LOCK_VERSION_MISMATCH'
      ) {
        throw new ConflictException(
          'Task has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Update task status
   * Enterprise-grade business rules (Jira/Asana style):
   * - Flexible transitions: TODO ↔ IN_PROGRESS, IN_PROGRESS ↔ DONE (allows rework)
   * - Authorization: assignee, ADMIN, project creator, or team owner
   * - Prevents invalid transitions with clear error messages
   */
  async updateStatus(
    user: User,
    taskId: string,
    status: TaskStatus,
  ): Promise<TaskResponseDto> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Find task with project relationship
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get project to check creator and team
    const project = await this.projectRepository.findById(task.projectId);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: Multiple roles can update status (enterprise-grade)
    const isSystemAdmin = user.role === UserRole.ADMIN;
    const isAssignee = task.assignedToId === user.id;
    const isProjectCreator = project.createdById === user.id;

    // Check if user is team owner (using TeamMember)
    let isTeamOwner = false;
    if (user.teamId === task.teamId) {
      // Inject TeamsService or use repository directly
      // For now, we'll check via team membership
      isTeamOwner = await this.checkTeamOwnership(user.id, task.teamId);
    }

    if (!isSystemAdmin && !isAssignee && !isProjectCreator && !isTeamOwner) {
      throw new ForbiddenException(
        'Only the assigned user, project creator, team owner, or system administrator can update task status',
      );
    }

    // Enterprise-grade status transitions (allows rework like Jira/Asana)
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE], // Can skip to DONE
      [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.DONE], // Can revert or complete
      [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS, TaskStatus.TODO], // Can reopen (enterprise feature)
    };

    const currentStatus = task.status;
    const allowedNextStatuses = allowedTransitions[currentStatus];

    if (!allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: Cannot change status from ${currentStatus} to ${status}. Allowed transitions: ${allowedNextStatuses.join(', ')}`,
      );
    }

    // Update task status
    try {
      const updatedTask = await this.taskRepository.update(taskId, { status });
      return this.toResponseDto(updatedTask);
    } catch (error: any) {
      // Handle optimistic locking conflicts
      // TypeORM throws OptimisticLockVersionMismatchError when version mismatch occurs
      if (
        error?.name === 'OptimisticLockVersionMismatchError' ||
        error?.code === 'OPTIMISTIC_LOCK_VERSION_MISMATCH'
      ) {
        throw new ConflictException(
          'Task has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Find task by ID with role-based access
   * ADMIN: Can access any task
   * USER: Can only access tasks from their team
   */
  async findById(id: string, user: User): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Authorization: USER can only see tasks from their team
    if (user.role !== UserRole.ADMIN && task.teamId !== user.teamId) {
      throw new NotFoundException('Task not found'); // Return 404 to prevent data leakage
    }

    return this.toResponseDto(task);
  }

  /**
   * Find all tasks with role-based access
   * ADMIN: Returns all tasks
   * USER: Returns only tasks from their team
   */
  async findAll(
    user: User,
    projectId?: string,
    status?: TaskStatus,
  ): Promise<TaskResponseDto[]> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    let tasks: Task[];

    if (projectId) {
      // Filter by project
      const project = await this.projectRepository.findById(projectId);
      if (!project || project.deletedAt) {
        throw new NotFoundException('Project not found');
      }

      // Authorization: USER can only see projects from their team
      if (user.role !== UserRole.ADMIN && project.teamId !== user.teamId) {
        throw new ForbiddenException(
          'You can only view tasks from projects in your team',
        );
      }

      if (status) {
        tasks = await this.taskRepository.findByProjectIdAndStatus(
          projectId,
          status,
        );
      } else {
        tasks = await this.taskRepository.findByProjectId(projectId);
      }
    } else {
      // Get all tasks (role-based)
      if (user.role === UserRole.ADMIN) {
        // ADMIN sees all tasks
        tasks = status
          ? await this.taskRepository.findByStatus(status)
          : await this.taskRepository.findAll();
      } else {
        // USER sees only tasks from their team
        if (!user.teamId) {
          throw new NotFoundException('User does not belong to any team');
        }

        tasks = status
          ? await this.taskRepository.findByTeamIdAndStatus(user.teamId, status)
          : await this.taskRepository.findByTeamId(user.teamId);
      }
    }

    return tasks.map((task) => this.toResponseDto(task));
  }

  /**
   * Find all tasks in a project
   */
  async findByProjectId(
    projectId: string,
    user: User,
  ): Promise<TaskResponseDto[]> {
    // Validate project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: USER can only see projects from their team
    if (user.role !== UserRole.ADMIN && project.teamId !== user.teamId) {
      throw new ForbiddenException(
        'You can only view tasks from projects in your team',
      );
    }

    const tasks = await this.taskRepository.findByProjectId(projectId);
    return tasks.map((task) => this.toResponseDto(task));
  }

  /**
   * Find all tasks assigned to a user
   */
  async findByAssignedToId(
    assignedToId: string,
    user: User,
  ): Promise<TaskResponseDto[]> {
    // ADMIN can see any user's tasks
    if (user.role === UserRole.ADMIN) {
      const tasks = await this.taskRepository.findByAssignedToId(assignedToId);
      return tasks.map((task) => this.toResponseDto(task));
    }

    // USER can only see their own tasks
    if (assignedToId !== user.id) {
      throw new ForbiddenException('You can only view your own assigned tasks');
    }

    const tasks = await this.taskRepository.findByAssignedToId(assignedToId);
    return tasks.map((task) => this.toResponseDto(task));
  }

  /**
   * Update task
   */
  async update(
    user: User,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Authorization: Enterprise-grade permissions
    const project = await this.projectRepository.findById(task.projectId);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isSystemAdmin = user.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === user.id;
    const isAssignee = task.assignedToId === user.id;

    // Check if user is team owner
    let isTeamOwner = false;
    if (user.teamId === task.teamId) {
      isTeamOwner = await this.checkTeamOwnership(user.id, task.teamId);
    }

    // Multiple roles can update tasks (enterprise-grade)
    if (!isSystemAdmin && !isProjectCreator && !isAssignee && !isTeamOwner) {
      throw new ForbiddenException(
        'Only assigned user, project creator, team owner, or system administrator can update tasks',
      );
    }

    // Validate status if provided (use flexible transitions like updateStatus)
    if (updateTaskDto.status !== undefined) {
      const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.DONE],
        [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS, TaskStatus.TODO],
      };

      const allowedNextStatuses = allowedTransitions[task.status];
      if (!allowedNextStatuses.includes(updateTaskDto.status)) {
        throw new BadRequestException(
          `Invalid status transition: Cannot change status from ${task.status} to ${updateTaskDto.status}. Allowed: ${allowedNextStatuses.join(', ')}`,
        );
      }
    }

    // Validate priority if provided
    if (updateTaskDto.priority !== undefined) {
      if (updateTaskDto.priority < 1 || updateTaskDto.priority > 5) {
        throw new BadRequestException(
          'Priority must be between 1 (highest) and 5 (lowest)',
        );
      }
    }

    // Validate assigned user if provided (allow null to unassign)
    if (
      updateTaskDto.assignedToId !== undefined &&
      updateTaskDto.assignedToId !== null
    ) {
      const assignedUser = await this.userRepository.findById(
        updateTaskDto.assignedToId,
      );
      if (!assignedUser || assignedUser.deletedAt) {
        throw new NotFoundException('Assigned user not found');
      }
      if (assignedUser.teamId !== task.teamId) {
        throw new BadRequestException(
          'Assigned user must belong to the same team as the task',
        );
      }
    }

    // Convert dueDate string to Date if provided
    const updates: Partial<Task> = {};
    if (updateTaskDto.title !== undefined) updates.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined)
      updates.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined)
      updates.status = updateTaskDto.status;
    if (updateTaskDto.assignedToId !== undefined) {
      updates.assignedToId = updateTaskDto.assignedToId || undefined; // Convert null to undefined
    }
    if (updateTaskDto.priority !== undefined)
      updates.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate !== undefined) {
      updates.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : undefined;
    }

    try {
      const updatedTask = await this.taskRepository.update(id, updates);
      return this.toResponseDto(updatedTask);
    } catch (error: any) {
      // Handle optimistic locking conflicts
      // TypeORM throws OptimisticLockVersionMismatchError when version mismatch occurs
      if (
        error?.name === 'OptimisticLockVersionMismatchError' ||
        error?.code === 'OPTIMISTIC_LOCK_VERSION_MISMATCH'
      ) {
        throw new ConflictException(
          'Task has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete task
   * Enterprise-grade business rules:
   * - ADMIN, project creator, team owner, or assignee can delete tasks
   * - Allow deleting completed tasks (enterprise feature - for cleanup/rework)
   */
  async softDelete(user: User, id: string): Promise<void> {
    // Validate user is not soft-deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Authorization: Multiple roles can delete tasks
    const project = await this.projectRepository.findById(task.projectId);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isSystemAdmin = user.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === user.id;
    const isAssignee = task.assignedToId === user.id;

    // Check if user is team owner
    let isTeamOwner = false;
    if (user.teamId === task.teamId) {
      isTeamOwner = await this.checkTeamOwnership(user.id, task.teamId);
    }

    if (!isSystemAdmin && !isProjectCreator && !isAssignee && !isTeamOwner) {
      throw new ForbiddenException(
        'Only assigned user, project creator, team owner, or system administrator can delete tasks',
      );
    }

    // Allow deleting completed tasks (enterprise feature - for cleanup/rework)

    await this.taskRepository.softDelete(id);
  }

  /**
   * Convert Task entity to TaskResponseDto
   */
  private toResponseDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      projectId: task.projectId,
      teamId: task.teamId,
      assignedToId: task.assignedToId,
      priority: task.priority,
      dueDate: task.dueDate,
      version: task.version,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
