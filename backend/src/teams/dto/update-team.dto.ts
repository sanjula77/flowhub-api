import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @MinLength(2, { message: 'Team name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Team name must not exceed 255 characters' })
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  @MaxLength(255, { message: 'Slug must not exceed 255 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  adminUserId?: string; // Change team admin
}
