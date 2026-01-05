import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { LoggerService } from '../common/logger/logger.service';

/**
 * Audit Service
 * Industry-grade audit logging for compliance and security
 *
 * Tracks:
 * - Role changes (prevent escalation)
 * - Task assignments
 * - Project deletions
 * - All critical operations
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Log an audit event
   */
  async log(
    action: AuditAction,
    userId: string | null,
    entityType: string | null = null,
    entityId: string | null = null,
    metadata: Record<string, any> | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action,
        userId,
        entityType,
        entityId,
        metadata,
        ipAddress,
        userAgent,
      });

      await this.auditLogRepository.save(auditLog);

      // Also log to application logger for immediate visibility
      this.logger.log(`Audit: ${action}`, 'AuditService', {
        userId,
        entityType,
        entityId,
        metadata,
      });
    } catch (error) {
      // Don't throw - audit logging should never break the main flow
      // But log the error for monitoring
      this.logger.error('Failed to create audit log', error, 'AuditService', {
        action,
        userId,
        entityType,
        entityId,
      });
    }
  }

  /**
   * Log role change (critical security event)
   */
  async logRoleChange(
    userId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log(
      AuditAction.USER_ROLE_CHANGED,
      changedBy,
      'User',
      targetUserId,
      {
        targetUserId,
        oldRole,
        newRole,
        changedBy,
      },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Log team member role change
   */
  async logTeamMemberRoleChange(
    userId: string,
    teamId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log(
      AuditAction.TEAM_MEMBER_ROLE_CHANGED,
      changedBy,
      'TeamMember',
      `${teamId}:${targetUserId}`,
      {
        teamId,
        targetUserId,
        oldRole,
        newRole,
        changedBy,
      },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Log task assignment change
   */
  async logTaskAssignment(
    taskId: string,
    oldAssigneeId: string | null,
    newAssigneeId: string | null,
    assignedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const action = newAssigneeId
      ? AuditAction.TASK_ASSIGNED
      : AuditAction.TASK_UNASSIGNED;
    await this.log(
      action,
      assignedBy,
      'Task',
      taskId,
      {
        taskId,
        oldAssigneeId,
        newAssigneeId,
        assignedBy,
      },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Log project deletion (critical event)
   */
  async logProjectDeletion(
    projectId: string,
    projectName: string,
    deletedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log(
      AuditAction.PROJECT_DELETED,
      deletedBy,
      'Project',
      projectId,
      {
        projectId,
        projectName,
        deletedBy,
      },
      ipAddress,
      userAgent,
    );
  }
}
