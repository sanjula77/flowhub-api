import { DataSource } from 'typeorm';
import request from 'supertest';
import { User } from '../../src/users/user.entity';
import { Team } from '../../src/teams/team.entity';
import { TeamMember } from '../../src/teams/team-member.entity';
import { Project } from '../../src/projects/project.entity';
import { Task } from '../../src/tasks/task.entity';
import { Invitation } from '../../src/invitations/invitation.entity';
import { AuditLog } from '../../src/audit/audit-log.entity';
import type { INestApplication } from '@nestjs/common';

/**
 * Test Helpers
 * Utilities for integration tests
 */

/**
 * Cleans all test data from the database
 * Deletes records in order to respect foreign key constraints
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource || !dataSource.isInitialized) {
    return;
  }

  // Delete in order to respect foreign key constraints
  // Delete child entities first, then parent entities
  // Use query builder to delete all records (avoids TRUNCATE foreign key issues)
  await dataSource.createQueryBuilder().delete().from(Task).execute();
  await dataSource.createQueryBuilder().delete().from(Project).execute();
  await dataSource.createQueryBuilder().delete().from(TeamMember).execute();
  await dataSource.createQueryBuilder().delete().from(Invitation).execute();
  await dataSource.createQueryBuilder().delete().from(AuditLog).execute();
  await dataSource.createQueryBuilder().delete().from(User).execute();
  await dataSource.createQueryBuilder().delete().from(Team).execute();
}

/**
 * Creates a test user
 * If teamId is not provided, creates a personal team for the user
 */
export async function createTestUser(
  dataSource: DataSource,
  userData: {
    email: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    teamId?: string;
  },
): Promise<User> {
  const userRepository = dataSource.getRepository(User);
  const teamRepository = dataSource.getRepository(Team);

  let teamId = userData.teamId;

  // Create a personal team if teamId is not provided
  if (!teamId) {
    const emailLocalPart = userData.email.split('@')[0];
    const teamSlug = `personal-${emailLocalPart}-${Date.now()}`;
    const team = await teamRepository.save(
      teamRepository.create({
        name: `${userData.firstName || emailLocalPart}'s Team`,
        slug: teamSlug,
        description: 'Personal team',
      }),
    );
    teamId = team.id;
  }

  const user = userRepository.create({
    email: userData.email,
    password: userData.password,
    role: userData.role || 'USER',
    firstName: userData.firstName || 'Test',
    lastName: userData.lastName || 'User',
    teamId: teamId,
  });
  return await userRepository.save(user);
}

/**
 * Create a test team
 * Generates unique slug if not provided
 */
export async function createTestTeam(
  dataSource: DataSource,
  teamData: {
    name: string;
    slug?: string;
    description?: string;
  },
): Promise<Team> {
  const teamRepository = dataSource.getRepository(Team);

  // Generate unique slug if not provided
  let slug = teamData.slug;
  if (!slug) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    slug = `${teamData.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${random}`;
  }
  // If slug is provided, use it as-is (don't make it unique - allows testing duplicates)

  const team = teamRepository.create({
    ...teamData,
    slug,
  });
  return await teamRepository.save(team);
}

/**
 * Create a team member
 */
export async function createTestTeamMember(
  dataSource: DataSource,
  memberData: {
    userId: string;
    teamId: string;
    role: string;
  },
): Promise<TeamMember> {
  const memberRepository = dataSource.getRepository(TeamMember);
  const member = memberRepository.create(memberData);
  return await memberRepository.save(member);
}

/**
 * Get authentication token for a user
 */
export async function getAuthToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return (response.body as { accessToken: string }).accessToken;
}
