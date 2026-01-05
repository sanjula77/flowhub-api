/**
 * WSO2 API Analytics - Complete Guide
 *
 * This file explains how to enable and use WSO2 API Analytics
 * for production monitoring and insights.
 *
 * WSO2 API Analytics provides comprehensive metrics and insights
 * about API usage, performance, and errors.
 */

/**
 * ============================================================================
 * SECTION 1: WHAT METRICS WSO2 PROVIDES
 * ============================================================================
 *
 * WSO2 API Analytics tracks the following metrics:
 *
 * 1. REQUEST METRICS
 *    - Total request count
 *    - Requests per second/minute/hour
 *    - Request distribution by time
 *    - Request size (request/response payload sizes)
 *
 * 2. RESPONSE METRICS
 *    - Response times (latency)
 *    - Average response time
 *    - P50, P95, P99 percentiles
 *    - Response status codes (2xx, 3xx, 4xx, 5xx)
 *    - Error rate
 *
 * 3. API-SPECIFIC METRICS
 *    - API version usage
 *    - Resource (endpoint) usage
 *    - Method distribution (GET, POST, PUT, DELETE, etc.)
 *    - API popularity ranking
 *
 * 4. APPLICATION METRICS
 *    - Application-level usage
 *    - Consumer key usage
 *    - Subscription statistics
 *    - Application performance
 *
 * 5. USER METRICS
 *    - User activity
 *    - User-specific API usage
 *    - User authentication patterns
 *    - User error rates
 *
 * 6. GEOGRAPHIC METRICS
 *    - Request origin by country/region
 *    - Geographic distribution of users
 *    - Regional performance metrics
 *
 * 7. THROTTLE METRICS
 *    - Throttle policy violations
 *    - Rate limit hits
 *    - Throttle events
 *
 * 8. BACKEND METRICS
 *    - Backend response times
 *    - Backend error rates
 *    - Backend availability
 *    - Backend latency percentiles
 *
 * 9. CACHE METRICS
 *    - Cache hit/miss ratios
 *    - Cache performance
 *    - Cache effectiveness
 *
 * 10. ALERT METRICS
 *     - Abnormal traffic patterns
 *     - Error spikes
 *     - Performance degradation
 *     - Backend failures
 */

/**
 * ============================================================================
 * SECTION 2: HOW TO ENABLE ANALYTICS IN WSO2 API MANAGER
 * ============================================================================
 *
 * STEP 1: Enable Analytics in API Runtime Configuration
 * -----------------------------------------------------
 *
 * 1. Login to WSO2 Publisher Portal:
 *    URL: https://localhost:9443/publisher
 *    Username: admin
 *    Password: admin
 *
 * 2. Navigate to your API:
 *    - Go to "APIs" → Select your API (e.g., "FlowHub API")
 *    - Click "Edit" to open API editor
 *
 * 3. Enable Analytics:
 *    - Go to "Runtime Configuration" tab
 *    - Scroll to "Analytics" section
 *    - ✅ Check "Enable Analytics"
 *    - Click "Save"
 *
 * STEP 2: Configure Analytics Server (If Using External Analytics)
 * ------------------------------------------------------------------
 *
 * For production, you may want to use a separate WSO2 Analytics Server.
 *
 * Option A: Use Built-in Analytics (Default - Recommended for Development)
 * - Analytics is enabled by default in WSO2 API Manager
 * - No additional configuration needed
 * - Data is stored in WSO2's internal database
 *
 * Option B: Use External WSO2 Analytics Server (Recommended for Production)
 *
 * 1. Deploy WSO2 Analytics Server:
 *    - Download WSO2 API Manager Analytics 4.3.0
 *    - Or use Docker: wso2/wso2am-analytics:4.3.0
 *
 * 2. Configure API Manager to connect to Analytics Server:
 *    Edit: <WSO2_HOME>/repository/conf/deployment.toml
 *
 *    [apim.analytics]
 *    enable = true
 *    config_endpoint = "https://analytics-server:9444"
 *    auth_token = "your-auth-token"
 *
 * 3. Restart WSO2 API Manager
 *
 * STEP 3: Verify Analytics Configuration
 * ----------------------------------------
 *
 * 1. Check Analytics Status:
 *    - In Publisher → Your API → "Runtime Configuration"
 *    - Analytics should show as "Enabled"
 *
 * 2. Check Analytics Server Connection (if external):
 *    - Check WSO2 API Manager logs:
 *      docker logs flowhub-wso2-1 | grep -i analytics
 *    - Should see: "Analytics connection established"
 *
 * STEP 4: Publish API with Analytics Enabled
 * -------------------------------------------
 *
 * 1. Go to "Lifecycle" tab
 * 2. Click "Publish" to deploy API to Gateway
 * 3. Analytics will start collecting data once API is published
 */

