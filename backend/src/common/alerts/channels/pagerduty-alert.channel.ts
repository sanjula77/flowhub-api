import { AlertSeverity } from '../alert-severity.enum';
import { Alert, AlertChannel } from '../alert.service';

/**
 * PagerDuty Alert Channel
 *
 * Sends alerts to PagerDuty for on-call management
 * Only supports CRITICAL severity (for immediate response)
 *
 * Configuration:
 * - Set PAGERDUTY_INTEGRATION_KEY environment variable
 *
 * PagerDuty is ideal for:
 * - Critical incidents requiring immediate response
 * - On-call rotation management
 * - Incident escalation
 */
export class PagerDutyAlertChannel implements AlertChannel {
  name = 'pagerduty';
  private readonly integrationKey: string;

  constructor() {
    this.integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY || '';
  }

  supportsSeverity(severity: AlertSeverity): boolean {
    // Only send CRITICAL alerts to PagerDuty
    return severity === AlertSeverity.CRITICAL;
  }

  async send(alert: Alert): Promise<void> {
    if (!this.integrationKey) {
      throw new Error('PAGERDUTY_INTEGRATION_KEY not configured');
    }

    const payload = {
      routing_key: this.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.id, // Use alert ID for deduplication
      payload: {
        summary: `${alert.severity.toUpperCase()}: ${alert.title}`,
        source: 'FlowHub Backend',
        severity: this.mapSeverity(alert.severity),
        custom_details: {
          alertId: alert.id,
          errorType: alert.errorType,
          message: alert.message,
          requestId: alert.requestId,
          metadata: alert.metadata,
          timestamp: alert.timestamp.toISOString(),
        },
      },
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PagerDuty API error: ${response.statusText} - ${error}`);
    }
  }

  /**
   * Map our severity levels to PagerDuty severity
   */
  private mapSeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'critical';
      case AlertSeverity.HIGH:
        return 'error';
      case AlertSeverity.MEDIUM:
        return 'warning';
      case AlertSeverity.LOW:
        return 'info';
      default:
        return 'info';
    }
  }
}
