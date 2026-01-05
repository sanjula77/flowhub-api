import { User, UserRole } from '../user.entity';

/**
 * User Repository Interface
 * Defines the contract for user data access operations
 * Follows Repository Pattern and Dependency Inversion Principle
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(
    userData: {
      email: string;
      password: string;
      teamId: string;
      role?: UserRole;
      firstName?: string;
      lastName?: string;
    },
    entityManager?: any, // Using any to avoid circular dependency with typeorm in interface
  ): Promise<User>;

  /**
   * Find user by ID (excludes soft-deleted)
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email (excludes soft-deleted)
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users in a team (excludes soft-deleted)
   */
  findByTeamId(teamId: string): Promise<User[]>;

  /**
   * Find all users (excludes soft-deleted)
   */
  findAll(): Promise<User[]>;

  /**
   * Update user
   */
  update(id: string, updates: Partial<User>): Promise<User>;

  /**
   * Soft delete user
   */
  softDelete(id: string): Promise<void>;

  /**
   * Check if email exists (excludes soft-deleted)
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Count active users (excludes soft-deleted)
   * Used for first user detection
   */
  countActiveUsers(): Promise<number>;

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: string): Promise<void>;
}
