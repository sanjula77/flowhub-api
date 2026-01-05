import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { TaskStatus } from '../task.entity';

export class CreateTaskDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string;

  @IsEnum(TaskStatus, {
    message: 'Status must be one of: TODO, IN_PROGRESS, DONE',
  })
  @IsOptional()
  status?: TaskStatus;

  @IsUUID('4', { message: 'Project ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Project ID is required' })
  projectId: string;

  @IsUUID('4', { message: 'Assigned user ID must be a valid UUID' })
  @IsOptional()
  assignedToId?: string;

  @IsInt({ message: 'Priority must be an integer' })
  @Min(1, { message: 'Priority must be at least 1' })
  @Max(5, { message: 'Priority must be at most 5' })
  @IsOptional()
  priority?: number;

  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  @IsOptional()
  dueDate?: string; // ISO 8601 date string (e.g., "2024-01-15T10:30:00Z")
}
