export interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  teamId: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

