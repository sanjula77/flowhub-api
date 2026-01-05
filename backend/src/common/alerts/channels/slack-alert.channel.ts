import { AlertSeverity } from '../alert-severity.enum';
import { Alert, AlertChannel } from '../alert.service';

/**
 * Slack Alert Channel
 *
 * Sends alerts to Slack webhook
 * Supports HIGH and CRITICAL severity levels
 *
 * Configuration:
 * - Set SLACK_WEBHOOK_URL environment variable
 * - Set SLACK_CHANNEL environment variable (optional)
 */
export class SlackAlertChannel implements AlertChannel {
  name = 'slack';
  private readonly webhookUrl: string;
  private readonly channel: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.channel = process.env.SLACK_CHANNEL || '#alerts';
  }

  supportsSeverity(severity: AlertSeverity): boolean {
    // Only send HIGH and CRITICAL to Slack
    return (
      severity === AlertSeverity.HIGH || severity === AlertSeverity.CRITICAL
    );
  }

  async send(alert: Alert): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);

    const payload = {
      channel: this.channel,
      username: 'FlowHub Alerts',
      icon_emoji: emoji,
      attachments: [
        {
          color,
          title: `${emoji} ${alert.severity.toUpperCase()}: ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Error Type',
              value: alert.errorType,
              short: true,
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true,
            },
            {
              title: 'Timestamp',
              value: alert.timestamp.toISOString(),
              short: true,
            },
            ...(alert.requestId
              ? [
                  {
                    title: 'Request ID',
                    value: alert.requestId,
                    short: true,
                  },
                ]
              : []),
            ...(Object.keys(alert.metadata).length > 0
              ? [
                  {
                    title: 'Metadata',
                    value: `\`\`\`${JSON.stringify(alert.metadata, null, 2)}\`\`\``,
                    short: false,
                  },
                ]
              : []),
          ],
          footer: 'FlowHub Backend',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'danger'; // Red
      case AlertSeverity.HIGH:
        return 'warning'; // Yellow
      default:
        return '#36a64f'; // Green
    }
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return ':rotating_light:';
      case AlertSeverity.HIGH:
        return ':warning:';
      default:
        return ':information_source:';
    }
  }
}
