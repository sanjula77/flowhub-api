import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { User, UserRole } from '../users/user.entity';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Team } from '../teams/team.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let module: TestingModule;
  let mockProjectRepository: any;
  let mockTeamRepository: any;
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

  const testTeam: Team = {
    id: 'team-1',
    name: 'Test Team',
    slug: 'test-team',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    adminUserId: 'owner-1',
  };

  const testProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test description',
    teamId: 'team-1',
    createdById: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockProjectRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndTeamId: jest.fn(),
      findAll: jest.fn(),
      findByTeamId: jest.fn(),
      findByCreatedById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveTasks: jest.fn(),
    };

    mockTeamRepository = {
      findById: jest.fn(),
    };

    mockTeamMemberRepository = {
      isTeamOwner: jest.fn(),
      isTeamMember: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: 'IProjectRepository',
          useValue: mockProjectRepository,
        },
        {
          provide: 'ITeamRepository',
          useValue: mockTeamRepository,
        },
        {
          provide: 'ITeamMemberRepository',
          useValue: mockTeamMemberRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('create', () => {
    const createProjectDto: CreateProjectDto = {
      name: 'New Project',
      description: 'New project description',
      teamId: 'team-1',
    };

    it('should create project as ADMIN', async () => {
      mockTeamRepository.findById.mockResolvedValue(testTeam);
      mockProjectRepository.create.mockResolvedValue(testProject);

      const result = await service.create(adminUser, createProjectDto);

      expect(result.id).toBe(testProject.id);
      expect(mockProjectRepository.create).toHaveBeenCalledWith({
        name: createProjectDto.name,
        description: createProjectDto.description,
        teamId: createProjectDto.teamId,
        createdById: adminUser.id,
      });
    });

    it('should create project as team owner', async () => {
      mockTeamRepository.findById.mockResolvedValue(testTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockProjectRepository.create.mockResolvedValue(testProject);

      const result = await service.create(teamOwner, createProjectDto);

      expect(result.id).toBe(testProject.id);
      expect(mockTeamMemberRepository.isTeamOwner).toHaveBeenCalledWith(
        teamOwner.id,
        createProjectDto.teamId,
      );
    });

    it('should throw UnauthorizedException if creator is soft-deleted', async () => {
      const deletedUser = { ...adminUser, deletedAt: new Date() };

      await expect(
        service.create(deletedUser, createProjectDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if team does not exist', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(service.create(adminUser, createProjectDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if team is soft-deleted', async () => {
      const deletedTeam = { ...testTeam, deletedAt: new Date() };
      mockTeamRepository.findById.mockResolvedValue(deletedTeam);

      await expect(service.create(adminUser, createProjectDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not team owner or admin', async () => {
      mockTeamRepository.findById.mockResolvedValue(testTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamMemberRepository.isTeamMember.mockResolvedValue(false);

      await expect(
        service.create(regularUser, createProjectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is team member but not owner', async () => {
      mockTeamRepository.findById.mockResolvedValue(testTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);
      mockTeamMemberRepository.isTeamMember.mockResolvedValue(true);

      await expect(
        service.create(regularUser, createProjectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user tries to create in different team', async () => {
      const differentTeamUser = { ...teamOwner, teamId: 'team-2' };
      mockTeamRepository.findById.mockResolvedValue(testTeam);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);

      await expect(
        service.create(differentTeamUser, createProjectDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should return project for ADMIN', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);

      const result = await service.findById('project-1', adminUser);

      expect(result.id).toBe(testProject.id);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-1');
    });

    it('should return project for USER if it belongs to their team', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);

      const result = await service.findById('project-1', regularUser);

      expect(result.id).toBe(testProject.id);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(service.findById('project-1', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if USER tries to access project from different team', async () => {
      const differentTeamProject = { ...testProject, teamId: 'team-2' };
      mockProjectRepository.findById.mockResolvedValue(differentTeamProject);

      await expect(service.findById('project-1', regularUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdAndTeamId', () => {
    it('should return project if found', async () => {
      mockProjectRepository.findByIdAndTeamId.mockResolvedValue(testProject);

      const result = await service.findByIdAndTeamId('project-1', 'team-1');

      expect(result.id).toBe(testProject.id);
      expect(mockProjectRepository.findByIdAndTeamId).toHaveBeenCalledWith(
        'project-1',
        'team-1',
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepository.findByIdAndTeamId.mockResolvedValue(null);

      await expect(
        service.findByIdAndTeamId('project-1', 'team-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all projects for ADMIN', async () => {
      const projects = [testProject];
      mockProjectRepository.findAll.mockResolvedValue(projects);

      const result = await service.findAll(adminUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testProject.id);
      expect(mockProjectRepository.findAll).toHaveBeenCalled();
    });

    it('should return only team projects for USER', async () => {
      const projects = [testProject];
      mockProjectRepository.findByTeamId.mockResolvedValue(projects);

      const result = await service.findAll(regularUser);

      expect(result).toHaveLength(1);
      expect(mockProjectRepository.findByTeamId).toHaveBeenCalledWith('team-1');
    });

    it('should throw NotFoundException if USER has no team', async () => {
      const userWithoutTeam = { ...regularUser, teamId: null };

      await expect(service.findAll(userWithoutTeam)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByTeamId', () => {
    it('should return projects for team', async () => {
      const projects = [testProject];
      mockProjectRepository.findByTeamId.mockResolvedValue(projects);

      const result = await service.findByTeamId('team-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testProject.id);
    });
  });

  describe('findByCreatedById', () => {
    it('should return projects created by user', async () => {
      const projects = [testProject];
      mockProjectRepository.findByCreatedById.mockResolvedValue(projects);

      const result = await service.findByCreatedById('owner-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testProject.id);
    });
  });

  describe('update', () => {
    const updateProjectDto: UpdateProjectDto = {
      name: 'Updated Project',
      description: 'Updated description',
    };

    it('should update project as ADMIN', async () => {
      const updatedProject = { ...testProject, ...updateProjectDto };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await service.update(
        adminUser,
        'project-1',
        updateProjectDto,
      );

      expect(result.name).toBe(updateProjectDto.name);
      expect(mockProjectRepository.update).toHaveBeenCalledWith(
        'project-1',
        updateProjectDto,
      );
    });

    it('should update project as project creator', async () => {
      const updatedProject = { ...testProject, ...updateProjectDto };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await service.update(
        teamOwner,
        'project-1',
        updateProjectDto,
      );

      expect(result.name).toBe(updateProjectDto.name);
    });

    it('should update project as team owner', async () => {
      const updatedProject = { ...testProject, ...updateProjectDto };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await service.update(
        teamOwner,
        'project-1',
        updateProjectDto,
      );

      expect(result.name).toBe(updateProjectDto.name);
    });

    it('should throw UnauthorizedException if updater is soft-deleted', async () => {
      const deletedUser = { ...adminUser, deletedAt: new Date() };

      await expect(
        service.update(deletedUser, 'project-1', updateProjectDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(adminUser, 'project-1', updateProjectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if project is soft-deleted', async () => {
      const deletedProject = { ...testProject, deletedAt: new Date() };
      mockProjectRepository.findById.mockResolvedValue(deletedProject);

      await expect(
        service.update(adminUser, 'project-1', updateProjectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const unauthorizedUser = { ...regularUser, id: 'user-2' };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      await expect(
        service.update(unauthorizedUser, 'project-1', updateProjectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if teamId is in update DTO', async () => {
      const updateDtoWithTeamId = {
        ...updateProjectDto,
        teamId: 'team-2',
      } as any;
      mockProjectRepository.findById.mockResolvedValue(testProject);

      await expect(
        service.update(adminUser, 'project-1', updateDtoWithTeamId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no fields to update', async () => {
      const emptyUpdateDto: UpdateProjectDto = {};
      mockProjectRepository.findById.mockResolvedValue(testProject);

      await expect(
        service.update(adminUser, 'project-1', emptyUpdateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow update with only name', async () => {
      const nameOnlyDto: UpdateProjectDto = { name: 'New Name' };
      const updatedProject = { ...testProject, name: 'New Name' };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await service.update(adminUser, 'project-1', nameOnlyDto);

      expect(result.name).toBe('New Name');
    });

    it('should allow update with only description', async () => {
      const descOnlyDto: UpdateProjectDto = { description: 'New Description' };
      const updatedProject = { ...testProject, description: 'New Description' };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await service.update(adminUser, 'project-1', descOnlyDto);

      expect(result.description).toBe('New Description');
    });
  });

  describe('softDelete', () => {
    it('should soft delete project as ADMIN', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.hasActiveTasks.mockResolvedValue(false);
      mockProjectRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete(adminUser, 'project-1');

      expect(mockProjectRepository.softDelete).toHaveBeenCalledWith(
        'project-1',
      );
    });

    it('should soft delete project as project creator', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.hasActiveTasks.mockResolvedValue(false);
      mockProjectRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete(teamOwner, 'project-1');

      expect(mockProjectRepository.softDelete).toHaveBeenCalledWith(
        'project-1',
      );
    });

    it('should soft delete project as team owner', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(true);
      mockProjectRepository.hasActiveTasks.mockResolvedValue(false);
      mockProjectRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete(teamOwner, 'project-1');

      expect(mockProjectRepository.softDelete).toHaveBeenCalledWith(
        'project-1',
      );
    });

    it('should throw UnauthorizedException if deleter is soft-deleted', async () => {
      const deletedUser = { ...adminUser, deletedAt: new Date() };

      await expect(
        service.softDelete(deletedUser, 'project-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete(adminUser, 'project-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if project is soft-deleted', async () => {
      const deletedProject = { ...testProject, deletedAt: new Date() };
      mockProjectRepository.findById.mockResolvedValue(deletedProject);

      await expect(service.softDelete(adminUser, 'project-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const unauthorizedUser = { ...regularUser, id: 'user-2' };
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockTeamMemberRepository.isTeamOwner.mockResolvedValue(false);

      await expect(
        service.softDelete(unauthorizedUser, 'project-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if project has active tasks', async () => {
      mockProjectRepository.findById.mockResolvedValue(testProject);
      mockProjectRepository.hasActiveTasks.mockResolvedValue(true);

      await expect(service.softDelete(adminUser, 'project-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
