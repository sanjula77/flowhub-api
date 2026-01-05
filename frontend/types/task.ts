export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  projectId: string;
  teamId: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  projectId: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
}

export interface AssignTaskDto {
  assignedToId: string;
}

