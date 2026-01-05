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
import { TaskStatus } from '../../src/tasks/task.entity';

describe('Task Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let projectCreatorToken: string;
  let assigneeToken: string;
  let teamOwnerToken: string;
  let unauthorizedUserToken: string;
  let projectId: string;
  let assigneeId: string;

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

    // Create team
    const team = await createTestTeam(dataSource, {
      name: 'Test Team',
      slug: 'test-team',
      description: 'Test team',
    });

    // Create users
    const creatorPassword = await bcrypt.hash('password123', 10);
    const creator = await createTestUser(dataSource, {
      email: 'creator@example.com',
      password: creatorPassword,
      role: 'USER',
    });

    const assigneePassword = await bcrypt.hash('password123', 10);
    const assignee = await createTestUser(dataSource, {
      email: 'assignee@example.com',
      password: assigneePassword,
      role: 'USER',
    });
    assigneeId = assignee.id;

    const ownerPassword = await bcrypt.hash('password123', 10);
    const owner = await createTestUser(dataSource, {
      email: 'owner@example.com',
      password: ownerPassword,
      role: 'USER',
    });

    const unauthorizedPassword = await bcrypt.hash('password123', 10);
    await createTestUser(dataSource, {
      email: 'unauthorized@example.com',
      password: unauthorizedPassword,
      role: 'USER',
    });

    // Assign team memberships
    await createTestTeamMember(dataSource, {
      userId: creator.id,
      teamId: team.id,
      role: TeamMemberRole.MEMBER,
    });

    await createTestTeamMember(dataSource, {
      userId: assignee.id,
      teamId: team.id,
      role: TeamMemberRole.MEMBER,
    });

    await createTestTeamMember(dataSource, {
      userId: owner.id,
      teamId: team.id,
      role: TeamMemberRole.OWNER,
    });

    // Update users with teamId
    const userRepository = dataSource.getRepository(
      require('../../src/users/user.entity').User,
    );
    await userRepository.update(creator.id, { teamId: team.id });
    await userRepository.update(assignee.id, { teamId: team.id });
    await userRepository.update(owner.id, { teamId: team.id });
    // Unauthorized user has no team

    // Create project
    const projectRepository = dataSource.getRepository(
      require('../../src/projects/project.entity').Project,
    );
    const project = projectRepository.create({
      name: 'Test Project',
      description: 'Test project',
      teamId: team.id,
      createdById: creator.id,
    });
    const savedProject = await projectRepository.save(project);
    projectId = savedProject.id;

    // Get tokens
    projectCreatorToken = await getAuthToken(
      app,
      'creator@example.com',
      'password123',
    );
    assigneeToken = await getAuthToken(
      app,
      'assignee@example.com',
      'password123',
    );
    teamOwnerToken = await getAuthToken(
      app,
      'owner@example.com',
      'password123',
    );
    unauthorizedUserToken = await getAuthToken(
      app,
      'unauthorized@example.com',
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

  describe('POST /tasks', () => {
    it('should create task', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${projectCreatorToken}`)
        .send({
          title: 'New Task',
          description: 'Task description',
          projectId: projectId,
          status: TaskStatus.TODO,
        })
        .expect(201);

      expect(response.body.title).toBe('New Task');
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.status).toBe(TaskStatus.TODO);
    });

    it('should prevent unauthorized user from creating task', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .send({
          title: 'Unauthorized Task',
          description: 'Should fail',
          projectId: projectId,
        })
        .expect(403);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign task to user', async () => {
      // Create task first
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Task to Assign',
        description: 'Will be assigned',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/assign`)
        .set('Authorization', `Bearer ${projectCreatorToken}`)
        .send({
          assignedToId: assigneeId,
        })
        .expect(200);

      expect(response.body.assignedToId).toBe(assigneeId);
    });

    it('should prevent unauthorized assignment', async () => {
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Protected Task',
        description: 'Should not be assigned',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/assign`)
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .send({
          assignedToId: assigneeId,
        })
        .expect(403);
    });
  });

  describe('PATCH /tasks/:id/status', () => {
    it('should move task between statuses', async () => {
      // Create and assign task
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Status Task',
        description: 'Will change status',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        assignedToId: assigneeId,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      // Update status to IN_PROGRESS
      let response = await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/status`)
        .set('Authorization', `Bearer ${assigneeToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);

      // Update status to DONE
      response = await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/status`)
        .set('Authorization', `Bearer ${assigneeToken}`)
        .send({
          status: TaskStatus.DONE,
        })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.DONE);
    });

    it('should prevent unauthorized status updates', async () => {
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Protected Status Task',
        description: 'Should not be updated',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        assignedToId: assigneeId,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/status`)
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(403);
    });

    it('should allow team owner to update status', async () => {
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Owner Update Task',
        description: 'Updated by owner',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${savedTask.id}/status`)
        .set('Authorization', `Bearer ${teamOwnerToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should soft-delete task', async () => {
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Task to Delete',
        description: 'Will be deleted',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      await request(app.getHttpServer())
        .delete(`/tasks/${savedTask.id}`)
        .set('Authorization', `Bearer ${projectCreatorToken}`)
        .expect(204);

      // Verify soft delete
      const deletedTask = await taskRepository.findOne({
        where: { id: savedTask.id },
        withDeleted: true,
      });
      expect(deletedTask?.deletedAt).toBeDefined();
    });

    it('should prevent unauthorized deletion', async () => {
      const taskRepository = dataSource.getRepository(
        require('../../src/tasks/task.entity').Task,
      );
      const creator = await dataSource
        .getRepository(require('../../src/users/user.entity').User)
        .findOne({ where: { email: 'creator@example.com' } });
      const task = taskRepository.create({
        title: 'Protected Task',
        description: 'Should not be deleted',
        projectId: projectId,
        teamId: (await dataSource
          .getRepository(require('../../src/projects/project.entity').Project)
          .findOne({ where: { id: projectId } }))!.teamId,
        createdById: creator!.id,
        status: TaskStatus.TODO,
      });
      const savedTask = await taskRepository.save(task);

      await request(app.getHttpServer())
        .delete(`/tasks/${savedTask.id}`)
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .expect(403);
    });
  });
});
