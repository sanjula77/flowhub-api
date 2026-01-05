import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../users/user.entity';

/**
 * Team Member Role Enum
 * Defines roles within a team context
 */
export enum TeamMemberRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

/**
 * Team Member Entity
 * Represents the many-to-many relationship between users and teams
 * with team-level roles (OWNER, MEMBER)
 *
 * Design Principles:
 * - Least Privilege: Team roles are separate from platform roles
 * - Auditability: Tracks when users joined teams and their roles
 * - Scalability: Supports users being in multiple teams with different roles
 */
@Entity('team_members')
@Unique(['userId', 'teamId']) // Prevent duplicate memberships
@Index(['teamId', 'role']) // Index for team role queries
@Index(['userId']) // Index for user's teams queries
@Index(['teamId']) // Index for team members queries
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User relationship
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // Team relationship
  @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  // Team-level role (OWNER | MEMBER)
  @Column({
    type: 'enum',
    enum: TeamMemberRole,
    default: TeamMemberRole.MEMBER,
  })
  role: TeamMemberRole;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
