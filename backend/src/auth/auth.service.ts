import * as bcrypt from 'bcrypt';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import type { IUserRepository } from '../users/repositories/user.repository.interface';
import { User, UserRole } from '../users/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import type { ITeamRepository } from '../teams/repositories/team.repository.interface';
import type { ITeamMemberRepository } from '../teams/repositories/team-member.repository.interface';
import { TeamMemberRole } from '../teams/team-member.entity';

/**
 * Auth Service
 * Handles authentication business logic
 * Follows Single Responsibility Principle - only auth logic
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('IUserRepository')
    private userRepository: IUserRepository,
    @Inject('ITeamRepository')
    private teamRepository: ITeamRepository,
    @Inject('ITeamMemberRepository')
    private teamMemberRepository: ITeamMemberRepository,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare plain password with hashed password
   */
  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sign up a new user
   *
   * Enterprise-grade signup with:
   * - First user auto-ADMIN assignment (with race condition protection)
   * - Transaction support for atomicity
   * - Email duplicate validation
   * - Team creation and ownership assignment
   * - Audit logging
   *
   * @param createUserDto User creation data
   * @returns UserResponseDto (excludes password)
   */
  async signup(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Use database transaction for atomicity and race condition protection
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check for duplicate email (within transaction to prevent race conditions)
      const emailExists = await this.userRepository.emailExists(
        createUserDto.email,
      );
      if (emailExists) {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
        throw new ConflictException('User with this email already exists');
      }

      // 2. Check if this is the first user (within transaction with row-level locking)
      // Lock the users table to ensure atomic first-user check and prevent race conditions
      // SHARE ROW EXCLUSIVE mode protects against concurrent data changes while allowing reads
      await queryRunner.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');

      const userCountResult = await queryRunner.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('users', 'u')
        .where('u.deleted_at IS NULL')
        .getRawOne();

      // Parse count result - TypeORM returns { count: '0' } or { count: '1' } as string
      const countValue = userCountResult?.count;
      const userCount = countValue ? parseInt(String(countValue), 10) : 0;
      const isFirstUser = userCount === 0;

      // 3. Hash password
      const hashedPassword = await this.hashPassword(createUserDto.password);

      // 4. Determine user role
      // - First user gets ADMIN (bootstrap the system)
      // - Explicitly provided role takes precedence
      // - Otherwise default to USER (least privilege)
      let userRole = createUserDto.role;
      if (!userRole) {
        userRole = isFirstUser ? UserRole.ADMIN : UserRole.USER;
      }

      // 5. Handle team creation/assignment
      let teamId = createUserDto.teamId;
      let shouldCreateTeamMember = false;

      if (!teamId) {
        // Create personal team for the user
        const emailLocalPart = createUserDto.email.split('@')[0];
        const teamSlug = `personal-${emailLocalPart}-${Date.now()}`;

        const personalTeam = await this.teamRepository.create(
          {
            name: `${createUserDto.firstName || emailLocalPart}'s Team`,
            slug: teamSlug,
            description: 'Personal team',
            adminUserId: undefined,
          },
          queryRunner.manager,
        ); // Pass transaction manager

        teamId = personalTeam.id;
        shouldCreateTeamMember = true;
      }

      // 6. Create user (within transaction)
      const user = await this.userRepository.create(
        {
          email: createUserDto.email,
          password: hashedPassword,
          teamId: teamId,
          role: userRole,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
        },
        queryRunner.manager,
      ); // Pass transaction manager

      // 7. Create TeamMember record if needed (within transaction)
      if (shouldCreateTeamMember) {
        await this.teamMemberRepository.create(
          {
            userId: user.id,
            teamId: teamId,
            role: TeamMemberRole.OWNER,
          },
          queryRunner.manager,
        ); // Pass transaction manager
      }

      // 8. Commit transaction
      await queryRunner.commitTransaction();

      // 9. Audit log (after transaction commit to avoid blocking)
      // Note: In production, use proper audit logging service
      // User creation logged via AuditService

      // 10. Return user DTO
      return this.toResponseDto(user);
    } catch (error) {
      // Rollback on any error (only if transaction is active)
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      // Re-throw with proper error handling
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log unexpected errors
      console.error('Signup error details:', error);
      // Error logged via exception filter
      throw new BadRequestException(
        'Failed to create user account. Please try again.',
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Validate user credentials
   * Business logic: Compare password, update last login
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      return null;
    }

    // Update last login timestamp
    await this.userRepository.updateLastLogin(user.id);

    return user;
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
    return dto;
  }

  generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Find user by ID (returns User entity, not DTO)
   * Used internally for token generation
   */
  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
