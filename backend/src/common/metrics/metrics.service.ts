import { Injectable } from '@nestjs/common';

/**
 * Metrics Service
 *
 * Tracks application metrics for monitoring:
 * - Request count (total, by method, by status)
 * - Response latency (average, p50, p95, p99)
 * - Error count and rate
 * - Active requests
 *
 * This service provides basic metrics that can be integrated with:
 * - Prometheus
 * - Datadog
 * - New Relic
 * - CloudWatch
 * - Custom monitoring solutions
 */

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

export interface AggregatedMetrics {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  activeRequests: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  recentRequests: RequestMetrics[];
}

@Injectable()
export class MetricsService {
  private readonly requests: RequestMetrics[] = [];
  private readonly maxHistorySize = 10000; // Keep last 10k requests
  private activeRequests = 0;
  private readonly startTime = Date.now();

  /**
   * Record a request metric
   */
  recordRequest(metric: RequestMetrics): void {
    // Add to history
    this.requests.push(metric);

    // Trim history if exceeds max size
    if (this.requests.length > this.maxHistorySize) {
      this.requests.shift();
    }
  }

  /**
   * Increment active request counter
   */
  incrementActiveRequests(): void {
    this.activeRequests++;
  }

  /**
   * Decrement active request counter
   */
  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * Get current active requests count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): AggregatedMetrics {
    const now = Date.now();
    const uptime = (now - this.startTime) / 1000; // seconds

    // Filter recent requests (last 5 minutes for rate calculation)
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const recentRequests = this.requests.filter(
      (r) => now - r.timestamp < recentWindow,
    );

    // Calculate totals
    const totalRequests = this.requests.length;
    const totalErrors = this.requests.filter((r) => r.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Calculate latency metrics
    const latencies = this.requests
      .map((r) => r.duration)
      .sort((a, b) => a - b);
    const averageLatency =
      latencies.length > 0
        ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
        : 0;
    const p50Latency = this.percentile(latencies, 50);
    const p95Latency = this.percentile(latencies, 95);
    const p99Latency = this.percentile(latencies, 99);

    // Calculate requests per second
    const requestsPerSecond = uptime > 0 ? totalRequests / uptime : 0;

    // Group by method
    const requestsByMethod: Record<string, number> = {};
    this.requests.forEach((r) => {
      requestsByMethod[r.method] = (requestsByMethod[r.method] || 0) + 1;
    });

    // Group by status code
    const requestsByStatus: Record<string, number> = {};
    this.requests.forEach((r) => {
      const statusGroup = `${Math.floor(r.statusCode / 100)}xx`;
      requestsByStatus[statusGroup] = (requestsByStatus[statusGroup] || 0) + 1;
    });

    return {
      totalRequests,
      totalErrors,
      errorRate,
      averageLatency: Math.round(averageLatency * 100) / 100,
      p50Latency,
      p95Latency,
      p99Latency,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      activeRequests: this.activeRequests,
      requestsByMethod,
      requestsByStatus,
      recentRequests: recentRequests.slice(-100), // Last 100 requests
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const uptime = (Date.now() - this.startTime) / 1000;

    // Calculate sum of all durations
    const durationSum =
      this.requests.reduce((sum, r) => sum + r.duration, 0) / 1000;

    const lines: string[] = [
      '# HELP http_requests_total Total number of HTTP requests',
      '# TYPE http_requests_total counter',
      `http_requests_total ${metrics.totalRequests}`,
      '',
      '# HELP http_errors_total Total number of HTTP errors',
      '# TYPE http_errors_total counter',
      `http_errors_total ${metrics.totalErrors}`,
      '',
      '# HELP http_request_duration_seconds Request duration in seconds',
      '# TYPE http_request_duration_seconds summary',
      `http_request_duration_seconds{quantile="0.5"} ${metrics.p50Latency / 1000}`,
      `http_request_duration_seconds{quantile="0.95"} ${metrics.p95Latency / 1000}`,
      `http_request_duration_seconds{quantile="0.99"} ${metrics.p99Latency / 1000}`,
      `http_request_duration_seconds_sum ${durationSum}`,
      `http_request_duration_seconds_count ${metrics.totalRequests}`,
      '',
      '# HELP http_active_requests Current number of active requests',
      '# TYPE http_active_requests gauge',
      `http_active_requests ${metrics.activeRequests}`,
      '',
      '# HELP application_uptime_seconds Application uptime in seconds',
      '# TYPE application_uptime_seconds gauge',
      `application_uptime_seconds ${uptime}`,
    ];

    return lines.join('\n');
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.requests.length = 0;
    this.activeRequests = 0;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) {
      return 0;
    }
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }
}
