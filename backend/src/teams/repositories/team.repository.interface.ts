import { Team } from '../team.entity';

/**
 * Team Repository Interface
 * Defines the contract for team data access operations
 * Follows Repository Pattern and Dependency Inversion Principle
 */
export interface ITeamRepository {
  /**
   * Create a new team
   */
  create(
    teamData: {
      name: string;
      slug: string;
      description?: string;
      adminUserId?: string;
    },
    entityManager?: any,
  ): Promise<Team>;

  /**
   * Find team by ID (excludes soft-deleted)
   */
  findById(id: string): Promise<Team | null>;

  /**
   * Find team by slug (excludes soft-deleted)
   */
  findBySlug(slug: string): Promise<Team | null>;

  /**
   * Find all teams (excludes soft-deleted)
   */
  findAll(): Promise<Team[]>;

  /**
   * Find teams by admin user ID
   */
  findByAdminUserId(adminUserId: string): Promise<Team[]>;

  /**
   * Update team
   */
  update(id: string, updates: Partial<Team>): Promise<Team>;

  /**
   * Soft delete team
   */
  softDelete(id: string): Promise<void>;

  /**
   * Check if slug exists (excludes soft-deleted)
   */
  slugExists(slug: string, excludeId?: string): Promise<boolean>;

  /**
   * Count active users in team
   */
  countActiveUsers(teamId: string): Promise<number>;

  /**
   * Check if team has active users
   */
  hasActiveUsers(teamId: string): Promise<boolean>;
}
