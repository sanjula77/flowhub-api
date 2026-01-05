/**
 * Alert Severity Levels
 *
 * Defines the severity classification for alerts to help prioritize
 * response and determine appropriate notification channels.
 */
export enum AlertSeverity {
  /**
   * CRITICAL: Immediate action required
   * - System is down or severely degraded
   * - Data loss or corruption risk
   * - Security breach detected
   * - Payment processing failure
   * - Database connection lost
   *
   * Response: Immediate (on-call engineer)
   * Channel: PagerDuty, Phone, SMS
   */
  CRITICAL = 'critical',

  /**
   * HIGH: Urgent attention needed
   * - Service degradation affecting users
   * - High error rate (>10%)
   * - Authentication system failure
   * - External API dependency down
   * - Performance degradation (P95 > 5s)
   *
   * Response: Within 15 minutes
   * Channel: PagerDuty, Slack, Email
   */
  HIGH = 'high',

  /**
   * MEDIUM: Important but not urgent
   * - Moderate error rate (5-10%)
   * - Performance issues (P95 > 2s)
   * - Rate limit approaching
   * - Unusual traffic patterns
   * - Deprecated API usage
   *
   * Response: Within 1 hour
   * Channel: Slack, Email
   */
  MEDIUM = 'medium',

  /**
   * LOW: Informational
   * - Low error rate (<5%)
   * - Minor performance degradation
   * - Configuration changes
   * - Scheduled maintenance
   * - Non-critical warnings
   *
   * Response: Next business day
   * Channel: Email, Dashboard
   */
  LOW = 'low',

  /**
   * INFO: No action required
   * - Successful deployments
   * - Scheduled tasks completed
   * - Informational messages
   * - Metrics thresholds met
   *
   * Response: None (logging only)
   * Channel: Dashboard, Logs
   */
  INFO = 'info',
}

/**
 * Error Classification
 *
 * Maps error types to severity levels for consistent alerting
 */
export enum ErrorType {
  // Critical Errors
  SYSTEM_DOWN = 'system_down',
  DATABASE_CONNECTION_LOST = 'database_connection_lost',
  DATA_CORRUPTION = 'data_corruption',
  SECURITY_BREACH = 'security_breach',
  PAYMENT_FAILURE = 'payment_failure',

  // High Severity Errors
  SERVICE_DEGRADATION = 'service_degradation',
  HIGH_ERROR_RATE = 'high_error_rate',
  AUTH_FAILURE = 'auth_failure',
  EXTERNAL_API_DOWN = 'external_api_down',
  PERFORMANCE_DEGRADATION = 'performance_degradation',

  // Medium Severity Errors
  MODERATE_ERROR_RATE = 'moderate_error_rate',
  RATE_LIMIT_APPROACHING = 'rate_limit_approaching',
  UNUSUAL_TRAFFIC = 'unusual_traffic',
  DEPRECATED_API_USAGE = 'deprecated_api_usage',

  // Low Severity Errors
  LOW_ERROR_RATE = 'low_error_rate',
  MINOR_PERFORMANCE_ISSUE = 'minor_performance_issue',
  CONFIGURATION_CHANGE = 'configuration_change',

  // Info
  DEPLOYMENT_SUCCESS = 'deployment_success',
  SCHEDULED_TASK = 'scheduled_task',
}

/**
 * Map error types to severity levels
 */
export const ERROR_SEVERITY_MAP: Record<ErrorType, AlertSeverity> = {
  // Critical
  [ErrorType.SYSTEM_DOWN]: AlertSeverity.CRITICAL,
  [ErrorType.DATABASE_CONNECTION_LOST]: AlertSeverity.CRITICAL,
  [ErrorType.DATA_CORRUPTION]: AlertSeverity.CRITICAL,
  [ErrorType.SECURITY_BREACH]: AlertSeverity.CRITICAL,
  [ErrorType.PAYMENT_FAILURE]: AlertSeverity.CRITICAL,

  // High
  [ErrorType.SERVICE_DEGRADATION]: AlertSeverity.HIGH,
  [ErrorType.HIGH_ERROR_RATE]: AlertSeverity.HIGH,
  [ErrorType.AUTH_FAILURE]: AlertSeverity.HIGH,
  [ErrorType.EXTERNAL_API_DOWN]: AlertSeverity.HIGH,
  [ErrorType.PERFORMANCE_DEGRADATION]: AlertSeverity.HIGH,

  // Medium
  [ErrorType.MODERATE_ERROR_RATE]: AlertSeverity.MEDIUM,
  [ErrorType.RATE_LIMIT_APPROACHING]: AlertSeverity.MEDIUM,
  [ErrorType.UNUSUAL_TRAFFIC]: AlertSeverity.MEDIUM,
  [ErrorType.DEPRECATED_API_USAGE]: AlertSeverity.MEDIUM,

  // Low
  [ErrorType.LOW_ERROR_RATE]: AlertSeverity.LOW,
  [ErrorType.MINOR_PERFORMANCE_ISSUE]: AlertSeverity.LOW,
  [ErrorType.CONFIGURATION_CHANGE]: AlertSeverity.LOW,

  // Info
  [ErrorType.DEPLOYMENT_SUCCESS]: AlertSeverity.INFO,
  [ErrorType.SCHEDULED_TASK]: AlertSeverity.INFO,
};
