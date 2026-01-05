import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  cleanDatabase,
  createTestUser,
  createTestTeam,
  createTestTeamMember,
  getAuthToken,
} from './test-helpers';
import * as bcrypt from 'bcrypt';
import { TeamMemberRole } from '../../src/teams/team-member.entity';

describe('Project Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let teamOwnerToken: string;
  let teamMemberToken: string;
  let otherTeamUserToken: string;
  let teamId: string;
  let otherTeamId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Wait for database connection
    if (dataSource && !dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await cleanDatabase(dataSource);

    // Create teams
    const team1 = await createTestTeam(dataSource, {
      name: 'Team 1',
      slug: 'team-1',
      description: 'First team',
    });
    teamId = team1.id;

    const team2 = await createTestTeam(dataSource, {
      name: 'Team 2',
      slug: 'team-2',
      description: 'Second team',
    });
    otherTeamId = team2.id;

    // Create users
    const ownerPassword = await bcrypt.hash('password123', 10);
    const owner = await createTestUser(dataSource, {
      email: 'owner@example.com',
      password: ownerPassword,
      role: 'USER',
    });

    const memberPassword = await bcrypt.hash('password123', 10);
    const member = await createTestUser(dataSource, {
      email: 'member@example.com',
      password: memberPassword,
      role: 'USER',
    });

    const otherUserPassword = await bcrypt.hash('password123', 10);
    const otherUser = await createTestUser(dataSource, {
      email: 'other@example.com',
      password: otherUserPassword,
      role: 'USER',
    });

    // Assign team memberships
    await createTestTeamMember(dataSource, {
      userId: owner.id,
      teamId: teamId,
      role: TeamMemberRole.OWNER,
    });

    await createTestTeamMember(dataSource, {
      userId: member.id,
      teamId: teamId,
      role: TeamMemberRole.MEMBER,
    });

    await createTestTeamMember(dataSource, {
      userId: otherUser.id,
      teamId: otherTeamId,
      role: TeamMemberRole.OWNER,
    });

    // Update users with teamId
    const userRepository = dataSource.getRepository(
      require('../../src/users/user.entity').User,
    );
    await userRepository.update(owner.id, { teamId });
    await userRepository.update(member.id, { teamId });
    await userRepository.update(otherUser.id, { teamId: otherTeamId });

    // Get tokens
    teamOwnerToken = await getAuthToken(
      app,
      'owner@example.com',
      'password123',
    );
    teamMemberToken = await getAuthToken(
      app,
      'member@example.com',
      'password123',
    );
    otherTeamUserToken = await getAuthToken(
      app,
      'other@example.com',
      'password123',
    );
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanDatabase(dataSource);
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /projects', () => {
    it('should create project under team', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .send({
          name: 'Test Project',
          description: 'Test project description',
          teamId: teamId,
        })
        .expect(201);

      expect(response.body.name).toBe('Test Project');
      expect(response.body.teamId).toBe(teamId);
      expect(response.body.createdById).toBeDefined();
    });

    it('should block team member from creating project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          name: 'Member Project',
          description: 'Created by member',
          teamId: teamId,
        })
        .expect(403);

      expect(response.body.message).toContain(
        'team owners or system administrators',
      );
    });

    it('should block access outside team', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${otherTeamUserToken}`)
        .send({
          name: 'Unauthorized Project',
          description: 'Should fail',
          teamId: teamId, // Trying to create in different team
        })
        .expect(403);
    });
  });

  describe('GET /projects', () => {
    it('should return projects for user team', async () => {
      // Create a project
      const projectRepository = dataSource.getRepository(
        require('../../src/projects/project.entity').Project,
      );
      const project = projectRepository.create({
        name: 'Test Project',
        description: 'Test',
        teamId: teamId,
        createdById: (await dataSource
          .getRepository(require('../../src/users/user.entity').User)
          .findOne({ where: { email: 'owner@example.com' } }))!.id,
      });
      await projectRepository.save(project);

      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should block access to other team projects', async () => {
      // Create project in other team
      const projectRepository = dataSource.getRepository(
        require('../../src/projects/project.entity').Project,
      );
      const otherUser = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'other@example.com' } });
      const project = projectRepository.create({
        name: 'Other Team Project',
        description: 'Other team',
        teamId: otherTeamId,
        createdById: otherUser!.id,
      });
      await projectRepository.save(project);

      // Try to access from different team
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(200);

      // Should not see other team's project
      const hasOtherProject = response.body.some(
        (p: any) => p.name === 'Other Team Project',
      );
      expect(hasOtherProject).toBe(false);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should soft-delete project', async () => {
      // Create project
      const projectRepository = dataSource.getRepository(
        require('../../src/projects/project.entity').Project,
      );
      const owner = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'owner@example.com' } });
      const project = projectRepository.create({
        name: 'To Delete',
        description: 'Will be deleted',
        teamId: teamId,
        createdById: owner!.id,
      });
      const savedProject = await projectRepository.save(project);

      // Soft delete
      await request(app.getHttpServer())
        .delete(`/projects/${savedProject.id}`)
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(204);

      // Verify soft delete (deletedAt should be set)
      const deletedProject = await projectRepository.findOne({
        where: { id: savedProject.id },
        withDeleted: true,
      });
      expect(deletedProject?.deletedAt).toBeDefined();
    });

    it('should prevent unauthorized deletion', async () => {
      const projectRepository = dataSource.getRepository(
        require('../../src/projects/project.entity').Project,
      );
      const owner = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'owner@example.com' } });
      const project = projectRepository.create({
        name: 'Protected Project',
        description: 'Should not be deleted',
        teamId: teamId,
        createdById: owner!.id,
      });
      const savedProject = await projectRepository.save(project);

      // Try to delete from different team
      await request(app.getHttpServer())
        .delete(`/projects/${savedProject.id}`)
        .set('Authorization', `Bearer ${otherTeamUserToken}`)
        .expect(403);
    });
  });
});
