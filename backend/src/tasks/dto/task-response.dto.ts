import { TaskStatus } from '../task.entity';

export class TaskResponseDto {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  projectId: string;
  teamId: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: Date;
  version: number; // Version number for optimistic locking
  createdAt: Date;
  updatedAt: Date;
  // deletedAt is intentionally excluded for active responses
}
