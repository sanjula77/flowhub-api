import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { InvitationsModule } from './invitations/invitations.module';
import { CommonModule } from './common/common.module';
import { User } from './users/user.entity';
import { Team } from './teams/team.entity';
import { TeamMember } from './teams/team-member.entity';
import { Invitation } from './invitations/invitation.entity';
import { Project } from './projects/project.entity';
import { Task } from './tasks/task.entity';
import { AuditLog } from './audit/audit-log.entity';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'flowhub',
      password: process.env.DB_PASSWORD || 'flowhub',
      database: process.env.DB_NAME || 'flowhub_db',
      entities: [User, Team, TeamMember, Invitation, Project, Task, AuditLog],
      synchronize: true, // Set to false in production
    }),
    AuthModule,
    UsersModule,
    TeamsModule,
    InvitationsModule,
    ProjectsModule,
    TasksModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
