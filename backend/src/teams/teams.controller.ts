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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UsersService } from '../users/users.service';
import type { Request as ExpressRequest } from 'express';

/**
 * Teams Controller
 * Thin controller - delegates business logic to TeamsService
 * Handles HTTP requests/responses and authorization
 */
@Controller('teams')
@UseGuards(JwtAuthGuard) // All endpoints require authentication
export class TeamsController {
  constructor(
    private teamsService: TeamsService,
    private usersService: UsersService,
  ) {}

  /**
   * Get current user's team
   * Business rule: Users can only see their own team
   * Any authenticated user can access
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyTeam(@Request() req: ExpressRequest) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    // Get user entity (needed for team relationship)
    // JWT payload has 'email' field
    const userEmail = (user as any).email;
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new Error('User entity not found');
    }
    return this.teamsService.getMyTeam(userEntity);
  }

  /**
   * Get all teams
   * ADMIN only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.teamsService.findAll();
  }

  /**
   * Get team by ID
   * ADMIN only
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  /**
   * Get team by slug
   * ADMIN only
   */
  @Get('slug/:slug')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    return this.teamsService.findBySlug(slug);
  }

  /**
   * Create a new team
   * Business rule: Any authenticated user can create teams
   * The creator is automatically assigned as OWNER (team-level role, not platform ADMIN)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: ExpressRequest,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    // DTO validation happens automatically via ValidationPipe
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    // Get user entity (needed for full user object)
    // JWT payload has 'email' field
    const userEmail = (user as any).email;
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new Error('User entity not found');
    }
    return this.teamsService.createTeam(userEntity, createTeamDto);
  }

  /**
   * Add user to team
   * Business rule: Only team admin or system ADMIN can add users
   */
  @Post(':teamId/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER) // Both can access, but service validates team admin
  @HttpCode(HttpStatus.OK)
  async addUserToTeam(
    @Request() req: ExpressRequest,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    // Get user entity (needed for team relationship)
    // JWT payload has 'email' field
    const userEmail = (user as any).email;
    const adminEntity = await this.usersService.findByEmail(userEmail);
    if (!adminEntity) {
      throw new Error('Admin user entity not found');
    }
    return this.teamsService.addUserToTeam(adminEntity, teamId, userId);
  }

  /**
   * Update team member role
   * Enterprise-grade: Only TEAM_OWNER can promote MEMBER → OWNER
   */
  @Put(':teamId/members/:userId/role')
  @HttpCode(HttpStatus.OK)
  async updateTeamMemberRole(
    @Request() req: ExpressRequest,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: any, // UpdateTeamMemberRoleDto
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    const userEmail = (user as any).email;
    const changerEntity = await this.usersService.findByEmail(userEmail);
    if (!changerEntity) {
      throw new Error('User entity not found');
    }
    return this.teamsService.updateTeamMemberRole(
      changerEntity,
      teamId,
      userId,
      updateRoleDto.role,
    );
  }

  /**
   * Update team
   * ADMIN only
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    // DTO validation happens automatically via ValidationPipe
    return this.teamsService.update(id, updateTeamDto);
  }

  /**
   * Soft delete team
   * ADMIN only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.teamsService.softDelete(id);
  }
}
