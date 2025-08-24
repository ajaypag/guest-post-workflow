/**
 * Network resilience utilities
 * Provides retry logic, error handling, and graceful degradation
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
  onRetry: () => {}
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), opts.timeout);
      });

      // Race between the actual operation and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      // Check if we should retry
      if (attempt < opts.maxAttempts) {
        opts.onRetry(attempt, error);
        
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next attempt
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      }
    }
  }

  // All attempts failed
  throw new NetworkError(
    `Operation failed after ${opts.maxAttempts} attempts`,
    lastError
  );
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  // Don't retry on client errors (4xx)
  if (error.status && error.status >= 400 && error.status < 500) {
    // Except for rate limiting (429) and request timeout (408)
    return error.status !== 429 && error.status !== 408;
  }

  // Don't retry on specific error messages
  const nonRetryableMessages = [
    'invalid credentials',
    'unauthorized',
    'forbidden',
    'invalid input',
    'validation error'
  ];

  const errorMessage = error.message?.toLowerCase() || '';
  return nonRetryableMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Custom error class for network-related errors
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Fetch with automatic retry and error handling
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(retryOptions.timeout || 30000)
    });

    // Throw error for non-2xx responses
    if (!response.ok) {
      const error = new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        undefined,
        `HTTP_${response.status}`
      );
      (error as any).status = response.status;
      throw error;
    }

    return response;
  }, retryOptions);
}

/**
 * Submit form data with retry logic and optimistic UI updates
 */
export async function resilientFormSubmit<T>(
  url: string,
  data: any,
  options: {
    onOptimisticUpdate?: () => void;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    onRetry?: (attempt: number) => void;
    retryOptions?: RetryOptions;
  } = {}
): Promise<T> {
  // Optimistic update
  if (options.onOptimisticUpdate) {
    options.onOptimisticUpdate();
  }

  try {
    const result = await withRetry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new NetworkError(
          errorData.error || `HTTP ${response.status}`,
          errorData,
          `HTTP_${response.status}`
        );
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    }, {
      ...options.retryOptions,
      onRetry: (attempt, error) => {
        if (options.onRetry) {
          options.onRetry(attempt);
        }
        if (options.retryOptions?.onRetry) {
          options.retryOptions.onRetry(attempt, error);
        }
      }
    });

    if (options.onSuccess) {
      options.onSuccess(result);
    }

    return result;
  } catch (error) {
    if (options.onError) {
      options.onError(error);
    }
    throw error;
  }
}

/**
 * Check network connectivity
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Monitor network status changes
 */
export function monitorNetworkStatus(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    console.log('Network: Online');
    onOnline();
  };

  const handleOffline = () => {
    console.log('Network: Offline');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Create a debounced save function with network awareness
 */
export function createResilientAutoSave<T>(
  saveFn: (data: T) => Promise<void>,
  delay: number = 1000
): {
  save: (data: T) => void;
  saveNow: (data: T) => Promise<void>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingData: T | null = null;
  let isSaving = false;

  const executeSave = async (data: T) => {
    if (isSaving) return;
    
    if (!isOnline()) {
      // Queue for when network returns
      pendingData = data;
      return;
    }

    isSaving = true;
    try {
      await withRetry(() => saveFn(data), {
        maxAttempts: 3,
        initialDelay: 500,
        onRetry: (attempt) => {
          console.log(`Auto-save retry attempt ${attempt}`);
        }
      });
      pendingData = null;
    } catch (error) {
      console.error('Auto-save failed after retries:', error);
      pendingData = data; // Keep data for manual retry
    } finally {
      isSaving = false;
    }
  };

  // Monitor network to save pending data when back online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      if (pendingData && !isSaving) {
        await executeSave(pendingData);
      }
    });
  }

  return {
    save: (data: T) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        executeSave(data);
      }, delay);
    },
    
    saveNow: async (data: T) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      await executeSave(data);
    },
    
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };
}

/**
 * Queue for offline operations
 */
class OfflineQueue {
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    timestamp: number;
  }> = [];

  add(operation: () => Promise<any>): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.queue.push({
      id,
      operation,
      timestamp: Date.now()
    });
    return id;
  }

  async flush(): Promise<void> {
    if (!isOnline()) return;

    const operations = [...this.queue];
    this.queue = [];

    for (const item of operations) {
      try {
        await withRetry(item.operation, {
          maxAttempts: 3,
          initialDelay: 1000
        });
      } catch (error) {
        console.error(`Failed to sync offline operation ${item.id}:`, error);
        // Re-add to queue if still relevant (< 24 hours old)
        if (Date.now() - item.timestamp < 24 * 60 * 60 * 1000) {
          this.queue.push(item);
        }
      }
    }
  }

  getSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

// Auto-flush queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineQueue.flush();
  });
}