import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Metrics Controller
 *
 * Exposes metrics endpoints for monitoring:
 * - GET /metrics - JSON format (default)
 * - GET /metrics/prometheus - Prometheus format
 *
 * In production, consider:
 * - Adding authentication/authorization
 * - Rate limiting
 * - IP whitelisting
 * - Moving to a separate monitoring port
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get metrics in JSON format
   */
  @Get()
  getMetrics() {
    return this.metricsService.getMetrics();
  }

  /**
   * Get metrics in Prometheus format
   *
   * Prometheus is a popular open-source monitoring solution.
   * This endpoint can be scraped by Prometheus server.
   *
   * Example Prometheus config:
   * ```yaml
   * scrape_configs:
   *   - job_name: 'nestjs-api'
   *     scrape_interval: 15s
   *     static_configs:
   *       - targets: ['localhost:3001']
   *     metrics_path: '/metrics/prometheus'
   * ```
   */
  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getPrometheusMetrics() {
    return this.metricsService.getPrometheusMetrics();
  }
}
