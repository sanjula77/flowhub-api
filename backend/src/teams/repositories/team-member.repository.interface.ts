import { TeamMember, TeamMemberRole } from '../team-member.entity';

/**
 * Team Member Repository Interface
 * Defines the contract for team member data access operations
 */
export interface ITeamMemberRepository {
  /**
   * Create a new team membership
   */
  create(
    memberData: {
      userId: string;
      teamId: string;
      role: TeamMemberRole;
    },
    entityManager?: any,
  ): Promise<TeamMember>;

  /**
   * Find team member by user ID and team ID
   */
  findByUserAndTeam(userId: string, teamId: string): Promise<TeamMember | null>;

  /**
   * Find all members of a team
   */
  findByTeamId(teamId: string): Promise<TeamMember[]>;

  /**
   * Find all teams a user belongs to
   */
  findByUserId(userId: string): Promise<TeamMember[]>;

  /**
   * Update team member role
   */
  updateRole(id: string, role: TeamMemberRole): Promise<TeamMember>;

  /**
   * Remove user from team
   */
  remove(userId: string, teamId: string): Promise<void>;

  /**
   * Check if user is team owner
   */
  isTeamOwner(userId: string, teamId: string): Promise<boolean>;

  /**
   * Check if user is team member (any role)
   */
  isTeamMember(userId: string, teamId: string): Promise<boolean>;
}
