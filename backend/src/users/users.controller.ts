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
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Request as ExpressRequest } from 'express';
import { TeamsService } from '../teams/teams.service';

/**
 * Users Controller
 * Thin controller - delegates business logic to UsersService
 * Handles HTTP requests/responses and authorization
 */
@Controller('users')
@UseGuards(JwtAuthGuard) // All endpoints require authentication
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * Get current user's profile
   * Any authenticated user can access their own profile
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Request() req: ExpressRequest) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    // JWT payload has 'sub' field (user ID)
    const userId = (user as any).sub || (user as any).id;
    return this.usersService.findById(userId);
  }

  /**
   * Get all users
   * ADMIN only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * Get user by ID
   * ADMIN only
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  /**
   * Get users by team ID
   * ADMIN or team admin can access
   */
  @Get('team/:teamId')
  @HttpCode(HttpStatus.OK)
  async findByTeam(
    @Request() req: ExpressRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    const userRole = (user as any).role;

    // System ADMIN can access any team
    if (userRole === UserRole.ADMIN) {
      return this.usersService.findByTeamId(teamId);
    }

    // Check if user is team admin of the requested team
    const userEntity = await this.usersService.findByEmail((user as any).email);
    if (!userEntity) {
      throw new Error('User entity not found');
    }

    // Check if user is team owner (using TeamMember) or system ADMIN
    // Also check legacy adminUserId as fallback for backward compatibility
    let isAuthorized = false;

    // System ADMIN can always access
    if (userRole === UserRole.ADMIN) {
      isAuthorized = true;
    } else {
      // Check TeamMember first (new way)
      const isTeamOwner = await this.teamsService.isTeamOwnerOfTeam(
        userEntity,
        teamId,
      );
      if (isTeamOwner) {
        isAuthorized = true;
      } else {
        // Fallback: Check legacy adminUserId for backward compatibility
        // This handles teams created before TeamMember system was implemented
        try {
          const team = await this.teamsService.findById(teamId);
          if (team && (team as any).adminUserId === userEntity.id) {
            isAuthorized = true;
          }
        } catch {
          // Team not found or error - will be handled below
        }
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Only team owners or system administrators can view team members',
      );
    }

    return this.usersService.findByTeamId(teamId);
  }

  /**
   * Create new user
   * ADMIN only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    // DTO validation happens automatically via ValidationPipe
    return this.usersService.create(createUserDto);
  }

  /**
   * Update user
   * ADMIN only
   * Enterprise-grade: Prevents role escalation (only ADMIN can promote to ADMIN)
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: ExpressRequest,
  ) {
    // DTO validation happens automatically via ValidationPipe
    const adminUser = req.user;
    if (!adminUser) {
      throw new Error('User not found in request');
    }
    const adminEmail = (adminUser as any).email;
    const adminEntity = await this.usersService.findByEmail(adminEmail);
    if (!adminEntity) {
      throw new Error('Admin user entity not found');
    }
    return this.usersService.update(id, updateUserDto, adminEntity);
  }

  /**
   * Update current user's profile
   * Any authenticated user can update their own profile
   */
  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @Request() req: ExpressRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    // Users can only update their own profile (not role or teamId)
    const restrictedDto = { ...updateUserDto };
    delete restrictedDto.role; // Users cannot change their own role
    delete restrictedDto.teamId; // Users cannot change their own team
    // JWT payload has 'sub' field (user ID)
    const userId = (user as any).sub || (user as any).id;
    const userEmail = (user as any).email;
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new Error('User entity not found');
    }
    return this.usersService.update(userId, restrictedDto, userEntity);
  }

  /**
   * Soft delete user
   * ADMIN only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.softDelete(id);
  }
}
