import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    CommonModule, // For LoggerService
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
