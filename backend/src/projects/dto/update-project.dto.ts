import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @MinLength(1, { message: 'Project name cannot be empty' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @IsOptional()
  description?: string;

  // Note: teamId is intentionally not included in update DTO
  // Projects should not be moved between teams via update
  // If needed, create a separate endpoint with proper authorization
}
