import { AlertSeverity } from '../alert-severity.enum';
import { Alert, AlertChannel } from '../alert.service';

/**
 * Email Alert Channel
 *
 * Sends alerts via email
 * Supports all severity levels (configurable)
 *
 * Configuration:
 * - Set EMAIL_SMTP_HOST, EMAIL_SMTP_PORT
 * - Set EMAIL_FROM, EMAIL_TO
 * - Set EMAIL_USERNAME, EMAIL_PASSWORD (if auth required)
 *
 * Note: This is a basic implementation. In production, use a proper
 * email service like SendGrid, AWS SES, or Nodemailer.
 */
export class EmailAlertChannel implements AlertChannel {
  name = 'email';
  private readonly from: string;
  private readonly to: string[];
  private readonly smtpHost: string;
  private readonly smtpPort: number;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'alerts@flowhub.com';
    this.to = (process.env.EMAIL_TO || '').split(',').filter(Boolean);
    this.smtpHost = process.env.EMAIL_SMTP_HOST || 'localhost';
    this.smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);
  }

  supportsSeverity(severity: AlertSeverity): boolean {
    // Only send MEDIUM, HIGH, and CRITICAL via email
    // LOW and INFO go to dashboard only
    return (
      severity === AlertSeverity.MEDIUM ||
      severity === AlertSeverity.HIGH ||
      severity === AlertSeverity.CRITICAL
    );
  }

  async send(_alert: Alert): Promise<void> {
    if (this.to.length === 0) {
      throw new Error('EMAIL_TO not configured');
    }

    // Email sending would be implemented here
    // const subject = `[${_alert.severity.toUpperCase()}] ${_alert.title}`;
    // const body = this.formatEmailBody(_alert);
    await Promise.resolve(); // Placeholder for async email sending

    // In production, use a proper email library like Nodemailer
    // This is a placeholder implementation
    // TODO: Implement actual email sending using Nodemailer or similar service
    // See docs/deployment/ for email service configuration
  }

  private formatEmailBody(alert: Alert): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; }
          .content { padding: 20px; }
          .metadata { background-color: #f5f5f5; padding: 15px; margin: 10px 0; }
          .footer { color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.getSeverityEmoji(alert.severity)} ${alert.severity.toUpperCase()} Alert</h1>
        </div>
        <div class="content">
          <h2>${alert.title}</h2>
          <p>${alert.message}</p>
          
          <div class="metadata">
            <strong>Alert Details:</strong><br>
            <strong>ID:</strong> ${alert.id}<br>
            <strong>Type:</strong> ${alert.errorType}<br>
            <strong>Timestamp:</strong> ${alert.timestamp.toISOString()}<br>
            ${alert.requestId ? `<strong>Request ID:</strong> ${alert.requestId}<br>` : ''}
          </div>
          
          ${
            Object.keys(alert.metadata).length > 0
              ? `
            <div class="metadata">
              <strong>Metadata:</strong><br>
              <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
            </div>
          `
              : ''
          }
        </div>
        <div class="footer">
          <p>This is an automated alert from FlowHub Backend.</p>
          <p>Alert ID: ${alert.id}</p>
        </div>
      </body>
      </html>
    `;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '#dc3545'; // Red
      case AlertSeverity.HIGH:
        return '#fd7e14'; // Orange
      case AlertSeverity.MEDIUM:
        return '#ffc107'; // Yellow
      default:
        return '#6c757d'; // Gray
    }
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '🚨';
      case AlertSeverity.HIGH:
        return '⚠️';
      case AlertSeverity.MEDIUM:
        return '⚡';
      default:
        return 'ℹ️';
    }
  }
}
