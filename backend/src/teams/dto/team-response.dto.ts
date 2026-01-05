export class TeamResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  adminUserId?: string; // ID of the team admin/owner
  userCount?: number; // Number of users in team (optional, for convenience)
  createdAt: Date;
  updatedAt: Date;
  // deletedAt is intentionally excluded from responses
}