/**
 * ============================================================================
 * SECTION 3: HOW TO VERIFY DATA IS FLOWING
 * ============================================================================
 *
 * METHOD 1: Check Analytics Dashboard in Publisher
 * -------------------------------------------------
 *
 * 1. Login to Publisher: https://localhost:9443/publisher
 * 2. Go to "APIs" → Select your API
 * 3. Click "Analytics" tab (or "Overview" tab)
 * 4. You should see:
 *    - Request count charts
 *    - Response time graphs
 *    - Error rate indicators
 *    - API usage statistics
 *
 * METHOD 2: Make Test API Calls
 * ------------------------------
 *
 * 1. Generate an access token (from Developer Portal)
 * 2. Make API requests through WSO2 Gateway:
 *
 *    Example:
 *    ```bash
 *    curl -X GET "https://localhost:8243/flowhub/1.0.0/users/me" \
 *      -H "Authorization: Bearer <access-token>" \
 *      -k
 *    ```
 *
 * 3. Wait 1-2 minutes for analytics to process
 * 4. Refresh Analytics dashboard in Publisher
 * 5. You should see the request appear in metrics
 *
 * METHOD 3: Check Analytics Logs
 * --------------------------------
 *
 * 1. Check WSO2 API Manager logs:
 *    ```bash
 *    docker logs flowhub-wso2-1 | grep -i analytics
 *    ```
 *
 * 2. Look for:
 *    - "Analytics event published"
 *    - "Analytics data sent"
 *    - No error messages related to analytics
 *
 * METHOD 4: Use Analytics REST API
 * -----------------------------------
 *
 * WSO2 provides REST APIs to query analytics data:
 *
 * 1. Get API Statistics:
 *    ```bash
 *    curl -X GET \
 *      "https://localhost:9443/api/am/analytics/v2.0/statistics/api?apiName=FlowHub%20API&version=1.0.0" \
 *      -H "Authorization: Basic YWRtaW46YWRtaW4=" \
 *      -k
 *    ```
 *
 * 2. Get Application Statistics:
 *    ```bash
 *    curl -X GET \
 *      "https://localhost:9443/api/am/analytics/v2.0/statistics/application" \
 *      -H "Authorization: Basic YWRtaW46YWRtaW4=" \
 *      -k
 *    ```
 *
 * METHOD 5: Check Database (Advanced)
 * ------------------------------------
 *
 * If using built-in analytics, data is stored in:
 * - Database: WSO2AM_STATS_DB
 * - Tables: API_REQUEST_SUMMARY, API_FAULT_SUMMARY, etc.
 *
 * Connect to database and query:
 * ```sql
 * SELECT COUNT(*) FROM API_REQUEST_SUMMARY
 * WHERE API_NAME = 'FlowHub API';
 * ```
 */

