import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';

/**
 * Project Entity
 * Represents a project within a team
 * Follows Clean Architecture - pure domain model
 *
 * Relationships:
 * - Belongs to one Team (many-to-one)
 * - Created by one User (many-to-one)
 */
@Entity('projects')
@Index(['teamId'], { where: '"deleted_at" IS NULL' }) // Partial index for active team projects
@Index(['createdById'], { where: '"deleted_at" IS NULL' }) // Partial index for creator lookups
@Index(['teamId', 'deletedAt'], { where: '"deleted_at" IS NULL' }) // Composite index for common team queries
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Team relationship (many-to-one: many projects, one team)
  @ManyToOne(() => Team, (team) => team.projects, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  // Creator relationship (many-to-one: many projects, one creator)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  // One-to-Many: One project has many tasks
  @OneToMany(() => Task, (task) => task.project, { cascade: false })
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
