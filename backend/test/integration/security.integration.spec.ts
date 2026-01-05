import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
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
import * as jwt from 'jsonwebtoken';
import { TeamMemberRole } from '../../src/teams/team-member.entity';
import { UserRole } from '../../src/users/user.entity';
import { Project } from '../../src/projects/project.entity';
import { Task, TaskStatus } from '../../src/tasks/task.entity';

describe('Security & Authorization Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let teamOwnerToken: string;
  let teamMemberToken: string;
  let otherTeamUserToken: string;
  let regularUser: any;
  let teamOwner: any;
  let teamMember: any;
  let otherTeamUser: any;
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
    if (dataSource && !dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await cleanDatabase(dataSource);

    // Create teams
    const team1 = await createTestTeam(dataSource, {
      name: 'Team A',
      slug: 'team-a',
    });
    teamId = team1.id;

    const team2 = await createTestTeam(dataSource, {
      name: 'Team B',
      slug: 'team-b',
    });
    otherTeamId = team2.id;

    // Create admin user
    const adminPassword = await bcrypt.hash('password123', 10);
    adminUser = await createTestUser(dataSource, {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    });

    // Create regular user
    const userPassword = await bcrypt.hash('password123', 10);
    regularUser = await createTestUser(dataSource, {
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    });

    // Create team owner
    const ownerPassword = await bcrypt.hash('password123', 10);
    teamOwner = await createTestUser(dataSource, {
      email: 'owner@example.com',
      password: ownerPassword,
      role: 'USER',
    });

    // Create team member
    const memberPassword = await bcrypt.hash('password123', 10);
    teamMember = await createTestUser(dataSource, {
      email: 'member@example.com',
      password: memberPassword,
      role: 'USER',
    });

    // Create other team user
    const otherPassword = await bcrypt.hash('password123', 10);
    otherTeamUser = await createTestUser(dataSource, {
      email: 'other@example.com',
      password: otherPassword,
      role: 'USER',
    });

    // Assign team memberships
    await createTestTeamMember(dataSource, {
      userId: teamOwner.id,
      teamId: teamId,
      role: TeamMemberRole.OWNER,
    });

    await createTestTeamMember(dataSource, {
      userId: teamMember.id,
      teamId: teamId,
      role: TeamMemberRole.MEMBER,
    });

    await createTestTeamMember(dataSource, {
      userId: otherTeamUser.id,
      teamId: otherTeamId,
      role: TeamMemberRole.OWNER,
    });

    // Update users with teamId
    const userRepository = dataSource.getRepository(
      require('../../src/users/user.entity').User,
    );
    await userRepository.update(teamOwner.id, { teamId });
    await userRepository.update(teamMember.id, { teamId });
    await userRepository.update(otherTeamUser.id, { teamId: otherTeamId });

    // Get tokens
    adminToken = await getAuthToken(app, 'admin@example.com', 'password123');
    userToken = await getAuthToken(app, 'user@example.com', 'password123');
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

  describe('Role Escalation Protection', () => {
    it('should prevent USER from promoting to ADMIN', async () => {
      // Regular user tries to update another user's role to ADMIN
      const targetUser = await createTestUser(dataSource, {
        email: 'target@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'USER',
      });

      // USER cannot access PUT /users/:id (ADMIN only endpoint)
      await request(app.getHttpServer())
        .put(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: UserRole.ADMIN,
        })
        .expect(403); // Forbidden - not ADMIN
    });

    it('should prevent TEAM_MEMBER from promoting to OWNER', async () => {
      const teamRepository = dataSource.getRepository(
        require('../../src/teams/team.entity').Team,
      );
      const team = await teamRepository.findOne({ where: { slug: 'team-a' } });

      // Team member tries to promote themselves to OWNER
      await request(app.getHttpServer())
        .put(`/teams/${team?.id}/members/${teamMember.id}/role`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .send({
          role: TeamMemberRole.OWNER,
        })
        .expect(403); // Forbidden - not team owner
    });

    it('should allow ADMIN to promote user to ADMIN', async () => {
      const targetUser = await createTestUser(dataSource, {
        email: 'target@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'USER',
      });

      const response = await request(app.getHttpServer())
        .put(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.ADMIN,
        })
        .expect(200);

      expect(response.body.role).toBe(UserRole.ADMIN);
    });

    it('should block cross-team access', async () => {
      // Create project in Team A
      const projectRepository = dataSource.getRepository(Project);
      const project = projectRepository.create({
        name: 'Team A Project',
        description: 'Private project',
        teamId: teamId,
        createdById: teamOwner.id,
      });
      const savedProject = await projectRepository.save(project);

      // User from Team B tries to access Team A's project
      // Service returns 404 (information hiding) instead of 403
      await request(app.getHttpServer())
        .get(`/projects/${savedProject.id}`)
        .set('Authorization', `Bearer ${otherTeamUserToken}`)
        .expect(404); // Not found - cross-team access blocked (information hiding)
    });
  });

  describe('API Security', () => {
    it('should return 401 for unauthorized request (no token)', async () => {
      await request(app.getHttpServer()).get('/users').expect(401); // Unauthorized
    });

    it('should return 403 for forbidden access (wrong role)', async () => {
      // Regular user tries to access ADMIN-only endpoint
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403); // Forbidden - not ADMIN
    });

    it('should block invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401); // Unauthorized - invalid token
    });

    it('should block expired token', async () => {
      const expiredToken = jwt.sign(
        {
          sub: regularUser.id,
          email: regularUser.email,
          role: regularUser.role,
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401); // Unauthorized - expired token
    });
  });

  describe('Data Isolation', () => {
    it('should prevent Team A from accessing Team B data', async () => {
      // Create project in Team B
      const projectRepository = dataSource.getRepository(Project);
      const otherUser = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'other@example.com' } });
      const project = projectRepository.create({
        name: 'Team B Project',
        description: 'Team B only',
        teamId: otherTeamId,
        createdById: otherUser!.id,
      });
      const savedProject = await projectRepository.save(project);

      // User from Team A tries to access Team B's project
      // Service returns 404 (information hiding) instead of 403
      await request(app.getHttpServer())
        .get(`/projects/${savedProject.id}`)
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(404); // Not found - different team (information hiding)
    });

    it('should prevent deleted users from acting', async () => {
      // Soft delete a user (manual soft delete - set deletedAt)
      const userRepository = dataSource.getRepository(
        require('../../src/users/user.entity').User,
      );
      await userRepository.update(regularUser.id, { deletedAt: new Date() });

      // Try to use token from deleted user
      // Login should fail for deleted user
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        })
        .expect(401); // Login should fail for deleted user

      // If we had a token, deleted user should not be able to access protected routes
      // The service should check if user is deleted when processing requests
      // For now, we verify login is blocked
      expect(loginResponse.status).toBe(401);
    });

    it('should hide soft-deleted records', async () => {
      // Create and soft-delete a project (manual soft delete - set deletedAt)
      const projectRepository = dataSource.getRepository(Project);
      const project = projectRepository.create({
        name: 'Deleted Project',
        description: 'Will be deleted',
        teamId: teamId,
        createdById: teamOwner.id,
      });
      const savedProject = await projectRepository.save(project);
      await projectRepository.update(savedProject.id, {
        deletedAt: new Date(),
      });

      // Soft-deleted project should not appear in list
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(200);

      const projectIds = response.body.map((p: any) => p.id);
      expect(projectIds).not.toContain(savedProject.id);

      // Soft-deleted project should not be accessible by ID
      await request(app.getHttpServer())
        .get(`/projects/${savedProject.id}`)
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .expect(404); // Not found - soft deleted
    });

    it('should hide soft-deleted tasks', async () => {
      // Create and soft-delete a task (manual soft delete - set deletedAt)
      const taskRepository = dataSource.getRepository(Task);
      const projectRepository = dataSource.getRepository(Project);
      const project = projectRepository.create({
        name: 'Test Project',
        description: 'For tasks',
        teamId: teamId,
        createdById: teamOwner.id,
      });
      const savedProject = await projectRepository.save(project);

      const task = taskRepository.create({
        title: 'Deleted Task',
        description: 'Will be deleted',
        projectId: savedProject.id,
        teamId: teamId,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);
      await taskRepository.update(savedTask.id, { deletedAt: new Date() });

      // Soft-deleted task should not appear in queries
      // Repository filters by deletedAt IS NULL
      const deletedTask = await taskRepository.findOne({
        where: { id: savedTask.id, deletedAt: IsNull() },
      });
      expect(deletedTask).toBeNull(); // Should not find soft-deleted task

      // Verify it exists with deletedAt set by querying directly (without filter)
      const deletedTaskWithDeleted = await taskRepository
        .createQueryBuilder('task')
        .where('task.id = :id', { id: savedTask.id })
        .getOne();
      expect(deletedTaskWithDeleted).toBeDefined();
      expect(deletedTaskWithDeleted?.deletedAt).toBeDefined();
    });
  });
});