/**
 * ============================================================================
 * SECTION 4: HOW ANALYTICS HELPS PRODUCTION MONITORING
 * ============================================================================
 *
 * 1. PERFORMANCE MONITORING
 * --------------------------
 *
 * - Monitor API response times in real-time
 * - Identify slow endpoints (P95, P99 latencies)
 * - Detect performance degradation early
 * - Set up alerts for latency thresholds
 *
 * Example Use Cases:
 * - Alert when average response time > 1 second
 * - Identify endpoints with P99 > 5 seconds
 * - Track performance improvements over time
 *
 * 2. ERROR MONITORING
 * -------------------
 *
 * - Track error rates (4xx, 5xx responses)
 * - Identify error patterns
 * - Monitor error trends
 * - Get alerts on error spikes
 *
 * Example Use Cases:
 * - Alert when error rate > 5%
 * - Identify which endpoints have most errors
 * - Track error resolution effectiveness
 *
 * 3. TRAFFIC MONITORING
 * ---------------------
 *
 * - Monitor request volume
 * - Identify traffic patterns
 * - Detect traffic spikes or anomalies
 * - Plan capacity based on usage trends
 *
 * Example Use Cases:
 * - Identify peak usage times
 * - Detect DDoS or unusual traffic patterns
 * - Plan scaling based on traffic growth
 *
 * 4. API USAGE INSIGHTS
 * ---------------------
 *
 * - Understand which APIs/endpoints are most used
 * - Identify unused or deprecated APIs
 * - Track API version adoption
 * - Monitor resource-level usage
 *
 * Example Use Cases:
 * - Deprecate unused API versions
 * - Optimize popular endpoints
 * - Plan API versioning strategy
 *
 * 5. USER BEHAVIOR ANALYSIS
 * -------------------------
 *
 * - Track user activity patterns
 * - Identify power users
 * - Monitor user-specific error rates
 * - Understand usage by user segment
 *
 * Example Use Cases:
 * - Identify users causing high error rates
 * - Understand usage patterns by user role
 * - Optimize experience for power users
 *
 * 6. THROTTLE MONITORING
 * -----------------------
 *
 * - Monitor throttle policy violations
 * - Track rate limit hits
 * - Identify applications/users hitting limits
 * - Optimize throttle policies
 *
 * Example Use Cases:
 * - Adjust throttle limits based on actual usage
 * - Identify applications needing higher limits
 * - Prevent abuse through throttling
 *
 * 7. BACKEND HEALTH MONITORING
 * -----------------------------
 *
 * - Monitor backend response times
 * - Track backend error rates
 * - Detect backend failures
 * - Identify backend performance issues
 *
 * Example Use Cases:
 * - Alert when backend is down
 * - Identify slow backend services
 * - Track backend SLA compliance
 *
 * 8. BUSINESS INTELLIGENCE
 * -------------------------
 *
 * - Generate usage reports
 * - Track API adoption
 * - Monitor subscription trends
 * - Understand API monetization
 *
 * Example Use Cases:
 * - Monthly usage reports
 * - API adoption metrics
 * - Subscription analytics
 * - Revenue tracking (if monetized)
 *
 * 9. SECURITY MONITORING
 * -----------------------
 *
 * - Detect suspicious activity
 * - Monitor authentication failures
 * - Track unauthorized access attempts
 * - Identify security threats
 *
 * Example Use Cases:
 * - Alert on authentication failure spikes
 * - Detect brute force attacks
 * - Monitor unauthorized access patterns
 */

/**
 * ============================================================================
 * SECTION 5: ANALYTICS DASHBOARD ACCESS
 * ============================================================================
 *
 * Publisher Analytics Dashboard:
 * - URL: https://localhost:9443/publisher
 * - Navigate: APIs → Your API → Analytics tab
 * - View: API-level metrics, charts, and graphs
 *
 * Admin Analytics Dashboard:
 * - URL: https://localhost:9443/admin
 * - Navigate: Analytics → API Analytics
 * - View: System-wide analytics, all APIs
 *
 * Developer Portal Analytics (for Application Owners):
 * - URL: https://localhost:9443/devportal
 * - Navigate: Applications → Your App → Analytics
 * - View: Application-specific usage metrics
 */

