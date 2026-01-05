import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../src/users/user.entity';
import { Team } from '../src/teams/team.entity';
import * as bcrypt from 'bcrypt';

describe('Users E2E Tests', () => {
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
    // Cleanup
    await userRepository.delete({});
    await teamRepository.delete({});
    await app.close();
  });

  describe('GET /users/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', 'user@test.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('GET /users', () => {
    it('should return all users for ADMIN', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /users', () => {
    it('should create user for ADMIN', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          teamId: testTeam.id,
          role: UserRole.USER,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', 'newuser@test.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newuser2@test.com',
          password: 'password123',
          teamId: testTeam.id,
        })
        .expect(403);
    });

    it('should return 409 if email already exists', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@test.com', // Already exists
          password: 'password123',
          teamId: testTeam.id,
        })
        .expect(409);
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'password123',
          teamId: testTeam.id,
        })
        .expect(400);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user for ADMIN', () => {
      return request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Updated');
        });
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(403);
    });
  });

  describe('PUT /users/me', () => {
    it('should update own profile', () => {
      return request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'My',
          lastName: 'Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('My');
        });
    });

    it('should not allow changing role', () => {
      return request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: UserRole.ADMIN, // Should be ignored
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(UserRole.USER); // Role unchanged
        });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft delete user for ADMIN', async () => {
      // Create a user to delete
      const userToDelete = userRepository.create({
        email: 'todelete@test.com',
        password: await bcrypt.hash('password123', 10),
        teamId: testTeam.id,
        role: UserRole.USER,
      });
      const savedUser = await userRepository.save(userToDelete);

      await request(app.getHttpServer())
        .delete(`/users/${savedUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete
      const deletedUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });
      expect(deletedUser.deletedAt).not.toBeNull();
    });

    it('should return 403 for non-ADMIN user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
