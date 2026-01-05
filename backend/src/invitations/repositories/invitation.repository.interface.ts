import { Invitation } from '../invitation.entity';
import { UserRole } from '../../users/user.entity';

/**
 * Invitation Repository Interface
 * Defines the contract for invitation data access operations
 */
export interface IInvitationRepository {
  /**
   * Create a new invitation
   */
  create(invitationData: {
    email: string;
    token: string;
    role: UserRole;
    teamId: string;
    invitedById: string;
    expiresAt: Date;
  }): Promise<Invitation>;

  /**
   * Find invitation by token (excludes used invitations)
   */
  findByToken(token: string): Promise<Invitation | null>;

  /**
   * Find invitation by email and team (active invitations only)
   */
  findActiveByEmailAndTeam(
    email: string,
    teamId: string,
  ): Promise<Invitation | null>;

  /**
   * Find all invitations for a team
   */
  findByTeamId(teamId: string): Promise<Invitation[]>;

  /**
   * Find all invitations sent by a user
   */
  findByInviterId(inviterId: string): Promise<Invitation[]>;

  /**
   * Mark invitation as used
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Check if email already has active invitation for team
   */
  hasActiveInvitation(email: string, teamId: string): Promise<boolean>;

  /**
   * Delete expired invitations (cleanup)
   */
  deleteExpired(): Promise<number>;
}
