import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskRepository } from './repositories/task.repository';
import { ProjectsModule } from '../projects/projects.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';

/**
 * Tasks Module
 * Configures task-related dependencies and exports
 * Follows Clean Architecture principles:
 * - Dependency Injection for loose coupling
 * - Repository Pattern for data access abstraction
 * - Module separation for clear boundaries
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]), // Register Task entity for TypeORM
    ProjectsModule, // Import ProjectsModule to access IProjectRepository
    TeamsModule, // Import TeamsModule to access ITeamRepository
    UsersModule, // Import UsersModule to access IUserRepository
  ],
  providers: [
    TasksService,
    {
      provide: 'ITaskRepository', // Token for interface (Dependency Inversion Principle)
      useClass: TaskRepository, // Implementation
    },
    // Also provide concrete class for direct injection if needed
    TaskRepository,
  ],
  controllers: [TasksController],
  exports: [TasksService, 'ITaskRepository'], // Export for use in other modules
})
export class TasksModule {}
