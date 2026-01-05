import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/users/user.entity';
import { Team } from '../src/teams/team.entity';
import * as bcrypt from 'bcrypt';

describe('Teams E2E Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let teamRepository: Repository<Team>;
  let adminToken: string;
  let userToken: string;
  let testTeam: Team;
  let adminUser: User;
  let regularUser: User;

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
      }),
    );
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    teamRepository = moduleFixture.get<Repository<Team>>(
      getRepositoryToken(Team),
    );

    // Create test team
    testTeam = teamRepository.create({
      name: 'Test Team',
      slug: 'test-team',
      adminUserId: null,
    });
    testTeam = await teamRepository.save(testTeam);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    adminUser = userRepository.create({
      email: 'admin@test.com',
      password: adminPassword,
      teamId: testTeam.id,
      role: UserRole.ADMIN,
    });
    adminUser = await userRepository.save(adminUser);

    // Update team with admin
    testTeam.adminUserId = adminUser.id;
    await teamRepository.save(testTeam);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    regularUser = userRepository.create({
      email: 'user@test.com',
      password: userPassword,
      teamId: testTeam.id,
      role: UserRole.USER,
    });
    regularUser = await userRepository.save(regularUser);

    // Login as admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    adminToken = adminLoginRes.body.accessToken;

    // Login as user
    const userLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'user123' });
    userToken = userLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await userRepository.delete({});
    await teamRepository.delete({});
    await app.close();
  });

  describe('GET /teams/me', () => {
    it('should return current user team', () => {
      return request(app.getHttpServer())
        .get('/teams/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('slug');
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer()).get('/teams/me').expect(401);
    });
  });

  describe('GET /teams', () => {
    it('should return all teams for ADMIN', () => {
      return request(app.getHttpServer())
        .get('/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .get('/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /teams', () => {
    it('should create team for ADMIN', () => {
      return request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Team',
          slug: 'new-team',
          description: 'A new team',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'New Team');
          expect(res.body).toHaveProperty('slug', 'new-team');
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New Team',
          slug: 'new-team-2',
        })
        .expect(403);
    });

    it('should return 409 if slug already exists', () => {
      return request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Team',
          slug: 'test-team', // Already exists
        })
        .expect(409);
    });
  });

  describe('DELETE /teams/:id', () => {
    it('should soft delete team if no active users', async () => {
      // Create empty team
      const emptyTeam = teamRepository.create({
        name: 'Empty Team',
        slug: 'empty-team',
      });
      const savedTeam = await teamRepository.save(emptyTeam);

      await request(app.getHttpServer())
        .delete(`/teams/${savedTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete
      const deletedTeam = await teamRepository.findOne({
        where: { id: savedTeam.id },
      });
      expect(deletedTeam.deletedAt).not.toBeNull();
    });

    it('should return 409 if team has active users', () => {
      return request(app.getHttpServer())
        .delete(`/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('active user');
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .delete(`/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
