import { db } from '@/lib/db/connection';
import { 
  stripePaymentIntents, 
  stripeWebhooks, 
  payments 
} from '@/lib/db/paymentSchema';
import { Redis } from 'ioredis';
import { sql, eq, and, gte, desc, count } from 'drizzle-orm';

/**
 * Payment Performance and Monitoring Service
 * Handles caching, monitoring, and performance optimization
 */
export class PaymentPerformanceService {
  private static redis: Redis | null = null;
  
  // Initialize Redis connection if available
  private static getRedis(): Redis | null {
    if (this.redis) return this.redis;
    
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        console.log('Redis connected for payment caching');
      } catch (error) {
        console.warn('Redis connection failed, operating without cache:', error);
      }
    }
    
    return this.redis;
  }

  /**
   * Cache payment intent data to reduce Stripe API calls
   */
  static async cachePaymentIntent(
    paymentIntentId: string,
    data: any,
    ttlSeconds: number = 3600 // 1 hour default
  ): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const key = `payment_intent:${paymentIntentId}`;
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache payment intent:', error);
    }
  }

  /**
   * Retrieve cached payment intent data
   */
  static async getCachedPaymentIntent(paymentIntentId: string): Promise<any | null> {
    const redis = this.getRedis();
    if (!redis) return null;

    try {
      const key = `payment_intent:${paymentIntentId}`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to retrieve cached payment intent:', error);
      return null;
    }
  }

  /**
   * Invalidate payment intent cache
   */
  static async invalidatePaymentIntentCache(paymentIntentId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const key = `payment_intent:${paymentIntentId}`;
      await redis.del(key);
    } catch (error) {
      console.error('Failed to invalidate payment intent cache:', error);
    }
  }

  /**
   * Implement distributed locking for payment processing
   */
  static async acquirePaymentLock(
    orderId: string,
    ttlSeconds: number = 300 // 5 minutes
  ): Promise<{ acquired: boolean; lockKey: string }> {
    const redis = this.getRedis();
    const lockKey = `payment_lock:${orderId}`;

    if (!redis) {
      // Fallback to database-based locking if Redis unavailable
      return this.acquireDatabaseLock(orderId, ttlSeconds);
    }

    try {
      const lockValue = `${Date.now()}-${Math.random()}`;
      const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
      
      return {
        acquired: result === 'OK',
        lockKey: result === 'OK' ? lockKey : '',
      };
    } catch (error) {
      console.error('Failed to acquire payment lock:', error);
      return { acquired: false, lockKey: '' };
    }
  }

  /**
   * Release distributed payment lock
   */
  static async releasePaymentLock(lockKey: string): Promise<boolean> {
    const redis = this.getRedis();
    if (!redis) return true; // Assume success if no Redis

    try {
      const result = await redis.del(lockKey);
      return result === 1;
    } catch (error) {
      console.error('Failed to release payment lock:', error);
      return false;
    }
  }

  /**
   * Database-based locking fallback
   */
  private static async acquireDatabaseLock(
    orderId: string,
    ttlSeconds: number
  ): Promise<{ acquired: boolean; lockKey: string }> {
    try {
      // Use PostgreSQL advisory locks
      const lockId = this.hashOrderId(orderId);
      const result = await db.execute(
        sql`SELECT pg_try_advisory_lock(${lockId}) as acquired`
      );
      
      const acquired = result.rows[0]?.acquired === true;
      
      if (acquired) {
        // Set a timeout to release the lock
        setTimeout(async () => {
          await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
        }, ttlSeconds * 1000);
      }
      
      return { acquired, lockKey: lockId.toString() };
    } catch (error) {
      console.error('Failed to acquire database lock:', error);
      return { acquired: false, lockKey: '' };
    }
  }

  /**
   * Hash order ID to numeric lock ID for PostgreSQL advisory locks
   */
  private static hashOrderId(orderId: string): number {
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
      const char = orderId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Monitor payment processing metrics
   */
  static async getPaymentMetrics(): Promise<{
    processing: {
      averageProcessingTime: number;
      successRate: number;
      failureRate: number;
      timeoutRate: number;
    };
    volume: {
      paymentsLast24h: number;
      volumeLast24h: number;
      peakHourlyVolume: number;
    };
    webhooks: {
      totalProcessed: number;
      failedWebhooks: number;
      averageProcessingTime: number;
      retryRate: number;
    };
    performance: {
      slowQueries: number;
      cacheHitRate: number;
      apiLatency: number;
    };
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Payment processing metrics
    const paymentStats = await db
      .select({
        status: stripePaymentIntents.status,
        processingTime: sql`EXTRACT(EPOCH FROM (${stripePaymentIntents.succeededAt} - ${stripePaymentIntents.createdAt}))`.as('processing_time'),
        createdAt: stripePaymentIntents.createdAt,
      })
      .from(stripePaymentIntents)
      .where(gte(stripePaymentIntents.createdAt, oneDayAgo));

    const totalPayments = paymentStats.length;
    const succeededPayments = paymentStats.filter(p => p.status === 'succeeded');
    const failedPayments = paymentStats.filter(p => 
      ['canceled', 'requires_payment_method'].includes(p.status)
    );
    const timeoutPayments = paymentStats.filter(p => 
      p.status === 'processing' && 
      Date.now() - p.createdAt.getTime() > 60 * 60 * 1000 // 1 hour timeout
    );

    const processingTimes = succeededPayments
      .map(p => p.processingTime)
      .filter(t => t !== null) as number[];
    
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Volume metrics
    const volumeStats = await db
      .select({
        amount: payments.amount,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'completed'),
          gte(payments.createdAt, oneDayAgo)
        )
      );

    const totalVolume = volumeStats.reduce((sum, p) => sum + p.amount, 0);

    // Calculate peak hourly volume
    const hourlyVolumes = new Map<string, number>();
    for (const payment of volumeStats) {
      const hour = payment.createdAt.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      hourlyVolumes.set(hour, (hourlyVolumes.get(hour) || 0) + 1);
    }
    const peakHourlyVolume = Math.max(...Array.from(hourlyVolumes.values()), 0);

    // Webhook metrics
    const webhookStats = await db
      .select({
        status: stripeWebhooks.status,
        retryCount: stripeWebhooks.retryCount,
        processingTime: sql`EXTRACT(EPOCH FROM (${stripeWebhooks.processedAt} - ${stripeWebhooks.createdAt}))`.as('processing_time'),
      })
      .from(stripeWebhooks)
      .where(gte(stripeWebhooks.createdAt, oneDayAgo));

    const totalWebhooks = webhookStats.length;
    const failedWebhooks = webhookStats.filter(w => w.status === 'failed' || w.status === 'failed_permanent').length;
    const retriedWebhooks = webhookStats.filter(w => (w.retryCount || 0) > 0).length;
    
    const webhookProcessingTimes = webhookStats
      .map(w => w.processingTime)
      .filter(t => t !== null) as number[];
    
    const averageWebhookTime = webhookProcessingTimes.length > 0
      ? webhookProcessingTimes.reduce((sum, time) => sum + time, 0) / webhookProcessingTimes.length
      : 0;

    // Performance metrics (would need additional instrumentation)
    const slowQueries = 0; // TODO: Implement slow query detection
    const cacheHitRate = 0; // TODO: Implement cache hit rate tracking
    const apiLatency = 0; // TODO: Implement API latency tracking

    return {
      processing: {
        averageProcessingTime,
        successRate: totalPayments > 0 ? (succeededPayments.length / totalPayments) * 100 : 0,
        failureRate: totalPayments > 0 ? (failedPayments.length / totalPayments) * 100 : 0,
        timeoutRate: totalPayments > 0 ? (timeoutPayments.length / totalPayments) * 100 : 0,
      },
      volume: {
        paymentsLast24h: volumeStats.length,
        volumeLast24h: totalVolume,
        peakHourlyVolume,
      },
      webhooks: {
        totalProcessed: totalWebhooks,
        failedWebhooks,
        averageProcessingTime: averageWebhookTime,
        retryRate: totalWebhooks > 0 ? (retriedWebhooks / totalWebhooks) * 100 : 0,
      },
      performance: {
        slowQueries,
        cacheHitRate,
        apiLatency,
      },
    };
  }

  /**
   * Implement circuit breaker pattern for Stripe API calls
   */
  private static circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }>();

  static async withCircuitBreaker<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      timeoutMs?: number;
      resetTimeoutMs?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      timeoutMs = 30000,
      resetTimeoutMs = 60000,
    } = options;

    const breaker = this.circuitBreakers.get(operation) || {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED' as const,
    };

    // Check if circuit should be reset
    if (breaker.state === 'OPEN' && Date.now() - breaker.lastFailure > resetTimeoutMs) {
      breaker.state = 'HALF_OPEN';
      breaker.failures = 0;
    }

    // Reject if circuit is open
    if (breaker.state === 'OPEN') {
      throw new Error(`Circuit breaker OPEN for operation: ${operation}`);
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        ),
      ]);

      // Success - reset circuit breaker
      breaker.failures = 0;
      breaker.state = 'CLOSED';
      this.circuitBreakers.set(operation, breaker);

      return result;
    } catch (error) {
      // Failure - update circuit breaker
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'OPEN';
        console.warn(`Circuit breaker OPENED for operation: ${operation} after ${breaker.failures} failures`);
      }

      this.circuitBreakers.set(operation, breaker);
      throw error;
    }
  }

  /**
   * Batch process multiple payments for improved performance
   */
  static async batchProcessPayments(
    paymentIntentIds: string[],
    batchSize: number = 10
  ): Promise<{
    processed: number;
    failed: number;
    results: Array<{
      paymentIntentId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{
      paymentIntentId: string;
      success: boolean;
      error?: string;
    }> = [];

    let processed = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming Stripe API
    for (let i = 0; i < paymentIntentIds.length; i += batchSize) {
      const batch = paymentIntentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (paymentIntentId) => {
        try {
          // Implement your batch processing logic here
          // This could involve checking status, updating records, etc.
          
          await this.processIndividualPayment(paymentIntentId);
          
          results.push({ paymentIntentId, success: true });
          processed++;
        } catch (error) {
          results.push({
            paymentIntentId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failed++;
        }
      });

      // Wait for current batch to complete before starting next
      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < paymentIntentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    return { processed, failed, results };
  }

  /**
   * Database query optimization for payment searches
   */
  static async optimizedPaymentSearch(filters: {
    accountId?: string;
    status?: string;
    amountRange?: { min: number; max: number };
    dateRange?: { start: Date; end: Date };
    method?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    payments: Array<typeof payments.$inferSelect>;
    totalCount: number;
    hasMore: boolean;
  }> {
    const {
      accountId,
      status,
      amountRange,
      dateRange,
      method,
      limit = 50,
      offset = 0,
    } = filters;

    // Build optimized query with proper indexing
    let queryConditions = [];
    
    if (accountId) {
      queryConditions.push(eq(payments.accountId, accountId));
    }
    
    if (status) {
      queryConditions.push(eq(payments.status, status as any));
    }
    
    if (method) {
      queryConditions.push(eq(payments.method, method as any));
    }
    
    if (amountRange) {
      if (amountRange.min) {
        queryConditions.push(sql`${payments.amount} >= ${amountRange.min}`);
      }
      if (amountRange.max) {
        queryConditions.push(sql`${payments.amount} <= ${amountRange.max}`);
      }
    }
    
    if (dateRange) {
      if (dateRange.start) {
        queryConditions.push(gte(payments.createdAt, dateRange.start));
      }
      if (dateRange.end) {
        queryConditions.push(sql`${payments.createdAt} <= ${dateRange.end}`);
      }
    }

    // Get total count for pagination
    const countQuery = queryConditions.length > 0
      ? db.select({ count: count() }).from(payments).where(and(...queryConditions))
      : db.select({ count: count() }).from(payments);
    
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    // Get paginated results
    const paymentsQuery = queryConditions.length > 0
      ? db.select().from(payments).where(and(...queryConditions))
      : db.select().from(payments);

    const paymentsResult = await paymentsQuery
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      payments: paymentsResult,
      totalCount: Number(totalCount),
      hasMore: offset + limit < Number(totalCount),
    };
  }

  /**
   * Health check for payment system components
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      database: { status: 'up' | 'down'; latency: number };
      stripe: { status: 'up' | 'down'; latency: number };
      redis: { status: 'up' | 'down' | 'not_configured'; latency: number };
      webhooks: { status: 'healthy' | 'delayed' | 'failing' };
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const components: {
      database: { status: 'up' | 'down'; latency: number };
      stripe: { status: 'up' | 'down'; latency: number };
      redis: { status: 'up' | 'down' | 'not_configured'; latency: number };
      webhooks: { status: 'healthy' | 'delayed' | 'failing' };
    } = {
      database: { status: 'up', latency: 0 },
      stripe: { status: 'up', latency: 0 },
      redis: { status: 'not_configured', latency: 0 },
      webhooks: { status: 'healthy' },
    };

    // Check database
    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      components.database = {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      components.database = { status: 'down', latency: 0 };
      issues.push('Database connection failed');
    }

    // Check Stripe
    try {
      const start = Date.now();
      // Simple API call to check Stripe connectivity
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-07-30.basil',
      });
      await stripe.paymentIntents.list({ limit: 1 });
      components.stripe = {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      components.stripe = { status: 'down', latency: 0 };
      issues.push('Stripe API connection failed');
    }

    // Check Redis
    const redis = this.getRedis();
    if (redis) {
      try {
        const start = Date.now();
        await redis.ping();
        components.redis = {
          status: 'up',
          latency: Date.now() - start,
        };
      } catch (error) {
        components.redis = { status: 'down', latency: 0 };
        issues.push('Redis connection failed');
      }
    }

    // Check webhook health
    const recentWebhooks = await db
      .select({ status: stripeWebhooks.status })
      .from(stripeWebhooks)
      .where(gte(stripeWebhooks.createdAt, new Date(Date.now() - 15 * 60 * 1000))) // Last 15 minutes
      .limit(100);

    const failedWebhooks = recentWebhooks.filter(w => w.status === 'failed' || w.status === 'failed_permanent');
    
    if (failedWebhooks.length > recentWebhooks.length * 0.2) { // More than 20% failing
      components.webhooks.status = 'failing';
      issues.push('High webhook failure rate');
    } else if (failedWebhooks.length > 0) {
      components.webhooks.status = 'delayed';
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (components.database.status === 'down' || components.stripe.status === 'down') {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return { status, components, issues };
  }

  // Private helper methods
  
  private static async processIndividualPayment(paymentIntentId: string): Promise<void> {
    // Placeholder for individual payment processing logic
    // This would typically involve checking status, updating records, etc.
    console.log(`Processing payment intent: ${paymentIntentId}`);
  }
}

/**
 * Performance monitoring middleware
 */
export class PaymentMonitoring {
  private static metrics = new Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    lastReset: number;
  }>();

  static trackOperation<T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    return fn()
      .then((result) => {
        this.recordMetric(operationName, Date.now() - start, false);
        return result;
      })
      .catch((error) => {
        this.recordMetric(operationName, Date.now() - start, true);
        throw error;
      });
  }

  private static recordMetric(operation: string, duration: number, isError: boolean): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalTime: 0,
      errors: 0,
      lastReset: Date.now(),
    };

    // Reset metrics every hour
    if (Date.now() - existing.lastReset > 60 * 60 * 1000) {
      existing.count = 0;
      existing.totalTime = 0;
      existing.errors = 0;
      existing.lastReset = Date.now();
    }

    existing.count++;
    existing.totalTime += duration;
    if (isError) existing.errors++;

    this.metrics.set(operation, existing);
  }

  static getMetrics(): Record<string, {
    count: number;
    averageTime: number;
    errorRate: number;
    throughput: number; // ops per minute
  }> {
    const result: Record<string, any> = {};
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const timeElapsed = Date.now() - metrics.lastReset;
      const minutesElapsed = timeElapsed / (60 * 1000);
      
      result[operation] = {
        count: metrics.count,
        averageTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0,
        throughput: minutesElapsed > 0 ? metrics.count / minutesElapsed : 0,
      };
    }

    return result;
  }
}