/**
 * ============================================================================
 * SECTION 6: INTEGRATION WITH EXTERNAL MONITORING TOOLS
 * ============================================================================
 *
 * WSO2 Analytics can be integrated with:
 *
 * 1. Prometheus:
 *    - Export metrics via Prometheus exporter
 *    - Scrape WSO2 analytics endpoints
 *    - Use Grafana for visualization
 *
 * 2. ELK Stack (Elasticsearch, Logstash, Kibana):
 *    - Export analytics data to Elasticsearch
 *    - Create dashboards in Kibana
 *    - Set up alerts in Elasticsearch
 *
 * 3. Datadog:
 *    - Use WSO2 Datadog integration
 *    - Send metrics to Datadog
 *    - Create custom dashboards
 *
 * 4. New Relic:
 *    - Integrate via WSO2 New Relic plugin
 *    - Send metrics to New Relic
 *    - Use New Relic dashboards
 *
 * 5. Custom Integration:
 *    - Use WSO2 Analytics REST APIs
 *    - Query analytics data programmatically
 *    - Build custom dashboards
 */

/**
 * ============================================================================
 * SECTION 7: BEST PRACTICES FOR PRODUCTION
 * ============================================================================
 *
 * 1. Enable Analytics Early:
 *    - Enable analytics during API development
 *    - Monitor from day one
 *    - Establish baseline metrics
 *
 * 2. Set Up Alerts:
 *    - Configure alerts for error spikes
 *    - Set latency thresholds
 *    - Monitor backend health
 *
 * 3. Regular Review:
 *    - Review analytics weekly
 *    - Identify trends
 *    - Optimize based on insights
 *
 * 4. Capacity Planning:
 *    - Use traffic metrics for scaling
 *    - Plan for peak usage
 *    - Monitor resource usage
 *
 * 5. Performance Optimization:
 *    - Identify slow endpoints
 *    - Optimize based on analytics
 *    - Track improvement metrics
 *
 * 6. Security Monitoring:
 *    - Monitor authentication patterns
 *    - Track suspicious activity
 *    - Set up security alerts
 */

/**
 * ============================================================================
 * SECTION 8: TROUBLESHOOTING
 * ============================================================================
 *
 * Issue: Analytics not showing data
 * Solution:
 * 1. Verify analytics is enabled in API Runtime Configuration
 * 2. Ensure API is published (not just created)
 * 3. Make test API calls through Gateway
 * 4. Wait 1-2 minutes for data processing
 * 5. Check analytics server connection (if external)
 * 6. Review WSO2 logs for analytics errors
 *
 * Issue: Analytics dashboard not loading
 * Solution:
 * 1. Clear browser cache
 * 2. Check WSO2 server is running
 * 3. Verify user has analytics permissions
 * 4. Check browser console for errors
 *
 * Issue: Analytics data delayed
 * Solution:
 * 1. Normal delay is 1-2 minutes
 * 2. For real-time data, check Gateway logs
 * 3. Verify analytics server performance
 * 4. Check database connection (if using external DB)
 *
 * Issue: High analytics overhead
 * Solution:
 * 1. Use external analytics server for production
 * 2. Configure analytics sampling (if available)
 * 3. Optimize analytics database
 * 4. Consider analytics data retention policies
 */

/**
 * ============================================================================
 * SECTION 9: EXAMPLE ANALYTICS QUERIES
 * ============================================================================
 *
 * These examples show how to query analytics data programmatically:
 *
 * Note: Replace <API_NAME>, <VERSION>, <ACCESS_TOKEN> with actual values
 */

