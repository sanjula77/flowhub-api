import { AlertSeverity, ErrorType } from './alert-severity.enum';

/**
 * Alert Rules Configuration
 *
 * Defines thresholds and conditions for triggering alerts.
 * These rules help avoid alert noise by setting appropriate thresholds.
 */

export interface AlertRule {
  errorType: ErrorType;
  severity: AlertSeverity;
  threshold: number | string;
  duration?: number; // Duration in seconds before alert triggers
  condition: 'greater_than' | 'less_than' | 'equals' | 'contains';
  enabled: boolean;
  cooldown?: number; // Cooldown period in seconds (prevents duplicate alerts)
}

/**
 * Default Alert Rules
 *
 * These rules define when alerts should trigger based on metrics and conditions.
 * Adjust thresholds based on your SLA and business requirements.
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  // ========================================================================
  // CRITICAL ALERTS
  // ========================================================================

  {
    errorType: ErrorType.SYSTEM_DOWN,
    severity: AlertSeverity.CRITICAL,
    threshold: 0,
    condition: 'equals',
    enabled: true,
    cooldown: 300, // 5 minutes
  },

  {
    errorType: ErrorType.DATABASE_CONNECTION_LOST,
    severity: AlertSeverity.CRITICAL,
    threshold: 1,
    condition: 'greater_than',
    duration: 30, // Alert after 30 seconds of connection loss
    enabled: true,
    cooldown: 600, // 10 minutes
  },

  {
    errorType: ErrorType.SECURITY_BREACH,
    severity: AlertSeverity.CRITICAL,
    threshold: 1,
    condition: 'greater_than',
    enabled: true,
    cooldown: 0, // Always alert on security issues
  },

  {
    errorType: ErrorType.PAYMENT_FAILURE,
    severity: AlertSeverity.CRITICAL,
    threshold: 5, // Alert if 5+ payment failures in 5 minutes
    condition: 'greater_than',
    duration: 300,
    enabled: true,
    cooldown: 900, // 15 minutes
  },

  // ========================================================================
  // HIGH SEVERITY ALERTS
  // ========================================================================

  {
    errorType: ErrorType.HIGH_ERROR_RATE,
    severity: AlertSeverity.HIGH,
    threshold: 0.1, // 10% error rate
    condition: 'greater_than',
    duration: 300, // Over 5 minutes
    enabled: true,
    cooldown: 600, // 10 minutes
  },

  {
    errorType: ErrorType.PERFORMANCE_DEGRADATION,
    severity: AlertSeverity.HIGH,
    threshold: 5000, // P95 latency > 5 seconds
    condition: 'greater_than',
    duration: 600, // Over 10 minutes
    enabled: true,
    cooldown: 1800, // 30 minutes
  },

  {
    errorType: ErrorType.AUTH_FAILURE,
    severity: AlertSeverity.HIGH,
    threshold: 50, // 50+ auth failures in 5 minutes
    condition: 'greater_than',
    duration: 300,
    enabled: true,
    cooldown: 600,
  },

  {
    errorType: ErrorType.EXTERNAL_API_DOWN,
    severity: AlertSeverity.HIGH,
    threshold: 0.5, // 50% failure rate to external API
    condition: 'greater_than',
    duration: 180, // Over 3 minutes
    enabled: true,
    cooldown: 900,
  },

  {
    errorType: ErrorType.SERVICE_DEGRADATION,
    severity: AlertSeverity.HIGH,
    threshold: 0.3, // 30% of requests failing
    condition: 'greater_than',
    duration: 300,
    enabled: true,
    cooldown: 600,
  },

  // ========================================================================
  // MEDIUM SEVERITY ALERTS
  // ========================================================================

  {
    errorType: ErrorType.MODERATE_ERROR_RATE,
    severity: AlertSeverity.MEDIUM,
    threshold: 0.05, // 5% error rate
    condition: 'greater_than',
    duration: 600, // Over 10 minutes
    enabled: true,
    cooldown: 1800, // 30 minutes
  },

  {
    errorType: ErrorType.RATE_LIMIT_APPROACHING,
    severity: AlertSeverity.MEDIUM,
    threshold: 0.8, // 80% of rate limit
    condition: 'greater_than',
    duration: 300,
    enabled: true,
    cooldown: 1800,
  },

  {
    errorType: ErrorType.UNUSUAL_TRAFFIC,
    severity: AlertSeverity.MEDIUM,
    threshold: 2, // 2x normal traffic
    condition: 'greater_than',
    duration: 300,
    enabled: true,
    cooldown: 3600, // 1 hour
  },

  {
    errorType: ErrorType.DEPRECATED_API_USAGE,
    severity: AlertSeverity.MEDIUM,
    threshold: 10, // 10+ requests to deprecated API
    condition: 'greater_than',
    duration: 3600, // Over 1 hour
    enabled: true,
    cooldown: 86400, // 24 hours
  },

  // ========================================================================
  // LOW SEVERITY ALERTS
  // ========================================================================

  {
    errorType: ErrorType.LOW_ERROR_RATE,
    severity: AlertSeverity.LOW,
    threshold: 0.01, // 1% error rate
    condition: 'greater_than',
    duration: 1800, // Over 30 minutes
    enabled: true,
    cooldown: 3600,
  },

  {
    errorType: ErrorType.MINOR_PERFORMANCE_ISSUE,
    severity: AlertSeverity.LOW,
    threshold: 2000, // P95 latency > 2 seconds
    condition: 'greater_than',
    duration: 1800,
    enabled: true,
    cooldown: 3600,
  },
];

/**
 * Get alert rule for a specific error type
 */
export function getAlertRule(errorType: ErrorType): AlertRule | undefined {
  return DEFAULT_ALERT_RULES.find(
    (rule) => rule.errorType === errorType && rule.enabled,
  );
}

/**
 * Get all enabled alert rules for a severity level
 */
export function getAlertRulesBySeverity(severity: AlertSeverity): AlertRule[] {
  return DEFAULT_ALERT_RULES.filter(
    (rule) => rule.severity === severity && rule.enabled,
  );
}

/**
 * Check if an alert should trigger based on rule
 */
export function shouldTriggerAlert(
  rule: AlertRule,
  currentValue: number,
  lastTriggered?: Date,
): boolean {
  // Check if rule is enabled
  if (!rule.enabled) {
    return false;
  }

  // Check cooldown period
  if (rule.cooldown && lastTriggered) {
    const cooldownEnd = new Date(
      lastTriggered.getTime() + rule.cooldown * 1000,
    );
    if (new Date() < cooldownEnd) {
      return false; // Still in cooldown period
    }
  }

  // Check threshold condition
  const threshold =
    typeof rule.threshold === 'string'
      ? parseFloat(rule.threshold)
      : rule.threshold;

  switch (rule.condition) {
    case 'greater_than':
      return currentValue > threshold;
    case 'less_than':
      return currentValue < threshold;
    case 'equals':
      return currentValue === threshold;
    case 'contains':
      return String(currentValue).includes(String(threshold));
    default:
      return false;
  }
}
