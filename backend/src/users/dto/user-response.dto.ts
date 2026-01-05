import { UserRole } from '../user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  teamId: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // Password is intentionally excluded for security
}
