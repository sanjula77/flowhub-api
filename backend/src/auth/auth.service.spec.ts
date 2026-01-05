import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { TeamMemberRole } from '../teams/team-member.entity';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let mockUserRepository: any;
  let mockTeamRepository: any;
  let mockTeamMemberRepository: any;
  let mockJwtService: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Mock QueryRunner
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      isTransactionActive: true,
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
        }),
      },
    };

    // Mock DataSource
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // Mock repositories
    mockUserRepository = {
      emailExists: jest.fn(),
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    mockTeamRepository = {
      create: jest.fn(),
    };

    mockTeamMemberRepository = {
      create: jest.fn(),
    };

    // Mock JWT Service
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'ITeamRepository',
          useValue: mockTeamRepository,
        },
        {
          provide: 'ITeamMemberRepository',
          useValue: mockTeamMemberRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPassword';

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hash = '$2b$10$hashedPassword';

      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.comparePasswords(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'wrongPassword';
      const hash = '$2b$10$hashedPassword';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.comparePasswords(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('signup', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should assign ADMIN role to first user', async () => {
      // Setup: No users exist
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.manager
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ count: '0' });

      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);

      const mockTeam = {
        id: 'team-1',
        name: "John's Team",
        slug: 'personal-test-123',
      };
      mockTeamRepository.create.mockResolvedValue(mockTeam);

      const mockUser: User = {
        id: 'user-1',
        email: createUserDto.email,
        password: '$2b$10$hashed',
        teamId: mockTeam.id,
        role: UserRole.ADMIN,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.signup(createUserDto);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(mockTeamMemberRepository.create).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          teamId: mockTeam.id,
          role: TeamMemberRole.OWNER,
        },
        mockQueryRunner.manager,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should assign USER role to subsequent users', async () => {
      // Setup: Users already exist
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.manager
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ count: '5' });

      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);

      const mockTeam = {
        id: 'team-1',
        name: "John's Team",
        slug: 'personal-test-123',
      };
      mockTeamRepository.create.mockResolvedValue(mockTeam);

      const mockUser: User = {
        id: 'user-2',
        email: createUserDto.email,
        password: '$2b$10$hashed',
        teamId: mockTeam.id,
        role: UserRole.USER,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.signup(createUserDto);

      expect(result.role).toBe(UserRole.USER);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);

      await expect(service.signup(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create personal team if teamId not provided', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.manager
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ count: '0' });

      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);

      const mockTeam = {
        id: 'team-1',
        name: "John's Team",
        slug: 'personal-test-123',
      };
      mockTeamRepository.create.mockResolvedValue(mockTeam);

      const mockUser: User = {
        id: 'user-1',
        email: createUserDto.email,
        password: '$2b$10$hashed',
        teamId: mockTeam.id,
        role: UserRole.ADMIN,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      await service.signup(createUserDto);

      expect(mockTeamRepository.create).toHaveBeenCalled();
      expect(mockTeamMemberRepository.create).toHaveBeenCalled();
    });

    it('should use provided teamId if given', async () => {
      const dtoWithTeam: CreateUserDto = {
        ...createUserDto,
        teamId: 'existing-team-id',
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockQueryRunner.manager
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ count: '1' });

      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashed' as never);

      const mockUser: User = {
        id: 'user-1',
        email: dtoWithTeam.email,
        password: '$2b$10$hashed',
        teamId: dtoWithTeam.teamId!,
        role: UserRole.USER,
        firstName: dtoWithTeam.firstName,
        lastName: dtoWithTeam.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      await service.signup(dtoWithTeam);

      expect(mockTeamRepository.create).not.toHaveBeenCalled();
      expect(mockTeamMemberRepository.create).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.manager
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ count: '0' });

      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      await expect(service.signup(createUserDto)).rejects.toThrow();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockUser: User = {
        id: 'user-1',
        email,
        password: '$2b$10$hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should return null for invalid email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'wrong@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: '$2b$10$hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };

      const result = service.generateTokens(user);

      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      };
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'non-existent-user', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return user for valid ID', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await service.findUserById('user-1');

      expect(result).toEqual(user);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findUserById('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
