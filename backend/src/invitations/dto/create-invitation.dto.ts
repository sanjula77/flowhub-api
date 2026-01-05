import {
  IsEmail,
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsUUID('4', { message: 'Team ID must be a valid UUID' })
  teamId: string;

  @IsEnum(UserRole, { message: 'Role must be either USER or ADMIN' })
  @IsOptional()
  role?: UserRole; // Defaults to USER if not provided

  @IsString()
  @IsOptional()
  @MinLength(8, {
    message: 'Custom message must be at least 8 characters if provided',
  })
  customMessage?: string; // Optional message to include in invitation email
}
