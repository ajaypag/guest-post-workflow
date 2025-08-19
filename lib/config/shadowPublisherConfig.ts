/**
 * Configuration for Shadow Publisher System
 * Centralized settings for confidence thresholds and processing rules
 */

export interface ShadowPublisherConfig {
  confidence: {
    autoApprove: number;      // Threshold for automatic approval
    mediumReview: number;     // Threshold for review with auto-approval timer
    lowReview: number;        // Threshold for manual review
    minProcessing: number;    // Minimum confidence to process (below this goes straight to review)
  };
  review: {
    autoApprovalDelayHours: number;  // Hours before auto-approval for medium confidence
    priorityWeights: {
      baseConfidence: number;         // Weight for confidence score in priority calculation
      missingWebsite: number;         // Priority boost for missing website
      missingPricing: number;         // Priority boost for missing pricing
    };
  };
  retry: {
    maxAttempts: number;              // Maximum retry attempts for failed processing
    baseDelayMs: number;              // Base delay for exponential backoff
    maxDelayMs: number;               // Maximum delay between retries
    backoffMultiplier: number;        // Multiplier for exponential backoff
  };
  invitation: {
    expiryDays: number;               // Days before invitation expires
    claimMaxAttempts: number;         // Maximum claim attempts before lockout
    claimLockoutMinutes: number;      // Minutes to lock after max attempts
  };
}

// Default configuration - can be overridden by environment variables
const defaultConfig: ShadowPublisherConfig = {
  confidence: {
    autoApprove: 0.85,
    mediumReview: 0.70,
    lowReview: 0.50,
    minProcessing: 0.30,
  },
  review: {
    autoApprovalDelayHours: 24,
    priorityWeights: {
      baseConfidence: 50,
      missingWebsite: 10,
      missingPricing: 10,
    },
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  invitation: {
    expiryDays: 30,
    claimMaxAttempts: 5,
    claimLockoutMinutes: 30,
  },
};

/**
 * Get configuration value from environment or use default
 */
function getConfigValue<T>(envKey: string, defaultValue: T): T {
  const envValue = process.env[envKey];
  if (!envValue) return defaultValue;
  
  // Handle different types
  if (typeof defaultValue === 'number') {
    const parsed = parseFloat(envValue);
    return (isNaN(parsed) ? defaultValue : parsed) as T;
  }
  
  if (typeof defaultValue === 'boolean') {
    return (envValue.toLowerCase() === 'true') as T;
  }
  
  return envValue as T;
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadShadowPublisherConfig(): ShadowPublisherConfig {
  return {
    confidence: {
      autoApprove: getConfigValue('SHADOW_PUBLISHER_AUTO_APPROVE_THRESHOLD', defaultConfig.confidence.autoApprove),
      mediumReview: getConfigValue('SHADOW_PUBLISHER_MEDIUM_REVIEW_THRESHOLD', defaultConfig.confidence.mediumReview),
      lowReview: getConfigValue('SHADOW_PUBLISHER_LOW_REVIEW_THRESHOLD', defaultConfig.confidence.lowReview),
      minProcessing: getConfigValue('SHADOW_PUBLISHER_MIN_PROCESSING_THRESHOLD', defaultConfig.confidence.minProcessing),
    },
    review: {
      autoApprovalDelayHours: getConfigValue('SHADOW_PUBLISHER_AUTO_APPROVAL_HOURS', defaultConfig.review.autoApprovalDelayHours),
      priorityWeights: {
        baseConfidence: getConfigValue('SHADOW_PUBLISHER_PRIORITY_CONFIDENCE', defaultConfig.review.priorityWeights.baseConfidence),
        missingWebsite: getConfigValue('SHADOW_PUBLISHER_PRIORITY_WEBSITE', defaultConfig.review.priorityWeights.missingWebsite),
        missingPricing: getConfigValue('SHADOW_PUBLISHER_PRIORITY_PRICING', defaultConfig.review.priorityWeights.missingPricing),
      },
    },
    retry: {
      maxAttempts: getConfigValue('SHADOW_PUBLISHER_RETRY_MAX_ATTEMPTS', defaultConfig.retry.maxAttempts),
      baseDelayMs: getConfigValue('SHADOW_PUBLISHER_RETRY_BASE_DELAY', defaultConfig.retry.baseDelayMs),
      maxDelayMs: getConfigValue('SHADOW_PUBLISHER_RETRY_MAX_DELAY', defaultConfig.retry.maxDelayMs),
      backoffMultiplier: getConfigValue('SHADOW_PUBLISHER_RETRY_BACKOFF', defaultConfig.retry.backoffMultiplier),
    },
    invitation: {
      expiryDays: getConfigValue('SHADOW_PUBLISHER_INVITATION_EXPIRY_DAYS', defaultConfig.invitation.expiryDays),
      claimMaxAttempts: getConfigValue('SHADOW_PUBLISHER_CLAIM_MAX_ATTEMPTS', defaultConfig.invitation.claimMaxAttempts),
      claimLockoutMinutes: getConfigValue('SHADOW_PUBLISHER_CLAIM_LOCKOUT_MINUTES', defaultConfig.invitation.claimLockoutMinutes),
    },
  };
}

// Export singleton instance
export const shadowPublisherConfig = loadShadowPublisherConfig();

/**
 * Get confidence level description for a given score
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'very_low' {
  const config = shadowPublisherConfig.confidence;
  
  if (score >= config.autoApprove) return 'high';
  if (score >= config.mediumReview) return 'medium';
  if (score >= config.lowReview) return 'low';
  return 'very_low';
}

/**
 * Calculate review priority based on confidence and missing fields
 */
export function calculateReviewPriority(
  confidence: number,
  missingFields: string[]
): number {
  const weights = shadowPublisherConfig.review.priorityWeights;
  
  let priority = confidence * weights.baseConfidence;
  
  if (missingFields.includes('website')) {
    priority += weights.missingWebsite;
  }
  
  if (missingFields.includes('pricing') || missingFields.includes('guest_post_pricing')) {
    priority += weights.missingPricing;
  }
  
  // Ensure priority is between 0 and 100
  return Math.min(100, Math.max(0, Math.round(priority)));
}

/**
 * Log current configuration (for debugging)
 */
export function logShadowPublisherConfig(): void {
  console.log('Shadow Publisher Configuration:', JSON.stringify(shadowPublisherConfig, null, 2));
}