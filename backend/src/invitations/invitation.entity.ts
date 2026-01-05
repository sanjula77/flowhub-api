import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Team } from '../teams/team.entity';
import { UserRole } from '../users/user.entity';

/**
 * Invitation Entity
 * Represents a user invitation sent by an admin
 * Follows Clean Architecture - pure domain model
 */
@Entity('invitations')
@Index(['token'], { unique: true }) // Unique token for security
@Index(['email', 'teamId'], { where: '"used_at" IS NULL' }) // Prevent duplicate active invitations
@Index(['expiresAt'], { where: '"used_at" IS NULL' }) // Index for expiration cleanup
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string; // Email of invited user

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string; // Secure invitation token

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole; // Role to assign to user

  @Column({ name: 'team_id' })
  teamId: string; // Team to assign user to

  // Relationship to team
  @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  // Relationship to inviter
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;

  @Column({ name: 'invited_by_id' })
  invitedById: string; // Admin who sent invitation

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date; // Token expiration date

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt?: Date; // When invitation was accepted (null = not used)

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
