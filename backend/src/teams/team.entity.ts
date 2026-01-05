import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';

/**
 * Team Entity
 * Represents an organizational unit (company, department, etc.)
 * Follows Clean Architecture - pure domain model
 */
@Entity('teams')
@Index(['slug'], { where: '"deleted_at" IS NULL' }) // Partial index for active teams
@Index(['adminUserId'], { where: '"deleted_at" IS NULL' }) // Index for admin lookups
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string; // URL-friendly identifier (e.g., "engineering")

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Admin/Owner relationship
  // The user who owns/manages this team
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser?: User;

  @Column({ name: 'admin_user_id', nullable: true })
  adminUserId?: string;

  // One-to-Many: One team has many users
  @OneToMany(() => User, (user) => user.team, { cascade: false })
  users: User[];

  // One-to-Many: One team has many projects
  @OneToMany(() => Project, (project) => project.team, { cascade: false })
  projects: Project[];

  // One-to-Many: One team has many tasks
  @OneToMany(() => Task, (task) => task.team, { cascade: false })
  tasks: Task[];

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Soft delete
  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  @Index()
  deletedAt?: Date;
}
