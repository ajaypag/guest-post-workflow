/**
 * Target URL Matching Test Setup
 * 
 * Specialized setup for target URL matching tests including:
 * - Mock configurations
 * - Test utilities
 * - Global test state
 * - Custom matchers
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Global test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  baseURL: process.env.BASE_URL || 'http://localhost:3001',
  useRealData: process.env.USE_REAL_DATA === 'true',
  skipSlowTests: process.env.SKIP_SLOW_TESTS === 'true'
};

// Make test config available globally
global.TEST_CONFIG = TEST_CONFIG;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({
    id: 'test-client-123',
    projectId: 'test-project-456'
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path'
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className = '', ...props }: any) => (
    <svg 
      className={className} 
      data-testid="mock-icon" 
      role="img"
      {...props}
    />
  );

  return {
    Target: mockIcon,
    CheckCircle: mockIcon,
    XCircle: mockIcon,
    AlertCircle: mockIcon,
    Sparkles: mockIcon,
    ChevronDown: mockIcon,
    ChevronRight: mockIcon,
    ExternalLink: mockIcon,
    Loader2: mockIcon,
    Plus: mockIcon,
    Trash2: mockIcon,
    Search: mockIcon,
    Globe: mockIcon,
    FileText: mockIcon,
    Database: mockIcon,
    RefreshCw: mockIcon,
    TrendingUp: mockIcon,
    ShoppingCart: mockIcon,
    Zap: mockIcon,
    ArrowLeft: mockIcon,
    ArrowRight: mockIcon,
    RotateCcw: mockIcon,
    Brain: mockIcon
  };
});

// Mock database connection
jest.mock('@/lib/db/connection', () => ({
  db: {
    query: {
      bulkAnalysisDomains: {
        findMany: jest.fn(),
        findFirst: jest.fn()
      },
      clients: {
        findFirst: jest.fn()
      }
    },
    execute: jest.fn(),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn()
      })
    }),
    insert: jest.fn()
  }
}));

// Mock AI service
jest.mock('@/lib/services/aiQualificationService', () => ({
  AIQualificationService: jest.fn().mockImplementation(() => ({
    matchTargetUrls: jest.fn().mockResolvedValue([]),
    qualifyDomains: jest.fn().mockResolvedValue([])
  }))
}));

// Mock auth service
jest.mock('@/lib/auth', () => ({
  AuthService: {
    getSession: jest.fn().mockReturnValue({
      userId: 'test-user-123',
      userType: 'internal',
      name: 'Test User'
    }),
    login: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock('@/lib/auth-server', () => ({
  AuthServiceServer: {
    getSession: jest.fn().mockResolvedValue({
      userId: 'test-user-123',
      userType: 'internal',
      name: 'Test User'
    })
  }
}));

// Mock user storage
jest.mock('@/lib/userStorage', () => ({
  clientStorage: {
    getClients: jest.fn().mockResolvedValue([]),
    saveClient: jest.fn(),
    deleteClient: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Map()
  })
);

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3001',
    origin: 'http://localhost:3001',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Custom Jest matchers for target matching tests
expect.extend({
  toHaveMatchQuality(received: any, expected: 'excellent' | 'good' | 'fair' | 'poor') {
    const hasQuality = received?.targetMatchData?.target_analysis?.some(
      (analysis: any) => analysis.match_quality === expected
    );

    if (hasQuality) {
      return {
        message: () => `Expected domain not to have match quality "${expected}"`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected domain to have match quality "${expected}"`,
        pass: false
      };
    }
  },

  toHaveSuggestedTarget(received: any, expectedUrl?: string) {
    const hasSuggestion = Boolean(received?.suggestedTargetUrl);
    
    if (expectedUrl) {
      const hasExpectedUrl = received?.suggestedTargetUrl === expectedUrl;
      return {
        message: () => hasExpectedUrl 
          ? `Expected domain not to have suggested target URL "${expectedUrl}"` 
          : `Expected domain to have suggested target URL "${expectedUrl}", but got "${received?.suggestedTargetUrl}"`,
        pass: hasExpectedUrl
      };
    }

    return {
      message: () => hasSuggestion 
        ? 'Expected domain not to have a suggested target URL' 
        : 'Expected domain to have a suggested target URL',
      pass: hasSuggestion
    };
  },

  toBeQualifiedForMatching(received: any) {
    const isQualified = ['high_quality', 'good_quality'].includes(received?.qualificationStatus);
    
    return {
      message: () => isQualified 
        ? 'Expected domain not to be qualified for target matching' 
        : `Expected domain to be qualified for target matching, but status is "${received?.qualificationStatus}"`,
      pass: isQualified
    };
  },

  toHaveTargetEvidence(received: any, evidenceType: 'direct' | 'related', minCount: number = 1) {
    const evidence = received?.targetMatchData?.target_analysis?.[0]?.evidence;
    const count = evidenceType === 'direct' 
      ? evidence?.direct_count || 0
      : evidence?.related_count || 0;
    
    const hasEvidence = count >= minCount;
    
    return {
      message: () => hasEvidence
        ? `Expected domain not to have ${evidenceType} evidence (count: ${count}, min: ${minCount})`
        : `Expected domain to have ${evidenceType} evidence (count: ${count}, min: ${minCount})`,
      pass: hasEvidence
    };
  }
});

// Declare custom matcher types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveMatchQuality(expected: 'excellent' | 'good' | 'fair' | 'poor'): R;
      toHaveSuggestedTarget(expectedUrl?: string): R;
      toBeQualifiedForMatching(): R;
      toHaveTargetEvidence(evidenceType: 'direct' | 'related', minCount?: number): R;
    }
  }

  var TEST_CONFIG: {
    timeout: number;
    retries: number;
    baseURL: string;
    useRealData: boolean;
    skipSlowTests: boolean;
  };
}

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: async (callback: () => boolean | Promise<boolean>, timeout = 5000) => {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const result = await callback();
        if (result) return true;
      } catch (error) {
        // Continue trying
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Mock API response
  mockAPIResponse: (url: string, response: any, status = 200) => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        headers: new Map([['content-type', 'application/json']])
      })
    );
  },

  // Generate test domain with target matching
  createTestDomain: (overrides = {}) => ({
    id: `test-domain-${Date.now()}`,
    clientId: 'test-client-123',
    domain: 'test-domain.com',
    qualificationStatus: 'high_quality',
    keywordCount: 10,
    targetPageIds: ['target-1'],
    suggestedTargetUrl: 'https://client.com/target',
    targetMatchData: {
      target_analysis: [{
        target_url: 'https://client.com/target',
        match_quality: 'excellent',
        overlap_status: 'direct',
        strength_direct: 'strong',
        evidence: {
          direct_count: 5,
          related_count: 3,
          direct_keywords: ['keyword1 (pos #10)'],
          related_keywords: ['keyword2 (pos #25)']
        },
        reasoning: 'Test reasoning'
      }],
      best_target_url: 'https://client.com/target',
      recommendation_summary: 'Test recommendation'
    },
    targetMatchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),

  // Cleanup function for tests
  cleanup: () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        headers: new Map()
      })
    );
  }
};

// Global setup for each test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Reset timers
  jest.clearAllTimers();
  
  // Clear console spies if they exist
  if (jest.isMockFunction(console.error)) {
    console.error.mockClear();
  }
  if (jest.isMockFunction(console.warn)) {
    console.warn.mockClear();
  }
  if (jest.isMockFunction(console.log)) {
    console.log.mockClear();
  }
});

// Global teardown for each test
afterEach(() => {
  global.testUtils.cleanup();
});

// Console error/warning suppression for known issues
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress known React warnings during tests
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: validateDOMNesting') ||
     args[0].includes('Warning: Each child in a list should have a unique "key" prop'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  // Suppress known warnings during tests
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: Function components cannot be given refs') ||
     args[0].includes('Warning: forwardRef'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Test timeout configuration
jest.setTimeout(TEST_CONFIG.timeout);

// Export test configuration
export { TEST_CONFIG };
export default global.testUtils;