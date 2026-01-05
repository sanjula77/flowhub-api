import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../src/users/user.entity';
import { Team } from '../../src/teams/team.entity';
import { TeamMember } from '../../src/teams/team-member.entity';
import { Project } from '../../src/projects/project.entity';
import { Task } from '../../src/tasks/task.entity';
import { Invitation } from '../../src/invitations/invitation.entity';
import { AuditLog } from '../../src/audit/audit-log.entity';

/**
 * Test Database Module
 * Configures TypeORM for integration tests with a separate test database
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'flowhub',
      password: process.env.DB_PASSWORD || 'flowhub',
      database: process.env.DB_NAME || 'flowhub_test_db',
      entities: [User, Team, TeamMember, Invitation, Project, Task, AuditLog],
      synchronize: true, // Auto-create schema for tests
      dropSchema: false, // Don't drop schema, we'll clean manually
      logging: false, // Disable SQL logging in tests
    }),
  ],
})
export class TestDatabaseModule {}
