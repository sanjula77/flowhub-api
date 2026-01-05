import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull } from 'typeorm';
import { Invitation } from '../invitation.entity';
import { IInvitationRepository } from './invitation.repository.interface';
import { UserRole } from '../../users/user.entity';

/**
 * Invitation Repository Implementation
 * Implements IInvitationRepository using TypeORM
 */
@Injectable()
export class InvitationRepository implements IInvitationRepository {
  constructor(
    @InjectRepository(Invitation)
    private readonly typeOrmRepository: Repository<Invitation>,
  ) {}

  async create(invitationData: {
    email: string;
    token: string;
    role: UserRole;
    teamId: string;
    invitedById: string;
    expiresAt: Date;
  }): Promise<Invitation> {
    const invitation = this.typeOrmRepository.create(invitationData);
    return this.typeOrmRepository.save(invitation);
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.typeOrmRepository.findOne({
      where: { token, usedAt: IsNull() },
      relations: ['team', 'invitedBy'],
    });
  }

  async findActiveByEmailAndTeam(
    email: string,
    teamId: string,
  ): Promise<Invitation | null> {
    return this.typeOrmRepository.findOne({
      where: {
        email,
        teamId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()), // Not expired
      },
      relations: ['team', 'invitedBy'],
    });
  }

  async findByTeamId(teamId: string): Promise<Invitation[]> {
    return this.typeOrmRepository.find({
      where: { teamId },
      relations: ['team', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByInviterId(inviterId: string): Promise<Invitation[]> {
    return this.typeOrmRepository.find({
      where: { invitedById: inviterId },
      relations: ['team', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.typeOrmRepository.update(id, {
      usedAt: new Date(),
    });
  }

  async hasActiveInvitation(email: string, teamId: string): Promise<boolean> {
    const count = await this.typeOrmRepository.count({
      where: {
        email,
        teamId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    return count > 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.typeOrmRepository.delete({
      expiresAt: LessThan(new Date()),
      usedAt: IsNull(), // Only delete unused expired invitations
    });
    return result.affected || 0;
  }
}
