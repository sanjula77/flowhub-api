import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Audit Log Action Types
 * Tracks all critical system actions for compliance and security
 */
export enum AuditAction {
  // User actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_LOGIN = 'USER_LOGIN',

  // Team actions
  TEAM_CREATED = 'TEAM_CREATED',
  TEAM_UPDATED = 'TEAM_UPDATED',
  TEAM_DELETED = 'TEAM_DELETED',
  TEAM_MEMBER_ADDED = 'TEAM_MEMBER_ADDED',
  TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED',
  TEAM_MEMBER_ROLE_CHANGED = 'TEAM_MEMBER_ROLE_CHANGED',

  // Project actions
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',

  // Task actions
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UNASSIGNED = 'TASK_UNASSIGNED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
}

/**
 * Audit Log Entity
 * Stores all critical system actions for compliance, security, and debugging
 * Industry-standard: All role changes, deletions, and sensitive operations are logged
 */
@Entity('audit_logs')
@Index(['action', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  @Index()
  userId: string | null; // User who performed the action

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'entity_type' })
  entityType: string | null; // e.g., 'User', 'Project', 'Task'

  @Column({ type: 'uuid', nullable: true, name: 'entity_id' })
  entityId: string | null; // ID of the affected entity

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Additional context (old values, new values, etc.)

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Index()
  createdAt: Date;
}
