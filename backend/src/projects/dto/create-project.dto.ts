import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(1, { message: 'Project name cannot be empty' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string;

  @IsUUID('4', { message: 'Team ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Team ID is required' })
  teamId: string;
}
