import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let module: TestingModule;
  let mockUserRepository: any;

  beforeEach(async () => {
    mockUserRepository = {
      emailExists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByTeamId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'hashedPassword',
      teamId: 'team-1',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create user successfully', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);

      const mockUser: User = {
        id: 'user-1',
        ...createUserDto,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result.email).toBe(createUserDto.email);
      expect(result.role).toBe(UserRole.USER);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if teamId is missing', async () => {
      const dtoWithoutTeam: CreateUserDto = {
        ...createUserDto,
        teamId: undefined,
      };

      mockUserRepository.emailExists.mockResolvedValue(false);

      await expect(service.create(dtoWithoutTeam)).rejects.toThrow(
        'Team ID is required',
      );
    });

    it('should use provided role if given', async () => {
      const dtoWithRole: CreateUserDto = {
        ...createUserDto,
        role: UserRole.ADMIN,
      };

      mockUserRepository.emailExists.mockResolvedValue(false);

      const mockUser: User = {
        id: 'user-1',
        ...dtoWithRole,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(dtoWithRole);

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('update', () => {
    const adminUser: User = {
      id: 'admin-1',
      email: 'admin@example.com',
      password: 'hashed',
      teamId: 'team-1',
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lastLoginAt: null,
    };

    const regularUser: User = {
      id: 'user-1',
      email: 'user@example.com',
      password: 'hashed',
      teamId: 'team-1',
      role: UserRole.USER,
      firstName: 'Regular',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lastLoginAt: null,
    };

    it('should update user successfully', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      mockUserRepository.findById.mockResolvedValue(regularUser);
      mockUserRepository.update.mockResolvedValue({
        ...regularUser,
        ...updateDto,
      });

      const result = await service.update(regularUser.id, updateDto, adminUser);

      expect(result.firstName).toBe('Updated');
    });

    it('should prevent role escalation: only ADMIN can promote to ADMIN', async () => {
      const updateDto: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      const nonAdminUser: User = {
        ...regularUser,
        id: 'non-admin-1',
        role: UserRole.USER,
      };

      mockUserRepository.findById.mockResolvedValue(regularUser);

      await expect(
        service.update(regularUser.id, updateDto, nonAdminUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to promote user to ADMIN', async () => {
      const updateDto: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      mockUserRepository.findById.mockResolvedValue(regularUser);
      mockUserRepository.update.mockResolvedValue({
        ...regularUser,
        role: UserRole.ADMIN,
      });

      const result = await service.update(regularUser.id, updateDto, adminUser);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const existingUser: User = {
        ...regularUser,
        id: 'other-user',
        email: 'existing@example.com',
      };

      mockUserRepository.findById.mockResolvedValue(regularUser);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.update(regularUser.id, updateDto, adminUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating email to same email', async () => {
      const updateDto: UpdateUserDto = {
        email: regularUser.email,
      };

      mockUserRepository.findById.mockResolvedValue(regularUser);
      mockUserRepository.findByEmail.mockResolvedValue(regularUser);
      mockUserRepository.update.mockResolvedValue(regularUser);

      await service.update(regularUser.id, updateDto, adminUser);

      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', {}, adminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const mockUser: User = {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result.id).toBe('user-1');
      expect(result.password).toBeUndefined(); // Password should not be in DTO
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser: User = {
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

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      const mockUser: User = {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('user-1');

      expect(mockUserRepository.softDelete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByTeamId', () => {
    it('should return users by team id', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          password: 'hashed',
          teamId: 'team-1',
          role: UserRole.USER,
          firstName: 'John',
          lastName: 'Doe',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          lastLoginAt: null,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          password: 'hashed',
          teamId: 'team-1',
          role: UserRole.USER,
          firstName: 'Jane',
          lastName: 'Smith',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          lastLoginAt: null,
        },
      ];

      mockUserRepository.findByTeamId.mockResolvedValue(mockUsers);

      const result = await service.findByTeamId('team-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
      expect(result[0].password).toBeUndefined(); // Password should not be in DTO
      expect(result[1].password).toBeUndefined();
    });

    it('should return empty array if no users in team', async () => {
      mockUserRepository.findByTeamId.mockResolvedValue([]);

      const result = await service.findByTeamId('team-1');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          password: 'hashed',
          teamId: 'team-1',
          role: UserRole.USER,
          firstName: 'John',
          lastName: 'Doe',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          lastLoginAt: null,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          password: 'hashed',
          teamId: 'team-2',
          role: UserRole.ADMIN,
          firstName: 'Jane',
          lastName: 'Smith',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          lastLoginAt: null,
        },
      ];

      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
      expect(result[0].password).toBeUndefined(); // Password should not be in DTO
      expect(result[1].password).toBeUndefined();
    });

    it('should return empty array if no users exist', async () => {
      mockUserRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      await service.updateLastLogin('user-1');

      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
    });
  });
});
