import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import {
  AlertSeverity,
  ErrorType,
  ERROR_SEVERITY_MAP,
} from './alert-severity.enum';
import { getAlertRule } from './alert-rules.config';
import { maskSensitiveData } from '../utils/data-masking.util';

/**
 * Alert Interface
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  errorType: ErrorType;
  title: string;
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Alert Channel Interface
 */
export interface AlertChannel {
  name: string;
  send(alert: Alert): Promise<void>;
  supportsSeverity(severity: AlertSeverity): boolean;
}

/**
 * Alert Service
 *
 * Centralized alerting service that:
 * - Classifies alerts by severity
 * - Applies alert rules and thresholds
 * - Prevents alert noise (deduplication, rate limiting)
 * - Masks sensitive data
 * - Routes alerts to appropriate channels
 *
 * Best Practices:
 * - Only alert on actionable issues
 * - Use appropriate severity levels
 * - Implement cooldown periods
 * - Mask sensitive data
 * - Provide context in alerts
 */
@Injectable()
export class AlertService {
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly lastTriggered: Map<string, Date> = new Map();
  private readonly channels: AlertChannel[] = [];
  private readonly deduplicationWindow = 300000; // 5 minutes

  constructor(private readonly logger: LoggerService) {}

  /**
   * Register an alert channel
   */
  registerChannel(channel: AlertChannel): void {
    this.channels.push(channel);
    this.logger.log(
      `Alert channel registered: ${channel.name}`,
      'AlertService',
    );
  }

  /**
   * Send an alert
   * 
   * This method:
   * 1. Classifies the alert by severity
   * 2. Checks alert rules and thresholds
  3. Prevents duplicate alerts (deduplication)
   * 4. Masks sensitive data
   * 5. Routes to appropriate channels
   */
  async sendAlert(
    errorType: ErrorType,
    title: string,
    message: string,
    metadata: Record<string, any> = {},
    requestId?: string,
  ): Promise<void> {
    // Get severity from error type
    const severity = ERROR_SEVERITY_MAP[errorType] || AlertSeverity.LOW;

    // Get alert rule
    const rule = getAlertRule(errorType);
    if (!rule) {
      // Rule not found or disabled - log but don't alert
      this.logger.debug(
        `Alert rule not found or disabled for: ${errorType}`,
        'AlertService',
      );
      return;
    }

    // Check if alert should trigger based on rule
    // For simplicity, we'll check the rule here
    // In production, you'd evaluate metrics against thresholds
    const alertKey = `${errorType}:${title}`;
    const lastTriggered = this.lastTriggered.get(alertKey);

    // Check deduplication (prevent duplicate alerts within window)
    if (this.isDuplicate(alertKey, lastTriggered)) {
      this.logger.debug(
        `Duplicate alert suppressed: ${alertKey}`,
        'AlertService',
      );
      return;
    }

    // Mask sensitive data in metadata
    const maskedMetadata = maskSensitiveData(metadata, {
      strategy: 'full',
    });

    // Mask sensitive data in message
    const maskedMessage = this.maskMessage(message);

    // Create alert
    const alert: Alert = {
      id: this.generateAlertId(),
      severity,
      errorType,
      title: this.maskMessage(title),
      message: maskedMessage,
      metadata: maskedMetadata,
      timestamp: new Date(),
      requestId,
      resolved: false,
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.lastTriggered.set(alertKey, new Date());

    // Log alert
    this.logger.logWithRequestId(
      `Alert triggered: ${title}`,
      requestId || 'system',
      severity === AlertSeverity.CRITICAL ? 'error' : 'warn',
      'AlertService',
      {
        alertId: alert.id,
        severity,
        errorType,
        metadata: maskedMetadata,
      },
    );

    // Send to appropriate channels
    await this.routeAlert(alert);

    // Cleanup old alerts (prevent memory leak)
    this.cleanupOldAlerts();
  }

  /**
   * Route alert to appropriate channels based on severity
   */
  private async routeAlert(alert: Alert): Promise<void> {
    const eligibleChannels = this.channels.filter((channel) =>
      channel.supportsSeverity(alert.severity),
    );

    if (eligibleChannels.length === 0) {
      this.logger.warn(
        `No alert channels configured for severity: ${alert.severity}`,
        'AlertService',
      );
      return;
    }

    // Send to all eligible channels in parallel
    const sendPromises = eligibleChannels.map((channel) =>
      channel.send(alert).catch((error) => {
        this.logger.error(
          `Failed to send alert to channel ${channel.name}`,
          error,
          'AlertService',
        );
      }),
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Check if alert is duplicate (within deduplication window)
   */
  private isDuplicate(alertKey: string, lastTriggered?: Date): boolean {
    if (!lastTriggered) {
      return false;
    }

    const timeSinceLastAlert = Date.now() - lastTriggered.getTime();
    return timeSinceLastAlert < this.deduplicationWindow;
  }

  /**
   * Mask sensitive data in message string
   */
  private maskMessage(message: string): string {
    // Use data masking utility to mask sensitive patterns
    const { maskSensitiveString } = require('../utils/data-masking.util');
    return maskSensitiveString(message, { strategy: 'full' });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup old alerts (older than 24 hours)
   */
  private cleanupOldAlerts(): void {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp.getTime() < twentyFourHoursAgo) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.severity === severity && !alert.resolved,
    );
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.log(`Alert resolved: ${alertId}`, 'AlertService', {
        alertId,
        errorType: alert.errorType,
      });
    }
  }
}
