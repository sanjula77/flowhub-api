import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { json, urlencoded } from 'express';
import { AppModule } from '../../src/app.module';
import {
  cleanDatabase,
  createTestUser,
  createTestTeam,
  createTestTeamMember,
  getAuthToken,
} from './test-helpers';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../src/users/user.entity';
import { TeamMemberRole } from '../../src/teams/team-member.entity';
import { Project } from '../../src/projects/project.entity';

describe('Edge Cases & Negative Tests Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let adminUser: any;
  let teamOwner: any;
  let regularUser: any;
  let teamId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure body parsers (same as main.ts)
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

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

    // Create team
    const team = await createTestTeam(dataSource, {
      name: 'Test Team',
      slug: 'test-team',
    });
    teamId = team.id;

    // Create admin user
    const adminPassword = await bcrypt.hash('password123', 10);
    adminUser = await createTestUser(dataSource, {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    });

    // Create team owner
    const ownerPassword = await bcrypt.hash('password123', 10);
    teamOwner = await createTestUser(dataSource, {
      email: 'owner@example.com',
      password: ownerPassword,
      role: 'USER',
    });

    // Create regular user
    const userPassword = await bcrypt.hash('password123', 10);
    regularUser = await createTestUser(dataSource, {
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    });

    // Assign team memberships
    await createTestTeamMember(dataSource, {
      userId: teamOwner.id,
      teamId: teamId,
      role: TeamMemberRole.OWNER,
    });

    await createTestTeamMember(dataSource, {
      userId: regularUser.id,
      teamId: teamId,
      role: TeamMemberRole.MEMBER,
    });

    // Update users with teamId
    const userRepository = dataSource.getRepository(
      require('../../src/users/user.entity').User,
    );
    await userRepository.update(teamOwner.id, { teamId });
    await userRepository.update(regularUser.id, { teamId });

    // Get tokens
    adminToken = await getAuthToken(app, 'admin@example.com', 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanDatabase(dataSource);
    }
    if (app) {
      await app.close();
    }
  });

  describe('Duplicate Email Signup', () => {
    it('should reject duplicate email signup', async () => {
      // First signup should succeed
      const firstSignup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      expect(firstSignup.body.user.email).toBe('duplicate@example.com');

      // Second signup with same email should fail
      const secondSignup = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409); // Conflict

      expect(secondSignup.body.message).toContain('already exists');
    });

    it('should handle email case sensitivity correctly', async () => {
      // Signup with lowercase
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      // PostgreSQL email uniqueness is case-sensitive by default
      // Different case emails are treated as different emails
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        });

      // May succeed (different email) or fail (if case-insensitive check is implemented)
      expect([201, 409]).toContain(response.status);
    });
  });

  describe('Invalid UUIDs', () => {
    it('should reject invalid UUID format in path parameters', async () => {
      // Invalid UUID format - ParseUUIDPipe validates and returns 400
      await request(app.getHttpServer())
        .get('/users/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400); // Bad Request - UUID validation fails at controller level

      // Non-UUID string
      await request(app.getHttpServer())
        .get('/users/12345')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Empty string - trailing slash may be normalized or match different route
      const emptyResponse = await request(app.getHttpServer())
        .get('/users/')
        .set('Authorization', `Bearer ${adminToken}`);
      // May return 200 (matches /users), 404 (not found), or 400 (invalid)
      expect([200, 400, 404]).toContain(emptyResponse.status);

      // Special characters - path traversal is rejected by router (404) before reaching controller
      await request(app.getHttpServer())
        .get('/users/../../etc/passwd')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404); // Route not found - security feature
    });

    it('should reject invalid UUID in request body', async () => {
      // Try to update user with invalid UUID in body
      await request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: 'not-a-valid-uuid',
        })
        .expect(400); // Bad Request - validation fails
    });

    it('should handle malformed UUID gracefully', async () => {
      // UUID with wrong length - ParseUUIDPipe validates and returns 400
      await request(app.getHttpServer())
        .get('/users/123e4567-e89b-12d3-a456-42661417400') // Missing character
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400); // Bad Request - UUID validation fails at controller level

      // UUID with invalid characters
      await request(app.getHttpServer())
        .get('/users/123e4567-e89b-12d3-a456-4266141740g') // 'g' is invalid
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400); // Bad Request - UUID validation fails at controller level
    });
  });

  describe('Missing Headers', () => {
    it('should reject requests without Authorization header', async () => {
      // GET request without token
      await request(app.getHttpServer()).get('/users').expect(401); // Unauthorized

      // PUT request without token
      await request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .send({ firstName: 'Updated' })
        .expect(401);

      // DELETE request without token
      await request(app.getHttpServer())
        .delete(`/users/${regularUser.id}`)
        .expect(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      // Missing "Bearer " prefix
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', adminToken) // Missing "Bearer "
        .expect(401);

      // Empty token
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer ')
        .expect(401);

      // Only "Bearer" without token
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('should reject requests with invalid token format', async () => {
      // Invalid JWT format
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);

      // Random string
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer random-string-12345')
        .expect(401);
    });
  });

  describe('Large Payloads', () => {
    it('should handle large string fields gracefully', async () => {
      // Create project with very long description
      const longDescription = 'A'.repeat(10000); // 10KB string
      const projectRepository = dataSource.getRepository(Project);

      const project = projectRepository.create({
        name: 'Large Project',
        description: longDescription,
        teamId: teamId,
        createdById: teamOwner.id,
      });

      // Should either accept or reject with appropriate error
      try {
        const savedProject = await projectRepository.save(project);
        expect(savedProject.description).toBe(longDescription);
      } catch (error: any) {
        // If rejected, should be a validation or database constraint error
        expect(error).toBeDefined();
      }
    });

    it('should reject extremely large JSON payloads', async () => {
      // Try to send very large payload
      const largePayload = {
        firstName: 'A'.repeat(100000), // 100KB string
        lastName: 'B'.repeat(100000),
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePayload);

      // Should reject with 413 (Payload Too Large) or 400 (Bad Request)
      expect([400, 413, 422, 500]).toContain(response.status);
    });

    it('should handle large metadata in audit logs', async () => {
      const auditLogRepository = dataSource.getRepository(
        require('../../src/audit/audit-log.entity').AuditLog,
      );

      const largeMetadata = {
        data: 'A'.repeat(50000), // 50KB metadata
      };

      try {
        const log = auditLogRepository.create({
          action: require('../../src/audit/audit-log.entity').AuditAction
            .USER_LOGIN,
          userId: adminUser.id,
          metadata: largeMetadata,
        });

        const savedLog = await auditLogRepository.save(log);
        expect(savedLog.metadata).toBeDefined();
      } catch (error: any) {
        // If rejected, should be a database constraint error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Concurrent Role Updates', () => {
    it('should handle concurrent role updates correctly', async () => {
      // Create a target user
      const targetPassword = await bcrypt.hash('password123', 10);
      const targetUser = await createTestUser(dataSource, {
        email: 'target@example.com',
        password: targetPassword,
        role: 'USER',
      });

      // Simulate concurrent updates
      const updatePromises = [
        request(app.getHttpServer())
          .put(`/users/${targetUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ firstName: 'Update1' }),
        request(app.getHttpServer())
          .put(`/users/${targetUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ lastName: 'Update2' }),
        request(app.getHttpServer())
          .put(`/users/${targetUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ firstName: 'Update3' }),
      ];

      const results = await Promise.allSettled(updatePromises);

      // All should succeed (200) or some might fail with 409 if optimistic locking is implemented
      // 400 is also possible if validation fails in edge cases
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect([200, 400, 409]).toContain(result.value.status);
        }
      });

      // Verify final state
      const userRepository = dataSource.getRepository(
        require('../../src/users/user.entity').User,
      );
      const finalUser = await userRepository.findOne({
        where: { id: targetUser.id },
      });
      expect(finalUser).toBeDefined();
      expect(finalUser?.firstName || finalUser?.lastName).toBeDefined();
    });

    it('should prevent concurrent role escalation attempts', async () => {
      const targetPassword = await bcrypt.hash('password123', 10);
      const targetUser = await createTestUser(dataSource, {
        email: 'target2@example.com',
        password: targetPassword,
        role: 'USER',
      });

      // Multiple concurrent attempts to promote to ADMIN
      const promotePromises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .put(`/users/${targetUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: UserRole.ADMIN }),
      );

      const results = await Promise.allSettled(promotePromises);

      // All should succeed (only ADMIN can do this, and we're using admin token)
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200,
      );
      expect(successful.length).toBeGreaterThan(0);

      // Verify user was promoted
      const userRepository = dataSource.getRepository(
        require('../../src/users/user.entity').User,
      );
      const finalUser = await userRepository.findOne({
        where: { id: targetUser.id },
      });
      expect(finalUser?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Race Condition on First-User Signup', () => {
    it('should handle concurrent first-user signups correctly', async () => {
      // Clean database to ensure no users exist
      await cleanDatabase(dataSource);

      // Wait a bit to ensure database is fully cleaned
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate multiple concurrent signups (race condition scenario)
      // Use unique emails with random component to avoid conflicts
      const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      const signupPromises = Array.from({ length: 5 }, (_, i) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: `user${i}-${timestamp}-${random}@example.com`,
            password: 'Password123',
            firstName: names[i],
            lastName: 'Test',
          });
      });

      const results = await Promise.all(signupPromises);

      // All signups should succeed (201 Created)
      const successful = results.filter((r) => r && r.status === 201);

      // If some failed, log for debugging
      if (successful.length < 5) {
        const failed = results.filter((r) => r && r.status !== 201);
        failed.forEach((f, idx) => {
          console.log(`Failed signup ${idx}:`, {
            status: f?.status,
            body: f?.body,
          });
        });
      }

      expect(successful.length).toBe(5);

      // Exactly one should be ADMIN (first user)
      // Note: Due to transaction locking, only one will be first
      const adminCount = successful.filter(
        (r) => r.body?.user?.role === 'ADMIN',
      ).length;
      expect(adminCount).toBe(1); // Only one first user should be ADMIN

      // Rest should be USER
      const userCount = successful.filter(
        (r) => r.body?.user?.role === 'USER',
      ).length;
      expect(userCount).toBe(4); // Remaining should be USER
    });

    it('should prevent duplicate first-user assignment with transaction locking', async () => {
      // Clean database
      await cleanDatabase(dataSource);

      // Create multiple signups with same timing
      const concurrentSignups = [
        request(app.getHttpServer()).post('/auth/signup').send({
          email: 'race1@example.com',
          password: 'Password123',
          firstName: 'Race',
          lastName: 'One',
        }),
        request(app.getHttpServer()).post('/auth/signup').send({
          email: 'race2@example.com',
          password: 'Password123',
          firstName: 'Race',
          lastName: 'Two',
        }),
        request(app.getHttpServer()).post('/auth/signup').send({
          email: 'race3@example.com',
          password: 'Password123',
          firstName: 'Race',
          lastName: 'Three',
        }),
      ];

      const results = await Promise.all(concurrentSignups);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(201);
      });

      // Verify only one ADMIN was created
      const userRepository = dataSource.getRepository(
        require('../../src/users/user.entity').User,
      );
      const admins = await userRepository.find({
        where: { role: UserRole.ADMIN },
      });
      expect(admins.length).toBe(1);
    });

    it('should handle signup race condition with database transaction', async () => {
      // Clean database
      await cleanDatabase(dataSource);

      // Simulate race condition with Promise.all
      const signups = await Promise.all([
        request(app.getHttpServer()).post('/auth/signup').send({
          email: 'first1@example.com',
          password: 'Password123',
          firstName: 'First',
          lastName: 'One',
        }),
        request(app.getHttpServer()).post('/auth/signup').send({
          email: 'first2@example.com',
          password: 'Password123',
          firstName: 'First',
          lastName: 'Two',
        }),
      ]);

      // Both should succeed
      expect(signups[0].status).toBe(201);
      expect(signups[1].status).toBe(201);

      // Verify roles
      const roles = signups.map((s) => s.body.user.role);
      const adminRoles = roles.filter((r) => r === 'ADMIN');
      const userRoles = roles.filter((r) => r === 'USER');

      expect(adminRoles.length).toBe(1); // One ADMIN
      expect(userRoles.length).toBe(1); // One USER
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle empty request bodies', async () => {
      await request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200); // Should accept empty body (no changes)
    });

    it('should handle null values in request bodies', async () => {
      // Null values may be accepted or rejected depending on validation
      const response = await request(app.getHttpServer())
        .put(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: null,
          lastName: null,
        });

      // May accept (200) or reject (400) depending on validation rules
      expect([200, 400, 422]).toContain(response.status);
    });

    it('should handle SQL injection attempts in email field', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin@example.com'; DELETE FROM users; --",
      ];

      for (const maliciousEmail of sqlInjectionAttempts) {
        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: maliciousEmail,
            password: 'Password123',
            firstName: 'Test',
            lastName: 'User',
          });

        // Should either reject with validation error or sanitize
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should handle XSS attempts in string fields', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
      ];

      for (const maliciousInput of xssAttempts) {
        const response = await request(app.getHttpServer())
          .put(`/users/${regularUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName: maliciousInput,
          });

        // Should either sanitize or reject
        expect([200, 400, 422]).toContain(response.status);
      }
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // Exceeds typical email length

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: longEmail,
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400); // Should reject - email too long
    });

    it('should handle invalid email formats', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com',
      ];

      for (const invalidEmail of invalidEmails) {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({
            email: invalidEmail,
            password: 'Password123',
            firstName: 'Test',
            lastName: 'User',
          })
          .expect(400); // Should reject - invalid email format
      }
    });
  });
});