export class WSO2AnalyticsExamples {
  /**
   * Example 1: Get API Request Statistics
   *
   * Returns: Total requests, success rate, average response time
   */
  async getAPIStatistics(apiName: string, version: string) {
    const url = `https://localhost:9443/api/am/analytics/v2.0/statistics/api?apiName=${encodeURIComponent(apiName)}&version=${version}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=', // admin:admin base64
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 2: Get Application Usage Statistics
   *
   * Returns: Application-level metrics, request counts, error rates
   */
  async getApplicationStatistics(applicationName?: string) {
    let url =
      'https://localhost:9443/api/am/analytics/v2.0/statistics/application';
    if (applicationName) {
      url += `?applicationName=${encodeURIComponent(applicationName)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 3: Get Resource-Level Statistics
   *
   * Returns: Endpoint-specific metrics, method distribution
   */
  async getResourceStatistics(
    apiName: string,
    version: string,
    resourcePath?: string,
  ) {
    let url = `https://localhost:9443/api/am/analytics/v2.0/statistics/resource?apiName=${encodeURIComponent(apiName)}&version=${version}`;
    if (resourcePath) {
      url += `&resourcePath=${encodeURIComponent(resourcePath)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 4: Get User Activity Statistics
   *
   * Returns: User-specific metrics, activity patterns
   */
  async getUserStatistics(userId?: string) {
    let url = 'https://localhost:9443/api/am/analytics/v2.0/statistics/user';
    if (userId) {
      url += `?userId=${encodeURIComponent(userId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 5: Get Throttle Statistics
   *
   * Returns: Throttle policy violations, rate limit hits
   */
  async getThrottleStatistics() {
    const url =
      'https://localhost:9443/api/am/analytics/v2.0/statistics/throttle';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 6: Get Backend Response Time Statistics
   *
   * Returns: Backend latency, error rates, availability
   */
  async getBackendStatistics(apiName: string, version: string) {
    const url = `https://localhost:9443/api/am/analytics/v2.0/statistics/backend?apiName=${encodeURIComponent(apiName)}&version=${version}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  /**
   * Example 7: Get Time-Series Data for Charts
   *
   * Returns: Time-series data for visualization
   */
  async getTimeSeriesData(
    apiName: string,
    version: string,
    startTime: string,
    endTime: string,
  ) {
    const url = `https://localhost:9443/api/am/analytics/v2.0/statistics/api?apiName=${encodeURIComponent(apiName)}&version=${version}&startTime=${startTime}&endTime=${endTime}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Basic YWRtaW46YWRtaW4=',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}

/**
 * ============================================================================
 * SECTION 10: QUICK REFERENCE CHECKLIST
 * ============================================================================
 *
 * ✅ Enable Analytics:
 *    [ ] Login to Publisher Portal
 *    [ ] Navigate to API → Runtime Configuration
 *    [ ] Check "Enable Analytics"
 *    [ ] Save and Publish API
 *
 * ✅ Verify Analytics:
 *    [ ] Make test API call through Gateway
 *    [ ] Wait 1-2 minutes
 *    [ ] Check Analytics dashboard in Publisher
 *    [ ] Verify data appears in charts
 *
 * ✅ Monitor Production:
 *    [ ] Set up alerts for error spikes
 *    [ ] Configure latency thresholds
 *    [ ] Review analytics weekly
 *    [ ] Track key metrics over time
 *
 * ✅ Integration:
 *    [ ] Export to Prometheus (if needed)
 *    [ ] Set up Grafana dashboards (if needed)
 *    [ ] Configure external monitoring tools (if needed)
 */

/**
 * ============================================================================
 * SECTION 11: ANALYTICS DATA RETENTION
 * ============================================================================
 *
 * By default, WSO2 stores analytics data indefinitely. For production:
 *
 * 1. Configure Data Retention:
 *    - Set retention period (e.g., 90 days)
 *    - Archive old data if needed
 *    - Use external analytics server for better performance
 *
 * 2. Data Cleanup:
 *    - Periodically clean old analytics data
 *    - Use WSO2 cleanup scripts
 *    - Consider data archival strategy
 *
 * 3. Performance:
 *    - Large datasets can slow down queries
 *    - Use time-based queries for better performance
 *    - Consider data aggregation for historical data
 */

/**
 * ============================================================================
 * SECTION 12: ANALYTICS VS BACKEND METRICS
 * ============================================================================
 *
 * WSO2 Analytics provides Gateway-level metrics:
 * - Request/response through WSO2 Gateway
 * - Authentication/authorization metrics
 * - Throttle policy enforcement
 * - Gateway latency
 *
 * Backend Metrics (from MetricsService) provide:
 * - Application-level metrics
 * - Business logic performance
 * - Database query times
 * - Internal service metrics
 *
 * Use Both:
 * - WSO2 Analytics: Gateway performance, API usage, security
 * - Backend Metrics: Application performance, business metrics
 * - Combined: Complete picture of system health
 */
