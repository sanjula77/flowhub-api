import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { RolesGuard } from './roles.guard';
import { Wso2AuthGuard } from './wso2-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule,
    TeamsModule, // Import TeamsModule to access ITeamRepository
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, Wso2AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, Wso2AuthGuard],
})
export class AuthModule {}
