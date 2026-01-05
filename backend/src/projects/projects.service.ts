import {
  Injectable,
  NotFoundException,
  Inject,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Project } from './project.entity';
import { User, UserRole } from '../users/user.entity';
import type { IProjectRepository } from './repositories/project.repository.interface';
import type { ITeamRepository } from '../teams/repositories/team.repository.interface';
import type { ITeamMemberRepository } from '../teams/repositories/team-member.repository.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

/**
 * Projects Service
 * Contains business logic for project operations
 * Follows Single Responsibility Principle - only business logic
 * Depends on repository interface (Dependency Inversion Principle)
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject('IProjectRepository')
    private readonly projectRepository: IProjectRepository,
    @Inject('ITeamRepository') private readonly teamRepository: ITeamRepository,
    @Inject('ITeamMemberRepository')
    private readonly teamMemberRepository: ITeamMemberRepository,
  ) {}

  /**
   * Create a new project
   * Business rules (Enterprise-grade):
   * - ADMIN can create projects in any team
   * - TEAM_OWNER can create projects in their own team
   * - Regular USER cannot create projects
   * - Project must belong to an existing team
   * - User must be a member of the team (for TEAM_OWNER)
   */
  async create(
    creator: User,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    // Validate creator is not soft-deleted
    if (creator.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Validate team exists
    const team = await this.teamRepository.findById(createProjectDto.teamId);
    if (!team || team.deletedAt) {
      throw new NotFoundException('Team not found');
    }

    // Authorization: ADMIN or TEAM_OWNER can create projects
    const isSystemAdmin = creator.role === UserRole.ADMIN;
    const isTeamOwner = await this.teamMemberRepository.isTeamOwner(
      creator.id,
      createProjectDto.teamId,
    );

    if (!isSystemAdmin && !isTeamOwner) {
      // Check if user is at least a team member (for better error message)
      const isTeamMember = await this.teamMemberRepository.isTeamMember(
        creator.id,
        createProjectDto.teamId,
      );
      if (!isTeamMember || creator.teamId !== createProjectDto.teamId) {
        throw new ForbiddenException(
          'You can only create projects in teams you own or belong to',
        );
      }
      throw new ForbiddenException(
        'Only team owners or system administrators can create projects',
      );
    }

    // Validate user belongs to the team (for TEAM_OWNER)
    if (!isSystemAdmin && creator.teamId !== createProjectDto.teamId) {
      throw new ForbiddenException(
        'You can only create projects in your own team',
      );
    }

    // Create project via repository
    const project = await this.projectRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description,
      teamId: createProjectDto.teamId,
      createdById: creator.id,
    });

    return this.toResponseDto(project);
  }

  /**
   * Find project by ID
   * ADMIN: Can access any project
   * USER: Can only access projects from their team
   */
  async findById(id: string, user: User): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // If user is ADMIN, allow access to any project
    if (user.role === UserRole.ADMIN) {
      return this.toResponseDto(project);
    }

    // If user is not ADMIN, verify project belongs to user's team
    if (project.teamId !== user.teamId) {
      throw new NotFoundException('Project not found');
    }

    return this.toResponseDto(project);
  }

  /**
   * Find project by ID and team ID (multi-tenant isolation)
   * Used for USER role validation
   */
  async findByIdAndTeamId(
    id: string,
    teamId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findByIdAndTeamId(id, teamId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return this.toResponseDto(project);
  }

  /**
   * Find all projects with role-based access control
   * ADMIN: Returns all projects
   * USER: Returns only projects from their team
   */
  async findAll(user: User): Promise<ProjectResponseDto[]> {
    // ADMIN can see all projects
    if (user.role === UserRole.ADMIN) {
      const projects = await this.projectRepository.findAll();
      return projects.map((project) => this.toResponseDto(project));
    }

    // USER can only see projects from their team
    if (!user.teamId) {
      throw new NotFoundException('User does not belong to any team');
    }

    const projects = await this.projectRepository.findByTeamId(user.teamId);
    return projects.map((project) => this.toResponseDto(project));
  }

  /**
   * Find all projects in a team
   */
  async findByTeamId(teamId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findByTeamId(teamId);
    return projects.map((project) => this.toResponseDto(project));
  }

  /**
   * Find all projects created by a user
   */
  async findByCreatedById(createdById: string): Promise<ProjectResponseDto[]> {
    const projects =
      await this.projectRepository.findByCreatedById(createdById);
    return projects.map((project) => this.toResponseDto(project));
  }

  /**
   * Update project
   * Enterprise-grade business rules:
   * - ADMIN can update any project
   * - TEAM_OWNER can update projects in their team
   * - Project creator can update their own projects
   * - Cannot move project to another team (teamId not in DTO)
   */
  async update(
    updater: User,
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    // Validate updater is not soft-deleted
    if (updater.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Validate project exists
    const project = await this.projectRepository.findById(id);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: Multiple roles can update projects
    const isSystemAdmin = updater.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === updater.id;

    // Check if user is team owner
    let isTeamOwner = false;
    if (updater.teamId === project.teamId) {
      isTeamOwner = await this.teamMemberRepository.isTeamOwner(
        updater.id,
        project.teamId,
      );
    }

    if (!isSystemAdmin && !isProjectCreator && !isTeamOwner) {
      throw new ForbiddenException(
        'Only project creators, team owners, or system administrators can update projects',
      );
    }

    // Validate that DTO doesn't contain teamId (prevent team changes via update)
    // This is already handled by DTO (teamId is not in UpdateProjectDto),
    // but we add an explicit check for security
    if ((updateProjectDto as any).teamId) {
      throw new BadRequestException(
        'Cannot change project team via update endpoint',
      );
    }

    // Validate that update DTO has at least one field to update
    if (!updateProjectDto.name && updateProjectDto.description === undefined) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // Update via repository
    const updatedProject = await this.projectRepository.update(
      id,
      updateProjectDto,
    );
    return this.toResponseDto(updatedProject);
  }

  /**
   * Soft delete project
   * Business rules:
   * - Only ADMIN users can delete projects
   * - Cannot delete if project has active tasks
   * - Project must exist
   * - User account must be active
   */
  async softDelete(deleter: User, id: string): Promise<void> {
    // Validate deleter is not soft-deleted
    if (deleter.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Validate project exists
    const project = await this.projectRepository.findById(id);
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    // Authorization: Multiple roles can delete projects
    const isSystemAdmin = deleter.role === UserRole.ADMIN;
    const isProjectCreator = project.createdById === deleter.id;

    // Check if user is team owner
    let isTeamOwner = false;
    if (deleter.teamId === project.teamId) {
      isTeamOwner = await this.teamMemberRepository.isTeamOwner(
        deleter.id,
        project.teamId,
      );
    }

    if (!isSystemAdmin && !isProjectCreator && !isTeamOwner) {
      throw new ForbiddenException(
        'Only project creators, team owners, or system administrators can delete projects',
      );
    }

    // Check if project has active tasks
    const hasTasks = await this.projectRepository.hasActiveTasks(id);
    if (hasTasks) {
      throw new ConflictException(
        'Cannot delete project: Project has active tasks. Please delete or reassign tasks first.',
      );
    }

    // Perform soft delete
    await this.projectRepository.softDelete(id);
  }

  /**
   * Convert Project entity to ProjectResponseDto
   */
  private toResponseDto(project: Project): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project.id;
    dto.name = project.name;
    dto.description = project.description;
    dto.teamId = project.teamId;
    dto.createdById = project.createdById;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    return dto;
  }
}
