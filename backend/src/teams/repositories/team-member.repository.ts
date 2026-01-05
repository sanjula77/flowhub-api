import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TeamMember, TeamMemberRole } from '../team-member.entity';
import type { ITeamMemberRepository } from './team-member.repository.interface';

/**
 * Team Member Repository
 * Implements team member data access operations
 * Follows Repository Pattern
 */
@Injectable()
export class TeamMemberRepository implements ITeamMemberRepository {
  constructor(
    @InjectRepository(TeamMember)
    private readonly repository: Repository<TeamMember>,
  ) {}

  async create(
    memberData: {
      userId: string;
      teamId: string;
      role: TeamMemberRole;
    },
    entityManager?: EntityManager,
  ): Promise<TeamMember> {
    const repository = entityManager
      ? entityManager.getRepository(TeamMember)
      : this.repository;

    const member = repository.create(memberData);
    return repository.save(member);
  }

  async findByUserAndTeam(
    userId: string,
    teamId: string,
  ): Promise<TeamMember | null> {
    return this.repository.findOne({
      where: { userId, teamId },
      relations: ['user', 'team'],
    });
  }

  async findByTeamId(teamId: string): Promise<TeamMember[]> {
    return this.repository.find({
      where: { teamId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserId(userId: string): Promise<TeamMember[]> {
    return this.repository.find({
      where: { userId },
      relations: ['team'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateRole(id: string, role: TeamMemberRole): Promise<TeamMember> {
    await this.repository.update(id, { role });
    const member = await this.repository.findOne({ where: { id } });
    if (!member) {
      throw new Error('Team member not found');
    }
    return member;
  }

  async remove(userId: string, teamId: string): Promise<void> {
    await this.repository.delete({ userId, teamId });
  }

  async isTeamOwner(userId: string, teamId: string): Promise<boolean> {
    // Debug: Raw SQL check
    const rawQuery = `
      SELECT id, user_id, team_id, role, length(role::text) as role_len, ascii(substring(role::text, 1, 1)) as role_ascii
      FROM team_members 
      WHERE user_id = $1 AND team_id = $2
    `;
    const rawResult = await this.repository.query(rawQuery, [userId, teamId]);
    console.log('Raw DB Result:', rawResult);

    // Debug: Check column type
    const schemaQuery = `
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'team_members' AND column_name = 'role'
    `;
    const schemaResult = await this.repository.query(schemaQuery);
    console.log('Schema Info:', schemaResult);

    const member = await this.repository.findOne({
      where: { userId, teamId, role: TeamMemberRole.OWNER },
    });

    return !!member;
  }

  async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    const member = await this.repository.findOne({
      where: { userId, teamId },
    });
    return member !== null;
  }
}
