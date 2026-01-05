import { IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class AssignTaskDto {
  @ValidateIf((o) => o.assignedToId !== null && o.assignedToId !== undefined)
  @IsUUID('4', { message: 'Assigned user ID must be a valid UUID' })
  @IsOptional()
  assignedToId: string | null; // Allow null to unassign tasks
}
