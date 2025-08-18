// Feature flag configuration for gradual rollout of new features
export interface FeatureFlags {
  streamingOutlineGeneration: boolean;
  debugStreamingLogs: boolean;
  fallbackToPolling: boolean;
  maxStreamingRetries: number;
  streamingTimeout: number;
  
  // Line Items System
  enableLineItemsSystem: boolean;
  lineItemsForNewOrders: boolean;
  lineItemsMigrationUI: boolean;
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
  
  // Line Items System - MIGRATION IN PROGRESS - FORCED ENABLED
  enableLineItemsSystem: true, // FORCED: Migrating to lineItems only
  lineItemsForNewOrders: true, // FORCED: All new orders use lineItems
  lineItemsMigrationUI: true, // Allow migration UI (admin only)
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
    enableLineItemsSystem: true, // Enable line items in development
    lineItemsForNewOrders: process.env.ENABLE_LINE_ITEMS === 'true',
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

// Line Items feature flag helpers
export const isLineItemsSystemEnabled = (): boolean => {
  return true; // FORCED: Migration to lineItems in progress
};

export const shouldUseLineItemsForNewOrders = (): boolean => {
  return featureFlags.lineItemsForNewOrders && featureFlags.enableLineItemsSystem;
};

export const isLineItemsMigrationUIEnabled = (): boolean => {
  return featureFlags.lineItemsMigrationUI;
};

export const enableLineItemsForOrder = (orderId: string): boolean => {
  // Could be extended to check a database table for per-order flags
  const enabledOrders = process.env.LINE_ITEMS_ENABLED_ORDERS?.split(',') || [];
  return enabledOrders.includes(orderId) || isLineItemsSystemEnabled();
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
      lineItemsSystem: featureFlags.enableLineItemsSystem,
      lineItemsNewOrders: featureFlags.lineItemsForNewOrders,
      lineItemsMigration: featureFlags.lineItemsMigrationUI,
      environment: process.env.NODE_ENV
    });
  }
};