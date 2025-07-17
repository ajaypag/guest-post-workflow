/**
 * Feature Flags Test Suite
 * 
 * Tests feature flag behavior, environment handling, and gradual rollout
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  featureFlags, 
  isStreamingEnabled, 
  shouldUseFallback, 
  isDebugEnabled,
  getStreamingTimeout,
  getMaxRetries,
  enableStreamingForWorkflow
} from '@/lib/config/featureFlags';

describe('Feature Flags Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment-based Feature Flags', () => {
    test('should enable streaming in development environment', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      
      // Act
      const isEnabled = isStreamingEnabled();
      
      // Assert
      expect(isEnabled).toBe(true);
    });

    test('should disable streaming in production by default', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_STREAMING;
      
      // Act
      const isEnabled = isStreamingEnabled();
      
      // Assert
      expect(isEnabled).toBe(false);
    });

    test('should enable streaming in production when explicitly set', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_STREAMING = 'true';
      
      // Act
      const isEnabled = isStreamingEnabled();
      
      // Assert
      expect(isEnabled).toBe(true);
    });

    test('should disable streaming in test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      
      // Act
      const isEnabled = isStreamingEnabled();
      
      // Assert
      expect(isEnabled).toBe(false);
    });
  });

  describe('Fallback Behavior', () => {
    test('should enable fallback by default', () => {
      // Act
      const fallbackEnabled = shouldUseFallback();
      
      // Assert
      expect(fallbackEnabled).toBe(true);
    });

    test('should provide appropriate timeout for environment', () => {
      // Test environment should have shorter timeout
      process.env.NODE_ENV = 'test';
      
      // Act
      const timeout = getStreamingTimeout();
      
      // Assert
      expect(timeout).toBe(30000); // 30 seconds for tests
    });

    test('should provide production timeout for production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const timeout = getStreamingTimeout();
      
      // Assert
      expect(timeout).toBe(900000); // 15 minutes for production
    });
  });

  describe('Debug Settings', () => {
    test('should enable debug in development', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      
      // Act
      const debugEnabled = isDebugEnabled();
      
      // Assert
      expect(debugEnabled).toBe(true);
    });

    test('should disable debug in production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const debugEnabled = isDebugEnabled();
      
      // Assert
      expect(debugEnabled).toBe(false);
    });
  });

  describe('Per-Workflow Feature Flags', () => {
    test('should enable streaming for specific workflows', () => {
      // Arrange
      process.env.STREAMING_ENABLED_WORKFLOWS = 'workflow-1,workflow-2,workflow-3';
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_STREAMING;
      
      // Act
      const isEnabledForWorkflow1 = enableStreamingForWorkflow('workflow-1');
      const isEnabledForWorkflow4 = enableStreamingForWorkflow('workflow-4');
      
      // Assert
      expect(isEnabledForWorkflow1).toBe(true);
      expect(isEnabledForWorkflow4).toBe(false);
    });

    test('should fall back to global flag when workflow not in list', () => {
      // Arrange
      process.env.STREAMING_ENABLED_WORKFLOWS = 'workflow-1,workflow-2';
      process.env.ENABLE_STREAMING = 'true';
      
      // Act
      const isEnabledForWorkflow3 = enableStreamingForWorkflow('workflow-3');
      
      // Assert
      expect(isEnabledForWorkflow3).toBe(true); // Falls back to global flag
    });

    test('should handle empty workflow list gracefully', () => {
      // Arrange
      process.env.STREAMING_ENABLED_WORKFLOWS = '';
      delete process.env.ENABLE_STREAMING;
      
      // Act
      const isEnabledForWorkflow = enableStreamingForWorkflow('any-workflow');
      
      // Assert
      expect(isEnabledForWorkflow).toBe(false);
    });
  });

  describe('Retry and Timeout Configuration', () => {
    test('should provide appropriate retry count', () => {
      // Act
      const maxRetries = getMaxRetries();
      
      // Assert
      expect(maxRetries).toBe(3);
      expect(typeof maxRetries).toBe('number');
    });

    test('should provide timeout in milliseconds', () => {
      // Act
      const timeout = getStreamingTimeout();
      
      // Assert
      expect(timeout).toBeGreaterThan(0);
      expect(timeout % 1000).toBe(0); // Should be in seconds
    });
  });

  describe('Feature Flag Object Structure', () => {
    test('should contain all required feature flags', () => {
      // Act
      const flags = featureFlags;
      
      // Assert
      expect(flags).toHaveProperty('streamingOutlineGeneration');
      expect(flags).toHaveProperty('debugStreamingLogs');
      expect(flags).toHaveProperty('fallbackToPolling');
      expect(flags).toHaveProperty('maxStreamingRetries');
      expect(flags).toHaveProperty('streamingTimeout');
    });

    test('should have boolean flags as booleans', () => {
      // Act
      const flags = featureFlags;
      
      // Assert
      expect(typeof flags.streamingOutlineGeneration).toBe('boolean');
      expect(typeof flags.debugStreamingLogs).toBe('boolean');
      expect(typeof flags.fallbackToPolling).toBe('boolean');
    });

    test('should have numeric configs as numbers', () => {
      // Act
      const flags = featureFlags;
      
      // Assert
      expect(typeof flags.maxStreamingRetries).toBe('number');
      expect(typeof flags.streamingTimeout).toBe('number');
      expect(flags.maxStreamingRetries).toBeGreaterThan(0);
      expect(flags.streamingTimeout).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle undefined environment variables', () => {
      // Arrange
      delete process.env.ENABLE_STREAMING;
      delete process.env.STREAMING_ENABLED_WORKFLOWS;
      delete process.env.NODE_ENV;
      
      // Act & Assert - Should not throw
      expect(() => isStreamingEnabled()).not.toThrow();
      expect(() => shouldUseFallback()).not.toThrow();
      expect(() => enableStreamingForWorkflow('test')).not.toThrow();
    });

    test('should handle invalid boolean environment variables', () => {
      // Arrange
      process.env.ENABLE_STREAMING = 'invalid';
      
      // Act
      const isEnabled = isStreamingEnabled();
      
      // Assert
      expect(isEnabled).toBe(false); // Should default to false for invalid values
    });

    test('should handle malformed workflow list', () => {
      // Arrange
      process.env.STREAMING_ENABLED_WORKFLOWS = ',,,invalid,,workflow-1,,,';
      
      // Act
      const isEnabledForWorkflow1 = enableStreamingForWorkflow('workflow-1');
      const isEnabledForInvalid = enableStreamingForWorkflow('invalid');
      
      // Assert
      expect(isEnabledForWorkflow1).toBe(true);
      expect(isEnabledForInvalid).toBe(true); // Present in list despite malformed format
    });

    test('should provide safe defaults when environment is corrupted', () => {
      // Arrange
      process.env.NODE_ENV = undefined as any;
      delete process.env.ENABLE_STREAMING;
      delete process.env.STREAMING_ENABLED_WORKFLOWS;
      
      // Act
      const flags = featureFlags;
      
      // Assert
      expect(flags.streamingOutlineGeneration).toBe(false); // Safe default
      expect(flags.fallbackToPolling).toBe(true); // Safe default
      expect(flags.maxStreamingRetries).toBeGreaterThan(0);
      expect(flags.streamingTimeout).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Flag Updates', () => {
    test('should reflect environment changes', () => {
      // Arrange
      delete process.env.ENABLE_STREAMING;
      const initialState = isStreamingEnabled();
      
      // Act
      process.env.ENABLE_STREAMING = 'true';
      const updatedState = isStreamingEnabled();
      
      // Assert
      expect(initialState).toBe(false);
      expect(updatedState).toBe(true);
    });

    test('should handle rapid flag toggles', () => {
      // Arrange & Act
      for (let i = 0; i < 100; i++) {
        process.env.ENABLE_STREAMING = i % 2 === 0 ? 'true' : undefined as any;
        const state = isStreamingEnabled();
        expect(typeof state).toBe('boolean');
      }
      
      // Assert - Should handle rapid changes without errors
      expect(true).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    test('should evaluate flags quickly', () => {
      // Arrange
      const iterations = 10000;
      
      // Act
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        isStreamingEnabled();
        shouldUseFallback();
        isDebugEnabled();
      }
      const duration = Date.now() - startTime;
      
      // Assert - Should be very fast
      expect(duration).toBeLessThan(100); // 100ms for 10k evaluations
    });

    test('should not cause memory leaks with repeated calls', () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Act
      for (let i = 0; i < 1000; i++) {
        isStreamingEnabled();
        enableStreamingForWorkflow(`workflow-${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Assert - Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(1024 * 1024); // Less than 1MB growth
    });
  });
});

/**
 * Integration Tests with Real Environment
 */
