// Feature flag configuration for gradual rollout of new features
export interface FeatureFlags {
  streamingOutlineGeneration: boolean;
  debugStreamingLogs: boolean;
  fallbackToPolling: boolean;
  maxStreamingRetries: number;
  streamingTimeout: number;
}

// Default feature flags - conservative rollout approach
const defaultFlags: FeatureFlags = {
  // Main streaming feature flag
  streamingOutlineGeneration: false, // Start disabled for safety
  
  // Debug logging for troubleshooting
  debugStreamingLogs: true, // Enable detailed logging
  
  // Fallback mechanism
  fallbackToPolling: true, // Auto-fallback if streaming fails
  
  // Retry and timeout settings
  maxStreamingRetries: 3,
  streamingTimeout: 900000, // 15 minutes
};

// Environment-specific overrides
const environmentFlags: Partial<FeatureFlags> = {
  // Production overrides
  ...(process.env.NODE_ENV === 'production' && {
    debugStreamingLogs: false, // Reduce noise in production
    streamingOutlineGeneration: process.env.ENABLE_STREAMING === 'true',
  }),
  
  // Development overrides
  ...(process.env.NODE_ENV === 'development' && {
    streamingOutlineGeneration: true, // Enable in development
    debugStreamingLogs: true,
  }),
  
  // Test environment
  ...(process.env.NODE_ENV === 'test' && {
    streamingOutlineGeneration: false, // Disable in tests
    debugStreamingLogs: false,
    streamingTimeout: 30000, // Shorter timeout for tests
  })
};

// Merge default flags with environment overrides
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...environmentFlags
};

// Helper functions for feature flag checks
export const isStreamingEnabled = (): boolean => {
  return featureFlags.streamingOutlineGeneration;
};

export const shouldUseFallback = (): boolean => {
  return featureFlags.fallbackToPolling;
};

export const isDebugEnabled = (): boolean => {
  return featureFlags.debugStreamingLogs;
};

export const getStreamingTimeout = (): number => {
  return featureFlags.streamingTimeout;
};

export const getMaxRetries = (): number => {
  return featureFlags.maxStreamingRetries;
};

// Admin function to temporarily enable streaming for specific workflow
export const enableStreamingForWorkflow = (workflowId: string): boolean => {
  // Could be extended to check a database table or Redis for per-workflow flags
  // For now, just check environment variable
  const enabledWorkflows = process.env.STREAMING_ENABLED_WORKFLOWS?.split(',') || [];
  return enabledWorkflows.includes(workflowId) || isStreamingEnabled();
};

// Log current feature flag status (useful for debugging)
export const logFeatureFlags = () => {
  if (isDebugEnabled()) {
    console.log('🏁 Feature Flags Status:', {
      streaming: featureFlags.streamingOutlineGeneration,
      fallback: featureFlags.fallbackToPolling,
      debug: featureFlags.debugStreamingLogs,
      timeout: featureFlags.streamingTimeout,
      maxRetries: featureFlags.maxStreamingRetries,
      environment: process.env.NODE_ENV
    });
  }
};