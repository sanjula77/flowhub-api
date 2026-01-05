import { AlertSeverity } from '../alert-severity.enum';
import { Alert, AlertChannel } from '../alert.service';

/**
 * Console Alert Channel
 *
 * Sends alerts to console (useful for development and testing)
 * All severity levels are supported
 */
export class ConsoleAlertChannel implements AlertChannel {
  name = 'console';

  supportsSeverity(_severity: AlertSeverity): boolean {
    return true; // Support all severity levels
  }

  send(alert: Alert): Promise<void> {
    const timestamp = alert.timestamp.toISOString();
    const severityIcon = this.getSeverityIcon(alert.severity);

    console.error(`
╔══════════════════════════════════════════════════════════════╗
║ ${severityIcon} ALERT: ${alert.severity.toUpperCase().padEnd(47)} ║
╠══════════════════════════════════════════════════════════════╣
║ ID:        ${alert.id.padEnd(48)} ║
║ Type:      ${alert.errorType.padEnd(48)} ║
║ Title:     ${alert.title.substring(0, 48).padEnd(48)} ║
║ Time:      ${timestamp.padEnd(48)} ║
║ RequestID: ${(alert.requestId || 'N/A').padEnd(48)} ║
╠══════════════════════════════════════════════════════════════╣
║ ${alert.message.substring(0, 60).padEnd(60)} ║
╠══════════════════════════════════════════════════════════════╣
║ Metadata:                                                    ║
║ ${JSON.stringify(alert.metadata, null, 2).substring(0, 60).padEnd(60)} ║
╚══════════════════════════════════════════════════════════════╝
    `);
    return Promise.resolve();
  }

  private getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '🚨';
      case AlertSeverity.HIGH:
        return '⚠️';
      case AlertSeverity.MEDIUM:
        return '⚡';
      case AlertSeverity.LOW:
        return 'ℹ️';
      default:
        return '📢';
    }
  }
}
