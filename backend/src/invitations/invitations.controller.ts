import {
  Controller,
  Post,
  Get,
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
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UsersService } from '../users/users.service';
import type { Request as ExpressRequest } from 'express';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private invitationsService: InvitationsService,
    private usersService: UsersService,
  ) {}

  /**
   * Create invitation (ADMIN or team admin only)
   * POST /invitations
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER) // Both can access, service validates team admin
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @Request() req: ExpressRequest,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    // Get user entity
    // JWT payload has 'email' field
    const userEmail = (user as any).email;
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new Error('User entity not found');
    }

    return this.invitationsService.inviteUser(userEntity, createInvitationDto);
  }

  /**
   * Accept invitation (public endpoint, no auth required)
   * POST /invitations/accept
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(acceptInvitationDto);
  }

  /**
   * Validate invitation token (public endpoint)
   * GET /invitations/validate/:token
   */
  @Get('validate/:token')
  async validateToken(@Param('token') token: string) {
    return this.invitationsService.validateInvitationToken(token);
  }

  /**
   * Get team invitations (team admin only)
   * GET /invitations/team/:teamId
   */
  @Get('team/:teamId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getTeamInvitations(
    @Request() req: ExpressRequest,
    @Param('teamId') teamId: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new Error('User not found in request');
    }

    // Get user entity
    // JWT payload has 'email' field
    const userEmail = (user as any).email;
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) {
      throw new Error('User entity not found');
    }

    return this.invitationsService.getTeamInvitations(userEntity, teamId);
  }
}
