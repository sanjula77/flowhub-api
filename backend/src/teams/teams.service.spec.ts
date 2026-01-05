import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { User, UserRole } from '../users/user.entity';
import { TeamMemberRole } from './team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';

describe('TeamsService', () => {
  let service: TeamsService;
  let module: TestingModule;
  let mockTeamRepository: any;
  let mockUserRepository: any;
  let mockTeamMemberRepository: any;

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

  const teamOwner: User = {
    id: 'owner-1',
    email: 'owner@example.com',
    password: 'hashed',
    teamId: 'team-1',
    role: UserRole.USER,
    firstName: 'Team',
    lastName: 'Owner',
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

  beforeEach(async () => {
    mockTeamRepository = {
      slugExists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findByAdminUserId: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveUsers: jest.fn(),
      countActiveUsers: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockTeamMemberRepository = {
      create: jest.fn(),
      findByUserAndTeam: jest.fn(),
      updateRole: jest.fn(),
      isTeamOwner: jest.fn(),
      isTeamMember: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: 'ITeamRepository',
          useValue: mockTeamRepository,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'ITeamMemberRepository',
          useValue: mockTeamMemberRepository,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('createTeam', () => {
    const createTeamDto: CreateTeamDto = {
      name: 'Test Team',
      slug: 'test-team',
      description: 'Test description',
    };

    it('should create team and assign creator as OWNER', async () => {
      mockTeamRepository.slugExists.mockResolvedValue(false);

      const mockTeam = {
        id: 'team-1',
        ...createTeamDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.create.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.create.mockResolvedValue({
        id: 'member-1',
        userId: teamOwner.id,
        teamId: mockTeam.id,
        role: TeamMemberRole.OWNER,
      });

      const result = await service.createTeam(teamOwner, createTeamDto);

      expect(result.id).toBe(mockTeam.id);
      expect(mockTeamMemberRepository.create).toHaveBeenCalledWith({
        userId: teamOwner.id,
        teamId: mockTeam.id,
        role: TeamMemberRole.OWNER,
      });
    });

    it('should throw ConflictException for duplicate slug', async () => {
      mockTeamRepository.slugExists.mockResolvedValue(true);

      await expect(
        service.createTeam(teamOwner, createTeamDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTeamMemberRole', () => {
    const teamId = 'team-1';
    const targetUserId = 'user-1';

    it('should allow TEAM_OWNER to promote MEMBER to OWNER', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.MEMBER,
      });

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockTeamMemberRepository.updateRole.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.OWNER,
      });

      const result = await service.updateTeamMemberRole(
        teamOwner,
        teamId,
        targetUserId,
        TeamMemberRole.OWNER,
      );

      expect(result.member.role).toBe(TeamMemberRole.OWNER);
      expect(mockTeamMemberRepository.updateRole).toHaveBeenCalled();
    });

    it('should allow ADMIN to change any team member role', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.MEMBER,
      });

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamMemberRepository.updateRole.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.OWNER,
      });

      const result = await service.updateTeamMemberRole(
        adminUser,
        teamId,
        targetUserId,
        TeamMemberRole.OWNER,
      );

      expect(result.member.role).toBe(TeamMemberRole.OWNER);
    });

    it('should prevent regular user from changing team member roles', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.MEMBER,
      });

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      await expect(
        service.updateTeamMemberRole(
          regularUser,
          teamId,
          targetUserId,
          TeamMemberRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent role escalation: only TEAM_OWNER can promote to OWNER', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue({
        id: 'member-1',
        userId: targetUserId,
        teamId,
        role: TeamMemberRole.MEMBER,
      });

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      await expect(
        service.updateTeamMemberRole(
          regularUser,
          teamId,
          targetUserId,
          TeamMemberRole.OWNER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent self-demotion from OWNER', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue({
        id: 'member-1',
        userId: teamOwner.id,
        teamId,
        role: TeamMemberRole.OWNER,
      });

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);

      await expect(
        service.updateTeamMemberRole(
          teamOwner,
          teamId,
          teamOwner.id,
          TeamMemberRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateTeamMemberRole(
          teamOwner,
          'non-existent',
          targetUserId,
          TeamMemberRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if team member not found', async () => {
      mockTeamRepository.findById.mockResolvedValue({
        id: teamId,
        name: 'Test Team',
        deletedAt: null,
      });

      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue(null);

      await expect(
        service.updateTeamMemberRole(
          teamOwner,
          teamId,
          targetUserId,
          TeamMemberRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isTeamOwnerOfTeam', () => {
    it('should return true if user is team owner', async () => {
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);

      const result = await service.isTeamOwnerOfTeam(teamOwner, 'team-1');

      expect(result).toBe(true);
    });

    it('should return false if user is not team owner', async () => {
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      const result = await service.isTeamOwnerOfTeam(regularUser, 'team-1');

      expect(result).toBe(false);
    });
  });

  describe('create (deprecated)', () => {
    const createTeamDto: CreateTeamDto = {
      name: 'Test Team',
      slug: 'test-team',
      description: 'Test description',
      adminUserId: 'admin-1',
    };

    it('should create team', async () => {
      mockTeamRepository.slugExists.mockResolvedValue(false);
      const mockTeam = {
        id: 'team-1',
        ...createTeamDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.create.mockResolvedValue(mockTeam);

      const result = await service.create(createTeamDto);

      expect(result.id).toBe('team-1');
    });

    it('should throw ConflictException for duplicate slug', async () => {
      mockTeamRepository.slugExists.mockResolvedValue(true);

      await expect(service.create(createTeamDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById', () => {
    it('should return team by id', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.findById.mockResolvedValue(mockTeam);

      const result = await service.findById('team-1');

      expect(result.id).toBe('team-1');
    });

    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return team by slug', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        slug: 'test-team',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.findBySlug.mockResolvedValue(mockTeam);

      const result = await service.findBySlug('test-team');

      expect(result.slug).toBe('test-team');
    });

    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team 1',
          slug: 'team-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'team-2',
          name: 'Team 2',
          slug: 'team-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];
      mockTeamRepository.findAll.mockResolvedValue(mockTeams);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('team-1');
    });

    it('should return empty array if no teams', async () => {
      mockTeamRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByAdminUserId', () => {
    it('should return teams by admin user id', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team 1',
          slug: 'team-1',
          adminUserId: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];
      mockTeamRepository.findByAdminUserId.mockResolvedValue(mockTeams);

      const result = await service.findByAdminUserId('admin-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('team-1');
    });
  });

  describe('update', () => {
    it('should update team', async () => {
      const updateDto = { name: 'Updated Team' };
      const mockTeam = {
        id: 'team-1',
        name: 'Updated Team',
        slug: 'test-team',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.update.mockResolvedValue(mockTeam);

      const result = await service.update('team-1', updateDto);

      expect(result.name).toBe('Updated Team');
    });

    it('should throw ConflictException if slug already exists', async () => {
      const updateDto = { slug: 'existing-slug' };
      mockTeamRepository.slugExists.mockResolvedValue(true);

      await expect(service.update('team-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow update without slug conflict', async () => {
      const updateDto = { slug: 'new-slug' };
      mockTeamRepository.slugExists.mockResolvedValue(false);
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        slug: 'new-slug',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockTeamRepository.update.mockResolvedValue(mockTeam);

      const result = await service.update('team-1', updateDto);

      expect(result.slug).toBe('new-slug');
    });
  });

  describe('softDelete', () => {
    it('should soft delete team', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.hasActiveUsers.mockResolvedValue(false);
      mockTeamRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('team-1');

      expect(mockTeamRepository.softDelete).toHaveBeenCalledWith('team-1');
    });

    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if team has active users', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamRepository.hasActiveUsers.mockResolvedValue(true);
      mockTeamRepository.countActiveUsers.mockResolvedValue(5);

      await expect(service.softDelete('team-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getMyTeam', () => {
    it('should return user team', async () => {
      const userWithTeam: User = {
        ...regularUser,
        teamId: 'team-1',
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };
      mockTeamRepository.findById.mockResolvedValue(mockTeam);

      const result = await service.getMyTeam(userWithTeam);

      expect(result.id).toBe('team-1');
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      const deletedUser: User = {
        ...regularUser,
        deletedAt: new Date(),
      };

      await expect(service.getMyTeam(deletedUser)).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('should throw NotFoundException if user has no team', async () => {
      const userWithoutTeam: User = {
        ...regularUser,
        teamId: null,
      };

      await expect(service.getMyTeam(userWithoutTeam)).rejects.toThrow(
        'User does not belong to any team',
      );
    });

    it('should throw NotFoundException if team not found', async () => {
      const userWithTeam: User = {
        ...regularUser,
        teamId: 'team-1',
      };
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.getMyTeam(userWithTeam)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if team is deleted', async () => {
      const userWithTeam: User = {
        ...regularUser,
        teamId: 'team-1',
      };
      const deletedTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: new Date(),
      };
      mockTeamRepository.findById.mockResolvedValue(deletedTeam);

      await expect(service.getMyTeam(userWithTeam)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addUserToTeam', () => {
    it('should add user to team', async () => {
      const targetUser: User = {
        id: 'target-user',
        email: 'target@example.com',
        password: 'hashed',
        teamId: null,
        role: UserRole.USER,
        firstName: 'Target',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockUserRepository.findById
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce({ ...targetUser, teamId: 'team-1' });
      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockTeamMemberRepository.create.mockResolvedValue({
        id: 'member-1',
        userId: targetUser.id,
        teamId: 'team-1',
        role: TeamMemberRole.MEMBER,
      });

      const result = await service.addUserToTeam(
        teamOwner,
        'team-1',
        targetUser.id,
      );

      expect(result.message).toContain('has been added to team');
      expect(result.user.teamId).toBe('team-1');
    });

    it('should allow ADMIN to add user to team', async () => {
      const targetUser: User = {
        id: 'target-user',
        email: 'target@example.com',
        password: 'hashed',
        teamId: null,
        role: UserRole.USER,
        firstName: 'Target',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockUserRepository.findById
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce({ ...targetUser, teamId: 'team-1' });
      mockTeamMemberRepository.findByUserAndTeam.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockTeamMemberRepository.create.mockResolvedValue({
        id: 'member-1',
        userId: targetUser.id,
        teamId: 'team-1',
        role: TeamMemberRole.MEMBER,
      });

      const result = await service.addUserToTeam(
        adminUser,
        'team-1',
        targetUser.id,
      );

      expect(result.user.teamId).toBe('team-1');
    });

    it('should throw ForbiddenException if user is not team owner or admin', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      await expect(
        service.addUserToTeam(regularUser, 'team-1', 'target-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(
        service.addUserToTeam(teamOwner, 'non-existent', 'target-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.addUserToTeam(teamOwner, 'team-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already in team', async () => {
      const targetUser: User = {
        id: 'target-user',
        email: 'target@example.com',
        password: 'hashed',
        teamId: 'team-1',
        role: UserRole.USER,
        firstName: 'Target',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await expect(
        service.addUserToTeam(teamOwner, 'team-1', targetUser.id),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if user is from different team', async () => {
      const targetUser: User = {
        id: 'target-user',
        email: 'target@example.com',
        password: 'hashed',
        teamId: 'team-2',
        role: UserRole.USER,
        firstName: 'Target',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastLoginAt: null,
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        deletedAt: null,
      };

      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(targetUser);

      await expect(
        service.addUserToTeam(teamOwner, 'team-1', targetUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isTeamMember', () => {
    it('should return true if user is team member', async () => {
      mockTeamMemberRepository.isTeamMember.mockResolvedValue(true);

      const result = await service.isTeamMember(regularUser, 'team-1');

      expect(result).toBe(true);
      expect(mockTeamMemberRepository.isTeamMember).toHaveBeenCalledWith(
        regularUser.id,
        'team-1',
      );
    });

    it('should return false if user is not team member', async () => {
      mockTeamMemberRepository.isTeamMember.mockResolvedValue(false);

      const result = await service.isTeamMember(regularUser, 'team-1');

      expect(result).toBe(false);
    });
  });

  describe('isTeamAdminOfTeam', () => {
    it('should return true if user is team owner via TeamMember', async () => {
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);

      const result = await service.isTeamAdminOfTeam(teamOwner, 'team-1');

      expect(result).toBe(true);
    });

    it('should return true if user is admin via adminUserId', async () => {
      const adminUserWithTeam: User = {
        ...adminUser,
        teamId: 'team-1',
      };
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        adminUserId: adminUserWithTeam.id,
        deletedAt: null,
      };

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamRepository.findById.mockResolvedValue(mockTeam);

      const result = await service.isTeamAdminOfTeam(
        adminUserWithTeam,
        'team-1',
      );

      expect(result).toBe(true);
    });

    it('should return false if user is not team owner and not admin', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        adminUserId: 'other-admin',
        deletedAt: null,
      };

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamRepository.findById.mockResolvedValue(mockTeam);

      const result = await service.isTeamAdminOfTeam(regularUser, 'team-1');

      expect(result).toBe(false);
    });

    it('should return false if user teamId does not match', async () => {
      const userWithDifferentTeam: User = {
        ...regularUser,
        teamId: 'team-2',
      };

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      const result = await service.isTeamAdminOfTeam(
        userWithDifferentTeam,
        'team-1',
      );

      expect(result).toBe(false);
    });

    it('should return false if team not found', async () => {
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamRepository.findById.mockResolvedValue(null);

      const result = await service.isTeamAdminOfTeam(regularUser, 'team-1');

      expect(result).toBe(false);
    });

    it('should return false if team is deleted', async () => {
      const deletedTeam = {
        id: 'team-1',
        name: 'Test Team',
        adminUserId: regularUser.id,
        deletedAt: new Date(),
      };

      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamRepository.findById.mockResolvedValue(deletedTeam);

      const result = await service.isTeamAdminOfTeam(regularUser, 'team-1');

      expect(result).toBe(false);
    });
  });
});
