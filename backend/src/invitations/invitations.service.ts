import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Invitation } from './invitation.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user.entity';
import type { IInvitationRepository } from './repositories/invitation.repository.interface';
import type { IUserRepository } from '../users/repositories/user.repository.interface';
import type { ITeamRepository } from '../teams/repositories/team.repository.interface';
import type { ITeamMemberRepository } from '../teams/repositories/team-member.repository.interface';
import { TeamMemberRole } from '../teams/team-member.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { AuthService } from '../auth/auth.service';

/**
 * Invitations Service
 * Handles user invitation business logic
 * Follows Clean Architecture principles
 */
@Injectable()
export class InvitationsService {
  private readonly INVITATION_EXPIRY_DAYS = 7; // Invitations expire in 7 days

  constructor(
    @Inject('IInvitationRepository')
    private readonly invitationRepository: IInvitationRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('ITeamRepository')
    private readonly teamRepository: ITeamRepository,
    @Inject('ITeamMemberRepository')
    private readonly teamMemberRepository: ITeamMemberRepository,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create invitation for a user
   * Business rules:
   * - Only ADMIN or team admin can invite users
   * - Prevent duplicate invitations (same email + team)
   * - Prevent inviting existing users
   * - Generate secure token
   */
  async inviteUser(
    inviter: User,
    createInvitationDto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    // Authorization: Only ADMIN or team admin can invite
    const isSystemAdmin = inviter.role === UserRole.ADMIN;
    const isTeamAdmin = await this.isTeamAdmin(
      inviter,
      createInvitationDto.teamId,
    );

    if (!isSystemAdmin && !isTeamAdmin) {
      throw new ForbiddenException(
        'Only team admins or system administrators can invite users',
      );
    }

    // Validate inviter is active
    if (inviter.deletedAt) {
      throw new BadRequestException('Inviter account is inactive');
    }

    // Validate team exists
    const team = await this.teamRepository.findById(createInvitationDto.teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Prevent duplicate users: Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      createInvitationDto.email,
    );
    if (existingUser) {
      throw new ConflictException(
        'User with this email already exists. Please use a different email or ask them to sign in.',
      );
    }

    // Prevent duplicate invitations: Check for active invitation
    const hasActiveInvitation =
      await this.invitationRepository.hasActiveInvitation(
        createInvitationDto.email,
        createInvitationDto.teamId,
      );
    if (hasActiveInvitation) {
      throw new ConflictException(
        'An active invitation already exists for this email and team',
      );
    }

    // Generate secure invitation token
    const token = this.generateInvitationToken();

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    // Create invitation
    const invitation = await this.invitationRepository.create({
      email: createInvitationDto.email,
      token,
      role: createInvitationDto.role || UserRole.USER,
      teamId: createInvitationDto.teamId,
      invitedById: inviter.id,
      expiresAt,
    });

    // TODO: Implement email sending service
    // await this.emailService.sendInvitationEmail(invitation, createInvitationDto.customMessage);

    return this.toResponseDto(invitation);
  }

  /**
   * Accept invitation and create user account
   * Business rules:
   * - Token must be valid and not expired
   * - Token must not be already used
   * - User must not already exist
   */
  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto): Promise<{
    message: string;
    user: any;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find invitation by token
    const invitation = await this.invitationRepository.findByToken(
      acceptInvitationDto.token,
    );
    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    // Validate token not expired
    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation token has expired');
    }

    // Validate token not already used
    if (invitation.usedAt) {
      throw new ConflictException('This invitation has already been used');
    }

    // Double-check: Prevent duplicate users (race condition protection)
    const existingUser = await this.userRepository.findByEmail(
      invitation.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(
      acceptInvitationDto.password,
    );

    // Create user account
    const user = await this.userRepository.create({
      email: invitation.email,
      password: hashedPassword,
      teamId: invitation.teamId,
      role: invitation.role,
      firstName: acceptInvitationDto.firstName,
      lastName: acceptInvitationDto.lastName,
    });

    // Mark invitation as used
    await this.invitationRepository.markAsUsed(invitation.id);

    // Generate tokens for immediate login
    const tokens = this.authService.generateTokens(user);

    return {
      message: 'Invitation accepted successfully. Account created.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Validate invitation token (for frontend pre-check)
   */
  async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    teamName?: string;
    expiresAt?: Date;
    message?: string;
  }> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      return {
        valid: false,
        message: 'Invalid invitation token',
      };
    }

    if (new Date() > invitation.expiresAt) {
      return {
        valid: false,
        message: 'Invitation token has expired',
      };
    }

    if (invitation.usedAt) {
      return {
        valid: false,
        message: 'This invitation has already been used',
      };
    }

    return {
      valid: true,
      email: invitation.email,
      teamName: invitation.team?.name,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Get all invitations for a team (team admin only)
   */
  async getTeamInvitations(
    requester: User,
    teamId: string,
  ): Promise<InvitationResponseDto[]> {
    // Authorization: Only team admin or system ADMIN
    const isSystemAdmin = requester.role === UserRole.ADMIN;
    const isTeamAdmin = await this.isTeamAdmin(requester, teamId);

    if (!isSystemAdmin && !isTeamAdmin) {
      throw new ForbiddenException(
        'Only team admins can view team invitations',
      );
    }

    const invitations = await this.invitationRepository.findByTeamId(teamId);
    return invitations.map((inv) => this.toResponseDto(inv));
  }

  /**
   * Check if user is team owner (using TeamMember)
   * @deprecated Use TeamsService.isTeamOwnerOfTeam instead
   */
  private async isTeamAdmin(user: User, teamId: string): Promise<boolean> {
    // This method is kept for backward compatibility
    // New code should use TeamsService.isTeamOwnerOfTeam
    // which checks TeamMember table
    if (!user.teamId || user.teamId !== teamId) {
      return false;
    }

    // Try TeamMember first (new way)
    const member = await this.teamMemberRepository.findByUserAndTeam(
      user.id,
      teamId,
    );
    if (member && member.role === TeamMemberRole.OWNER) {
      return true;
    }

    // Fallback to old adminUserId check (for backward compatibility)
    const team = await this.teamRepository.findById(teamId);
    if (!team || team.deletedAt) {
      return false;
    }

    return team.adminUserId === user.id;
  }

  /**
   * Generate secure invitation token
   * Uses cryptographically secure random bytes
   */
  private generateInvitationToken(): string {
    // Generate 32 random bytes (256 bits) and convert to base64url
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64url');
  }

  /**
   * Convert Invitation entity to InvitationResponseDto
   * Excludes token for security
   */
  private toResponseDto(invitation: Invitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.id = invitation.id;
    dto.email = invitation.email;
    dto.role = invitation.role;
    dto.teamId = invitation.teamId;
    dto.invitedById = invitation.invitedById;
    dto.expiresAt = invitation.expiresAt;
    dto.createdAt = invitation.createdAt;
    dto.usedAt = invitation.usedAt;
    // Token is intentionally excluded
    return dto;
  }
}
