import { Task } from '../task.entity';
import { TaskStatus } from '../task.entity';

/**
 * Task Repository Interface
 * Defines the contract for task data access operations
 * Follows Repository Pattern and Dependency Inversion Principle
 */
export interface ITaskRepository {
  /**
   * Create a new task
   */
  create(taskData: {
    title: string;
    description?: string;
    status?: TaskStatus;
    projectId: string;
    teamId: string;
    assignedToId?: string;
    priority?: number;
    dueDate?: Date;
  }): Promise<Task>;

  /**
   * Find task by ID (excludes soft-deleted)
   */
  findById(id: string): Promise<Task | null>;

  /**
   * Find task by ID and project ID (excludes soft-deleted)
   * Used for multi-tenant isolation
   */
  findByIdAndProjectId(id: string, projectId: string): Promise<Task | null>;

  /**
   * Find task by ID and team ID (excludes soft-deleted)
   * Used for multi-tenant isolation
   */
  findByIdAndTeamId(id: string, teamId: string): Promise<Task | null>;

  /**
   * Find all tasks in a project (excludes soft-deleted)
   */
  findByProjectId(projectId: string): Promise<Task[]>;

  /**
   * Find all tasks in a team (excludes soft-deleted)
   */
  findByTeamId(teamId: string): Promise<Task[]>;

  /**
   * Find all tasks assigned to a user (excludes soft-deleted)
   */
  findByAssignedToId(assignedToId: string): Promise<Task[]>;

  /**
   * Find all tasks by status (excludes soft-deleted)
   */
  findByStatus(status: TaskStatus): Promise<Task[]>;

  /**
   * Find all tasks in a project by status (excludes soft-deleted)
   */
  findByProjectIdAndStatus(
    projectId: string,
    status: TaskStatus,
  ): Promise<Task[]>;

  /**
   * Find all tasks in a team by status (excludes soft-deleted)
   */
  findByTeamIdAndStatus(teamId: string, status: TaskStatus): Promise<Task[]>;

  /**
   * Find all tasks assigned to a user by status (excludes soft-deleted)
   */
  findByAssignedToIdAndStatus(
    assignedToId: string,
    status: TaskStatus,
  ): Promise<Task[]>;

  /**
   * Find all tasks (excludes soft-deleted)
   */
  findAll(): Promise<Task[]>;

  /**
   * Update task
   */
  update(id: string, updates: Partial<Task>): Promise<Task>;

  /**
   * Soft delete task
   */
  softDelete(id: string): Promise<void>;
}
