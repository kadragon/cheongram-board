/**
 * Performance Monitoring System
 * Tracks and reports performance metrics for the application
 */

import { logger } from '@/lib/logging/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  apiResponse: number; // ms
  databaseQuery: number; // ms
  pageLoad: number; // ms
  memoryUsage: number; // bytes
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private timers: Map<string, number> = new Map();
  
  private thresholds: PerformanceThresholds = {
    apiResponse: 1000, // 1 second
    databaseQuery: 500, // 500ms
    pageLoad: 3000, // 3 seconds
    memoryUsage: 100 * 1024 * 1024, // 100MB
  };

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }
  }

  // Start timing an operation
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  // End timing and record metric
  endTimer(name: string, context?: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      context,
      metadata,
    });

    // Log warning if duration exceeds threshold
    const threshold = this.getThreshold(name);
    if (threshold && duration > threshold) {
      logger.warn(`Performance threshold exceeded for ${name}`, {
        duration,
        threshold,
        context,
        ...metadata,
      });
    }

    return duration;
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log performance metric
    logger.performance(metric.name, metric.value, {
      unit: metric.unit,
      context: metric.context,
      ...metric.metadata,
    });
  }

  // Get threshold for a specific metric type
  private getThreshold(name: string): number | undefined {
    if (name.includes('api') || name.includes('request')) {
      return this.thresholds.apiResponse;
    }
    if (name.includes('database') || name.includes('query')) {
      return this.thresholds.databaseQuery;
    }
    if (name.includes('page') || name.includes('load')) {
      return this.thresholds.pageLoad;
    }
    return undefined;
  }

  // Measure function execution time
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, context, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, context, { ...metadata, error: true });
      throw error;
    }
  }

  // Measure synchronous function execution time
  measure<T>(
    name: string,
    fn: () => T,
    context?: string,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, context, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, context, { ...metadata, error: true });
      throw error;
    }
  }

  // Record memory usage (Node.js only)
  recordMemoryUsage(context?: string): void {
    if (typeof process === 'undefined') return;

    const memUsage = process.memoryUsage();
    
    this.recordMetric({
      name: 'memory_heap_used',
      value: memUsage.heapUsed,
      unit: 'bytes',
      timestamp: new Date().toISOString(),
      context,
    });

    this.recordMetric({
      name: 'memory_heap_total',
      value: memUsage.heapTotal,
      unit: 'bytes',
      timestamp: new Date().toISOString(),
      context,
    });

    // Log warning if memory usage is high
    if (memUsage.heapUsed > this.thresholds.memoryUsage) {
      logger.warn('High memory usage detected', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        threshold: this.thresholds.memoryUsage,
        context,
      });
    }
  }

  // Get performance statistics
  getStats(metricName?: string, timeRange?: { from: Date; to: Date }): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    let filteredMetrics = this.metrics;

    if (metricName) {
      filteredMetrics = filteredMetrics.filter(m => m.name === metricName);
    }

    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(m => {
        const timestamp = new Date(m.timestamp);
        return timestamp >= timeRange.from && timestamp <= timeRange.to;
      });
    }

    if (filteredMetrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = values[0];
    const max = values[count - 1];
    const p95 = values[Math.floor(count * 0.95)];
    const p99 = values[Math.floor(count * 0.99)];

    return { count, average, min, max, p95, p99 };
  }

  // Get recent metrics
  getRecentMetrics(count: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Export metrics for external monitoring systems
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Create default performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const startTimer = (name: string) => performanceMonitor.startTimer(name);
export const endTimer = (name: string, context?: string, metadata?: Record<string, any>) => 
  performanceMonitor.endTimer(name, context, metadata);

export const measureAsync = <T>(
  name: string,
  fn: () => Promise<T>,
  context?: string,
  metadata?: Record<string, any>
) => performanceMonitor.measureAsync(name, fn, context, metadata);

export const measure = <T>(
  name: string,
  fn: () => T,
  context?: string,
  metadata?: Record<string, any>
) => performanceMonitor.measure(name, fn, context, metadata);

// React hook for client-side performance monitoring
export const usePerformanceMonitor = () => {
  const measurePageLoad = () => {
    if (typeof window === 'undefined') return;

    // Measure page load time using Navigation Timing API
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      performanceMonitor.recordMetric({
        name: 'page_load_time',
        value: loadTime,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        context: 'client',
        metadata: {
          url: window.location.pathname,
        },
      });
    }
  };

  const measureLCP = () => {
    if (typeof window === 'undefined') return;

    // Measure Largest Contentful Paint
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      performanceMonitor.recordMetric({
        name: 'largest_contentful_paint',
        value: lastEntry.startTime,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        context: 'client',
        metadata: {
          url: window.location.pathname,
        },
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  };

  const measureCLS = () => {
    if (typeof window === 'undefined') return;

    // Measure Cumulative Layout Shift
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      
      performanceMonitor.recordMetric({
        name: 'cumulative_layout_shift',
        value: clsValue,
        unit: 'count',
        timestamp: new Date().toISOString(),
        context: 'client',
        metadata: {
          url: window.location.pathname,
        },
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  };

  return {
    measurePageLoad,
    measureLCP,
    measureCLS,
    startTimer,
    endTimer,
    measureAsync,
    measure,
  };
};

export default performanceMonitor;