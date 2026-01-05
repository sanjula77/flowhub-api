import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { ProjectsService } from './projects.service';
import { UsersService } from '../users/users.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { Request as ExpressRequest } from 'express';

/**
 * Projects Controller
 * Thin controller - delegates business logic to ProjectsService
 * Handles HTTP requests/responses and authorization
 * Enforces multi-tenant isolation via team-scoped operations
 */
@Controller('projects')
@UseGuards(JwtAuthGuard) // All endpoints require authentication
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get all projects with role-based access control
   * ADMIN: Returns all projects across all teams
   * USER: Returns only projects from their team
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: ExpressRequest) {
    const user = req.user as any;
    const userEmail = user.email;

    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    // Get full user entity to check role and teamId
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    return this.projectsService.findAll(userEntity);
  }

  /**
   * Get project by ID with role-based access control
   * ADMIN: Can access any project
   * USER: Can only access projects from their team
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Request() req: ExpressRequest) {
    const user = req.user as any;
    const userEmail = user.email;

    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    // Get full user entity to check role and teamId
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    return this.projectsService.findById(id, userEntity);
  }

  /**
   * Get all projects created by the current user
   * Any authenticated user can see their own projects
   */
  @Get('my-projects')
  @HttpCode(HttpStatus.OK)
  async findMyProjects(@Request() req: ExpressRequest) {
    const user = req.user as any;
    const userId = user.sub || user.id;

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    return this.projectsService.findByCreatedById(userId);
  }

  /**
   * Create new project
   * Enterprise-grade: ADMIN or TEAM_OWNER can create projects
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: ExpressRequest,
  ) {
    // DTO validation happens automatically via ValidationPipe
    const user = req.user as any;
    if (!user) {
      throw new BadRequestException('User not found in request');
    }

    // Get user entity (needed for full user object with role)
    // JWT payload has 'email' field
    const userEmail = user.email;
    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    return this.projectsService.create(userEntity, createProjectDto);
  }

  /**
   * Update project
   * Enterprise-grade: ADMIN, TEAM_OWNER, or project creator can update
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: ExpressRequest,
  ) {
    // DTO validation happens automatically via ValidationPipe
    const user = req.user as any;
    if (!user) {
      throw new BadRequestException('User not found in request');
    }

    // Get user entity (needed for full user object with role)
    const userEmail = user.email;
    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    return this.projectsService.update(userEntity, id, updateProjectDto);
  }

  /**
   * Delete project (soft delete)
   * Enterprise-grade: ADMIN, TEAM_OWNER, or project creator can delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest) {
    const user = req.user as any;
    if (!user) {
      throw new BadRequestException('User not found in request');
    }

    // Get user entity (needed for full user object with role)
    const userEmail = user.email;
    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    await this.projectsService.softDelete(userEntity, id);
  }

  /**
   * Get all projects (ADMIN only)
   * Explicit admin endpoint for clarity (alternative to GET /projects)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findAllAdmin(@Request() req: ExpressRequest) {
    const user = req.user as any;
    const userEmail = user.email;

    if (!userEmail) {
      throw new BadRequestException('User email not found in token');
    }

    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new BadRequestException('User entity not found');
    }

    return this.projectsService.findAll(userEntity);
  }

  /**
   * Get projects by team ID (ADMIN only)
   * Only admins can query projects for any team
   */
  @Get('admin/team/:teamId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findByTeamAdmin(@Param('teamId') teamId: string) {
    return this.projectsService.findByTeamId(teamId);
  }
}
