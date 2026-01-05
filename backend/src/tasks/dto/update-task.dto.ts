import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { TaskStatus } from '../task.entity';

export class UpdateTaskDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus, {
    message: 'Status must be one of: TODO, IN_PROGRESS, DONE',
  })
  @IsOptional()
  status?: TaskStatus;

  @ValidateIf((o) => o.assignedToId !== null && o.assignedToId !== undefined)
  @IsUUID('4', { message: 'Assigned user ID must be a valid UUID' })
  @IsOptional()
  assignedToId?: string | null; // Allow null to unassign tasks

  @IsInt({ message: 'Priority must be an integer' })
  @Min(1, { message: 'Priority must be at least 1' })
  @Max(5, { message: 'Priority must be at most 5' })
  @IsOptional()
  priority?: number;

  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  @IsOptional()
  dueDate?: string;
}
