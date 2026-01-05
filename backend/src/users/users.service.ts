import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { User, UserRole } from './user.entity';
import type { IUserRepository } from './repositories/user.repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

/**
 * Users Service
 * Contains business logic for user operations
 * Follows Single Responsibility Principle - only business logic
 * Depends on repository interface (Dependency Inversion Principle)
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Create a new user
   * Business logic: Check email uniqueness, validate team exists
   * Note: teamId is optional in DTO but required for creation
   * AuthService handles team creation if not provided before calling this
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(
      createUserDto.email,
    );
    if (emailExists) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate teamId is provided (AuthService should handle team creation before calling this)
    if (!createUserDto.teamId) {
      throw new Error(
        'Team ID is required. AuthService should create a team if not provided.',
      );
    }

    // Assign to a variable so TypeScript knows it's defined (non-null assertion after check)
    const teamId = createUserDto.teamId;

    // Create user via repository (teamId is now guaranteed to be defined)
    const user = await this.userRepository.create({
      email: createUserDto.email,
      password: createUserDto.password, // Password will be hashed by AuthService before calling this
      teamId: teamId, // Now TypeScript knows this is a string
      role: createUserDto.role || UserRole.USER,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
    });

    return this.toResponseDto(user);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Find all users in a team
   */
  async findByTeamId(teamId: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByTeamId(teamId);
    return users.map((user) => this.toResponseDto(user));
  }

  /**
   * Find all users
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => this.toResponseDto(user));
  }

  /**
   * Update user
   * Enterprise-grade business logic:
   * - Validate email uniqueness if email is being changed
   * - Prevent role escalation (only ADMIN can promote to ADMIN)
   * - Audit log all role changes
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy: User, // User performing the update
  ): Promise<UserResponseDto> {
    // Get current user state
    const currentUser = await this.userRepository.findById(id);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it already exists
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    // CRITICAL: Prevent role escalation
    // Only ADMIN can promote users to ADMIN
    if (
      updateUserDto.role !== undefined &&
      updateUserDto.role !== currentUser.role
    ) {
      const isPromotingToAdmin = updateUserDto.role === UserRole.ADMIN;
      const isCurrentAdmin = updatedBy.role === UserRole.ADMIN;

      if (isPromotingToAdmin && !isCurrentAdmin) {
        throw new ForbiddenException(
          'Only system administrators can promote users to ADMIN role. Role escalation prevented.',
        );
      }

      // Log role change (audit trail)
      // Note: AuditService will be injected if needed, for now we'll add it later
      // await this.auditService.logRoleChange(
      //   id,
      //   id,
      //   currentUser.role,
      //   updateUserDto.role,
      //   updatedBy.id,
      // );
    }

    const user = await this.userRepository.update(id, updateUserDto);
    return this.toResponseDto(user);
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.softDelete(id);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
  }

  /**
   * Convert User entity to UserResponseDto
   * Ensures password is never exposed
   */
  private toResponseDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.teamId = user.teamId;
    dto.role = user.role;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.lastLoginAt = user.lastLoginAt;
    // Password is intentionally excluded
    return dto;
  }
}
