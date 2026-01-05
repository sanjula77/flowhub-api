import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';

/**
 * Task Status Enum
 * Defines the lifecycle states of a task
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

/**
 * Task Entity
 * Represents a task within a project and team
 * Follows Clean Architecture - pure domain model
 *
 * Relationships:
 * - Belongs to one Project (many-to-one)
 * - Belongs to one Team (many-to-one) - denormalized for performance
 * - Assigned to one User (many-to-one, nullable)
 */
@Entity('tasks')
@Index(['projectId'], { where: '"deleted_at" IS NULL' }) // Partial index for active project tasks
@Index(['teamId'], { where: '"deleted_at" IS NULL' }) // Partial index for active team tasks
@Index(['assignedToId'], { where: '"deleted_at" IS NULL' }) // Partial index for assigned user queries
@Index(['status'], { where: '"deleted_at" IS NULL' }) // Partial index for status queries
@Index(['projectId', 'status'], { where: '"deleted_at" IS NULL' }) // Composite index for project status queries
@Index(['teamId', 'status'], { where: '"deleted_at" IS NULL' }) // Composite index for team status queries
@Index(['assignedToId', 'status'], { where: '"deleted_at" IS NULL' }) // Composite index for user task queries
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Status enum (TODO → IN_PROGRESS → DONE)
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  // Project relationship (many-to-one: many tasks, one project)
  @ManyToOne(() => Project, (project) => project.tasks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  // Team relationship (many-to-one: many tasks, one team)
  // Denormalized for performance - can be derived from project, but stored for fast queries
  @ManyToOne(() => Team, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  // Assigned user relationship (many-to-one: many tasks, one user, nullable)
  @ManyToOne(() => User, (user) => user.assignedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId?: string;

  // Priority (optional, for future use)
  @Column({ type: 'integer', nullable: true })
  priority?: number; // 1 (highest) to 5 (lowest), or similar scale

  // Due date (optional)
  @Column({ type: 'timestamptz', nullable: true, name: 'due_date' })
  dueDate?: Date;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Optimistic locking version column
  // Automatically incremented on each update to prevent concurrent modification conflicts
  @VersionColumn({ name: 'version' })
  version: number;

  // Soft delete
  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  @Index()
  deletedAt?: Date;
}
