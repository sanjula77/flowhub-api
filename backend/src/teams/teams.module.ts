import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamMember } from './team-member.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamRepository } from './repositories/team.repository';
import { TeamMemberRepository } from './repositories/team-member.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember]),
    forwardRef(() => UsersModule), // Import UsersModule to access IUserRepository (circular dependency)
  ],
  providers: [
    TeamsService,
    {
      provide: 'ITeamRepository', // Token for interface
      useClass: TeamRepository, // Implementation
    },
    {
      provide: 'ITeamMemberRepository', // Token for interface
      useClass: TeamMemberRepository, // Implementation
    },
    // Also provide concrete classes for direct injection if needed
    TeamRepository,
    TeamMemberRepository,
  ],
  controllers: [TeamsController],
  exports: [TeamsService, 'ITeamRepository', 'ITeamMemberRepository'],
})
export class TeamsModule {}
