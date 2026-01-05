import { IsEnum, IsNotEmpty } from 'class-validator';
import { TeamMemberRole } from '../team-member.entity';

export class UpdateTeamMemberRoleDto {
  @IsEnum(TeamMemberRole, { message: 'Role must be either OWNER or MEMBER' })
  @IsNotEmpty({ message: 'Role is required' })
  role: TeamMemberRole;
}
