import { Project } from '../project.entity';

/**
 * Project Repository Interface
 * Defines the contract for project data access operations
 * Follows Repository Pattern and Dependency Inversion Principle
 */
export interface IProjectRepository {
  /**
   * Create a new project
   */
  create(projectData: {
    name: string;
    description?: string;
    teamId: string;
    createdById?: string;
  }): Promise<Project>;

  /**
   * Find project by ID (excludes soft-deleted)
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Find project by ID and team ID (excludes soft-deleted)
   * Used for multi-tenant isolation
   */
  findByIdAndTeamId(id: string, teamId: string): Promise<Project | null>;

  /**
   * Find all projects in a team (excludes soft-deleted)
   */
  findByTeamId(teamId: string): Promise<Project[]>;

  /**
   * Find all projects created by a user (excludes soft-deleted)
   */
  findByCreatedById(createdById: string): Promise<Project[]>;

  /**
   * Find all projects (excludes soft-deleted)
   */
  findAll(): Promise<Project[]>;

  /**
   * Update project
   */
  update(id: string, updates: Partial<Project>): Promise<Project>;

  /**
   * Soft delete project
   */
  softDelete(id: string): Promise<void>;

  /**
   * Check if project has active tasks
   * TODO: Implement this when Task entity is created
   * For now returns false (no tasks exist yet)
   */
  hasActiveTasks(projectId: string): Promise<boolean>;
}
