import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { cleanDatabase, createTestUser, getAuthToken } from './test-helpers';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('Authentication Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
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

    // Get DataSource for database operations
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase(dataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanDatabase(dataSource);
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/signup', () => {
    it('should assign USER role to subsequent users', async () => {
      // Create first user (will be ADMIN)
      const firstUserPassword = await bcrypt.hash('password123', 10);
      await createTestUser(dataSource, {
        email: 'admin@example.com',
        password: firstUserPassword,
        role: 'ADMIN',
      });

      // Signup second user
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'user@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Doe',
        });

      if (response.status !== 201) {
        console.log('Signup error:', response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.role).toBe('USER');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should assign ADMIN role to first user', async () => {
      // No users exist, this should be the first user
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'first@example.com',
          password: 'Password123',
          firstName: 'First',
          lastName: 'User',
        });

      if (response.status !== 201) {
        console.log('Signup error:', response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body.user.role).toBe('ADMIN');
      expect(response.body.user.email).toBe('first@example.com');
    });

    it('should create personal team for new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'Password123',
          firstName: 'New',
          lastName: 'User',
        });

      if (response.status !== 201) {
        console.log('Signup error:', response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body.user.teamId).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const password = await bcrypt.hash('password123', 10);
      await createTestUser(dataSource, {
        email: 'existing@example.com',
        password,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'Password123',
          firstName: 'Duplicate',
          lastName: 'User',
        });

      if (response.status !== 409) {
        console.log('Expected 409, got:', response.status, response.body);
      }
      expect(response.status).toBe(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid',
          // Missing password, firstName, lastName
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const password = await bcrypt.hash('password123', 10);
      await createTestUser(dataSource, {
        email: 'test@example.com',
        password,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with wrong password', async () => {
      const password = await bcrypt.hash('password123', 10);
      await createTestUser(dataSource, {
        email: 'test@example.com',
        password,
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('Token expiration handling', () => {
    it('should reject expired token', async () => {
      const password = await bcrypt.hash('password123', 10);
      const user = await createTestUser(dataSource, {
        email: 'test@example.com',
        password,
        role: 'ADMIN',
      });

      // Create an expired token manually
      const expiredToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '-1h' }, // Token expired 1 hour ago
      );

      // Try to access protected route with expired token
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject request without token', async () => {
      // Try to access protected route without token
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should accept valid token', async () => {
      const password = await bcrypt.hash('password123', 10);
      await createTestUser(dataSource, {
        email: 'test@example.com',
        password,
        role: 'ADMIN',
      });

      const token = await getAuthToken(app, 'test@example.com', 'password123');

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
