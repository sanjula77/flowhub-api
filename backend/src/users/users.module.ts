import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserRepository } from './repositories/user.repository';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => TeamsModule), // Import TeamsModule to use TeamsService (circular dependency)
  ],
  providers: [
    UsersService,
    {
      provide: 'IUserRepository', // Token for interface
      useClass: UserRepository, // Implementation
    },
    // Also provide concrete class for direct injection if needed
    UserRepository,
  ],
  controllers: [UsersController],
  exports: [UsersService, 'IUserRepository'],
})
export class UsersModule {}
