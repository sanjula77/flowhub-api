import { IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
