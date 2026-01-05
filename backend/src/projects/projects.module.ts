import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectRepository } from './repositories/project.repository';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    TeamsModule, // Import TeamsModule to access ITeamRepository
    UsersModule, // Import UsersModule to access UsersService
  ],
  providers: [
    ProjectsService,
    {
      provide: 'IProjectRepository', // Token for interface
      useClass: ProjectRepository, // Implementation
    },
    // Also provide concrete class for direct injection if needed
    ProjectRepository,
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService, 'IProjectRepository'],
})
export class ProjectsModule {}
