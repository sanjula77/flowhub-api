import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './audit-log.entity';
import { LoggerService } from '../common/logger/logger.service';

describe('AuditService', () => {
  let service: AuditService;
  let module: TestingModule;
  let auditLogRepository: Repository<AuditLog>;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('log', () => {
    it('should log audit event with correct action type', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.USER_CREATED,
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-1',
        metadata: { email: 'test@example.com' },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.log(AuditAction.USER_CREATED, 'user-1', 'User', 'user-1', {
        email: 'test@example.com',
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: AuditAction.USER_CREATED,
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-1',
        metadata: { email: 'test@example.com' },
        ipAddress: null,
        userAgent: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should store old and new values in metadata', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.USER_ROLE_CHANGED,
        userId: 'admin-1',
        entityType: 'User',
        entityId: 'user-1',
        metadata: {
          targetUserId: 'user-1',
          oldRole: 'USER',
          newRole: 'ADMIN',
          changedBy: 'admin-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.log(
        AuditAction.USER_ROLE_CHANGED,
        'admin-1',
        'User',
        'user-1',
        {
          targetUserId: 'user-1',
          oldRole: 'USER',
          newRole: 'ADMIN',
          changedBy: 'admin-1',
        },
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldRole: 'USER',
            newRole: 'ADMIN',
          }),
        }),
      );
    });

    it('should not fail main operation if audit logging fails', async () => {
      jest.spyOn(auditLogRepository, 'create').mockReturnValue({} as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        service.log(AuditAction.USER_CREATED, 'user-1', 'User', 'user-1', {}),
      ).resolves.not.toThrow();

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should accept null values for optional fields', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.USER_CREATED,
        userId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.log(AuditAction.USER_CREATED, null, null, null, null);

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: AuditAction.USER_CREATED,
        userId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });
    });
  });

  describe('logRoleChange', () => {
    it('should log role change with correct metadata', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.USER_ROLE_CHANGED,
        userId: 'admin-1',
        entityType: 'User',
        entityId: 'user-1',
        metadata: {
          targetUserId: 'user-1',
          oldRole: 'USER',
          newRole: 'ADMIN',
          changedBy: 'admin-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.logRoleChange(
        'user-1',
        'user-1',
        'USER',
        'ADMIN',
        'admin-1',
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_ROLE_CHANGED,
          userId: 'admin-1',
          entityType: 'User',
          entityId: 'user-1',
          metadata: expect.objectContaining({
            targetUserId: 'user-1',
            oldRole: 'USER',
            newRole: 'ADMIN',
            changedBy: 'admin-1',
          }),
        }),
      );
    });
  });

  describe('logTeamMemberRoleChange', () => {
    it('should log team member role change', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.TEAM_MEMBER_ROLE_CHANGED,
        userId: 'owner-1',
        entityType: 'TeamMember',
        entityId: 'team-1:user-1',
        metadata: {
          teamId: 'team-1',
          targetUserId: 'user-1',
          oldRole: 'MEMBER',
          newRole: 'OWNER',
          changedBy: 'owner-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.logTeamMemberRoleChange(
        'user-1',
        'team-1',
        'user-1',
        'MEMBER',
        'OWNER',
        'owner-1',
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TEAM_MEMBER_ROLE_CHANGED,
          entityId: 'team-1:user-1',
          metadata: expect.objectContaining({
            teamId: 'team-1',
            oldRole: 'MEMBER',
            newRole: 'OWNER',
          }),
        }),
      );
    });
  });

  describe('logTaskAssignment', () => {
    it('should log task assignment', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.TASK_ASSIGNED,
        userId: 'admin-1',
        entityType: 'Task',
        entityId: 'task-1',
        metadata: {
          taskId: 'task-1',
          oldAssigneeId: null,
          newAssigneeId: 'user-1',
          assignedBy: 'admin-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.logTaskAssignment('task-1', null, 'user-1', 'admin-1');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TASK_ASSIGNED,
          metadata: expect.objectContaining({
            newAssigneeId: 'user-1',
          }),
        }),
      );
    });

    it('should log task unassignment', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.TASK_UNASSIGNED,
        userId: 'admin-1',
        entityType: 'Task',
        entityId: 'task-1',
        metadata: {
          taskId: 'task-1',
          oldAssigneeId: 'user-1',
          newAssigneeId: null,
          assignedBy: 'admin-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.logTaskAssignment('task-1', 'user-1', null, 'admin-1');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TASK_UNASSIGNED,
        }),
      );
    });
  });

  describe('logProjectDeletion', () => {
    it('should log project deletion', async () => {
      const mockAuditLog = {
        id: 'log-1',
        action: AuditAction.PROJECT_DELETED,
        userId: 'admin-1',
        entityType: 'Project',
        entityId: 'project-1',
        metadata: {
          projectId: 'project-1',
          projectName: 'Test Project',
          deletedBy: 'admin-1',
        },
        createdAt: new Date(),
      };

      jest
        .spyOn(auditLogRepository, 'create')
        .mockReturnValue(mockAuditLog as any);
      jest
        .spyOn(auditLogRepository, 'save')
        .mockResolvedValue(mockAuditLog as any);

      await service.logProjectDeletion('project-1', 'Test Project', 'admin-1');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PROJECT_DELETED,
          metadata: expect.objectContaining({
            projectName: 'Test Project',
          }),
        }),
      );
    });
  });
});
