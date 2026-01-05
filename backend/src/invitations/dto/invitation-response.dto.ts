import { UserRole } from '../../users/user.entity';

export class InvitationResponseDto {
  id: string;
  email: string;
  role: UserRole;
  teamId: string;
  invitedById: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
  // Token is intentionally excluded for security
}
