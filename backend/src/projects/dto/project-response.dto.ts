export class ProjectResponseDto {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}