describe('Feature Flags Integration', () => {
  test('should work correctly in different deployment scenarios', () => {
    const scenarios = [
      { env: 'development', expected: { streaming: true, debug: true } },
      { env: 'production', expected: { streaming: false, debug: false } },
      { env: 'test', expected: { streaming: false, debug: false } }
    ];

    scenarios.forEach(({ env, expected }) => {
      process.env.NODE_ENV = env;
      delete process.env.ENABLE_STREAMING;
      
      expect(isStreamingEnabled()).toBe(expected.streaming);
      expect(isDebugEnabled()).toBe(expected.debug);
    });
  });

  test('should support gradual rollout patterns', () => {
    // Scenario: Enable streaming for 25% of workflows
    const testWorkflows = Array.from({ length: 100 }, (_, i) => `workflow-${i}`);
    const enabledWorkflows = testWorkflows.slice(0, 25).join(',');
    
    process.env.STREAMING_ENABLED_WORKFLOWS = enabledWorkflows;
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_STREAMING;
    
    const enabledCount = testWorkflows.filter(w => enableStreamingForWorkflow(w)).length;
    
    expect(enabledCount).toBe(25); // Exactly 25% enabled
  });

  test('should support emergency rollback', () => {
    // Scenario: Emergency disable of streaming
    process.env.ENABLE_STREAMING = 'true';
    process.env.STREAMING_ENABLED_WORKFLOWS = 'workflow-1,workflow-2';
    
    // Confirm streaming is enabled
    expect(isStreamingEnabled()).toBe(true);
    expect(enableStreamingForWorkflow('workflow-1')).toBe(true);
    
    // Emergency rollback
    delete process.env.ENABLE_STREAMING;
    delete process.env.STREAMING_ENABLED_WORKFLOWS;
    
    // Confirm streaming is disabled
    expect(isStreamingEnabled()).toBe(false);
    expect(enableStreamingForWorkflow('workflow-1')).toBe(false);
  });
});

export {};