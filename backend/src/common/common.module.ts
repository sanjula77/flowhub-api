import { Module, Global } from '@nestjs/common';
import { WinstonModule, WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { loggerConfig } from './config/logger.config';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { AlertService } from './alerts/alert.service';
import { ConsoleAlertChannel } from './alerts/channels';
import { WinstonLogger } from 'nest-winston';

/**
 * Common Module
 *
 * Provides global services:
 * - LoggerService (centralized logging)
 * - MetricsService (application metrics)
 * - AlertService (alerting and notifications)
 *
 * This module is marked as @Global() so it can be imported once
 * and used throughout the application without re-importing.
 */
@Global()
@Module({
  imports: [WinstonModule.forRoot(loggerConfig)],
  controllers: [MetricsController],
  providers: [
    {
      provide: LoggerService,
      useFactory: (winstonLogger: WinstonLogger) => {
        return new LoggerService(winstonLogger);
      },
      inject: [WINSTON_MODULE_NEST_PROVIDER],
    },
    MetricsService,
    {
      provide: AlertService,
      useFactory: (logger: LoggerService) => {
        const alertService = new AlertService(logger);
        // Register console channel by default
        alertService.registerChannel(new ConsoleAlertChannel());
        return alertService;
      },
      inject: [LoggerService],
    },
  ],
  exports: [LoggerService, MetricsService, AlertService],
})
export class CommonModule {}
