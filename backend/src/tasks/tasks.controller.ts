import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseEnumPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TasksService } from './tasks.service';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { TaskStatus } from './task.entity';
import type { Request as ExpressRequest } from 'express';

/**
 * Tasks Controller
 * Handles HTTP requests for task operations
 * Follows Single Responsibility Principle - only HTTP handling
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard) // All endpoints require authentication
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get all tasks with optional filtering
   * Query params: projectId, status
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Request() req: ExpressRequest,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.findAll(userEntity, projectId, status);
  }

  /**
   * Get task by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Request() req: ExpressRequest) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.findById(id, userEntity);
  }

  /**
   * Get tasks by project
   */
  @Get('project/:projectId')
  @HttpCode(HttpStatus.OK)
  async findByProject(
    @Param('projectId') projectId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.findByProjectId(projectId, userEntity);
  }

  /**
   * Get tasks assigned to a user
   */
  @Get('assigned/:userId')
  @HttpCode(HttpStatus.OK)
  async findByAssigned(
    @Param('userId') userId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.findByAssignedToId(userId, userEntity);
  }

  /**
   * Create a new task
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.create(userEntity, createTaskDto);
  }

  /**
   * Assign task to user
   */
  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignTask(
    @Param('id') id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.assignTask(userEntity, id, assignTaskDto);
  }

  /**
   * Update task status
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(TaskStatus)) status: TaskStatus,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.updateStatus(userEntity, id, status);
  }

  /**
   * Update task
   * Only ADMIN or project creator can update (checked in service)
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    return this.tasksService.update(userEntity, id, updateTaskDto);
  }

  /**
   * Delete task
   * Only ADMIN or project creator can delete (checked in service)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest) {
    const user = req.user as any;
    const userEmail = user.email;
    if (!userEmail)
      throw new BadRequestException('User email not found in token');
    const userEntity = await this.usersService.findByEmail(userEmail);
    if (!userEntity) throw new BadRequestException('User entity not found');
    await this.tasksService.softDelete(userEntity, id);
  }
}
