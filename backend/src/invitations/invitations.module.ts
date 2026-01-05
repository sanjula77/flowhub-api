import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Invitation } from './invitation.entity';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationRepository } from './repositories/invitation.repository';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule, // For IUserRepository
    TeamsModule, // For ITeamRepository
    AuthModule, // For AuthService (password hashing, token generation)
  ],
  providers: [
    InvitationsService,
    {
      provide: 'IInvitationRepository',
      useClass: InvitationRepository,
    },
    InvitationRepository,
  ],
  controllers: [InvitationsController],
  exports: [InvitationsService, 'IInvitationRepository'],
})
export class InvitationsModule {}
