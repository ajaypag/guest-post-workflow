/**
 * Test Utilities for Target URL Matching Tests
 * 
 * Provides helper functions, mock data generators, and test utilities
 * to support comprehensive testing of target URL matching functionality.
 */

import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { TargetPage, Client } from '@/types/user';
import { Page } from '@playwright/test';

// Types for test configuration
export interface TestConfig {
  baseURL: string;
  testClientId: string;
  testProjectId: string;
  useRealData: boolean;
  timeout: number;
  maxConcurrent: number;
}

export interface MockAPIResponse {
  success: boolean;
  totalQualified?: number;
  totalMatched?: number;
  matchDistribution?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  targetPageCoverage?: Array<{
    url: string;
    assignedDomains: number;
  }>;
  error?: string;
  details?: string;
}

// Test data generator class
export class TargetMatchingTestDataGenerator {
  /**
   * Generate a complete BulkAnalysisDomain with target matching data
   */
  static generateDomainWithTargetMatch(
    matchQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent',
    overrides: Partial<BulkAnalysisDomain> = {}
  ): BulkAnalysisDomain {
    const baseId = `domain-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const targetMatchData = {
      target_analysis: [
        {
          target_url: `https://client.com/target-${matchQuality}`,
          overlap_status: matchQuality === 'excellent' || matchQuality === 'good' ? 'direct' : 'related',
          strength_direct: matchQuality === 'excellent' ? 'strong' : matchQuality === 'good' ? 'moderate' : 'weak',
          strength_related: 'moderate',
          match_quality: matchQuality,
          evidence: {
            direct_count: matchQuality === 'excellent' ? 10 : matchQuality === 'good' ? 5 : 2,
            direct_median_position: matchQuality === 'excellent' ? 10 : matchQuality === 'good' ? 20 : 40,
            direct_keywords: this.generateKeywords(matchQuality === 'excellent' ? 5 : 2, 'direct'),
            related_count: 5,
            related_median_position: 25,
            related_keywords: this.generateKeywords(3, 'related')
          },
          reasoning: `This domain shows ${matchQuality} match quality based on keyword overlap and ranking strength`
        }
      ],
      best_target_url: `https://client.com/target-${matchQuality}`,
      recommendation_summary: `${matchQuality.charAt(0).toUpperCase() + matchQuality.slice(1)} match recommendation`
    };

    return {
      id: baseId,
      clientId: 'test-client-123',
      domain: `${matchQuality}-match-example.com`,
      qualificationStatus: matchQuality === 'poor' ? 'marginal_quality' : 'high_quality',
      keywordCount: Math.floor(Math.random() * 50) + 10,
      targetPageIds: ['target-page-1'],
      suggestedTargetUrl: `https://client.com/target-${matchQuality}`,
      targetMatchData,
      targetMatchedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate multiple domains with different match qualities
   */
  static generateMixedQualityDomains(count: number = 4): BulkAnalysisDomain[] {
    const qualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor'];
    
    return Array.from({ length: count }, (_, index) => {
      const quality = qualities[index % qualities.length];
      return this.generateDomainWithTargetMatch(quality, {
        id: `mixed-domain-${index + 1}`,
        domain: `mixed-${quality}-${index + 1}.com`
      });
    });
  }

  /**
   * Generate domains without target matching data (for testing states)
   */
  static generateUnmatchedQualifiedDomains(count: number = 3): BulkAnalysisDomain[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `unmatched-domain-${index + 1}`,
      clientId: 'test-client-123',
      domain: `unmatched-qualified-${index + 1}.com`,
      qualificationStatus: 'high_quality' as const,
      keywordCount: Math.floor(Math.random() * 30) + 10,
      targetPageIds: ['target-page-1'],
      // No suggestedTargetUrl, targetMatchData, or targetMatchedAt
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Generate domains with various qualification statuses
   */
  static generateMixedQualificationDomains(): BulkAnalysisDomain[] {
    const statuses = ['pending', 'high_quality', 'good_quality', 'marginal_quality', 'disqualified'] as const;
    
    return statuses.map((status, index) => ({
      id: `${status}-domain-${index + 1}`,
      clientId: 'test-client-123',
      domain: `${status.replace('_', '-')}-example-${index + 1}.com`,
      qualificationStatus: status,
      keywordCount: Math.floor(Math.random() * 40) + 5,
      targetPageIds: status !== 'disqualified' ? ['target-page-1'] : [],
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Generate target pages for testing
   */
  static generateTargetPages(count: number = 3): TargetPage[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `target-page-${index + 1}`,
      url: `https://client.com/target-page-${index + 1}`,
      keywords: this.generateKeywordList(5),
      description: `Target page ${index + 1} for guest post campaigns`,
      clientId: 'test-client-123'
    }));
  }

  /**
   * Generate client with target pages
   */
  static generateTestClient(targetPageCount: number = 3): Client {
    return {
      id: 'test-client-123',
      name: 'Test Client Company',
      email: 'test@client.com',
      userId: 'test-user-123'
    };
  }

  /**
   * Helper: Generate keyword list with positions
   */
  private static generateKeywords(count: number, type: 'direct' | 'related'): string[] {
    const baseKeywords = type === 'direct' 
      ? ['seo optimization', 'link building', 'content marketing', 'digital strategy', 'search ranking']
      : ['marketing trends', 'online presence', 'web analytics', 'brand awareness', 'lead generation'];

    return Array.from({ length: count }, (_, index) => {
      const keyword = baseKeywords[index % baseKeywords.length];
      const position = type === 'direct' 
        ? Math.floor(Math.random() * 30) + 1 
        : Math.floor(Math.random() * 50) + 20;
      return `${keyword} (pos #${position})`;
    });
  }

  /**
   * Helper: Generate simple keyword list
   */
  private static generateKeywordList(count: number): string[] {
    const keywords = [
      'seo optimization', 'link building', 'content marketing', 'digital strategy', 
      'search ranking', 'website traffic', 'conversion rate', 'brand awareness',
      'lead generation', 'marketing automation', 'social media', 'ppc advertising'
    ];
    
    return Array.from({ length: count }, (_, index) => 
      keywords[index % keywords.length]
    );
  }

  /**
   * Generate mock API responses for different scenarios
   */
  static generateMockAPIResponse(scenario: 'success' | 'no_domains' | 'no_targets' | 'partial_success' | 'error'): MockAPIResponse {
    switch (scenario) {
      case 'success':
        return {
          success: true,
          totalQualified: 5,
          totalMatched: 5,
          matchDistribution: {
            excellent: 2,
            good: 2,
            fair: 1,
            poor: 0
          },
          targetPageCoverage: [
            { url: 'https://client.com/target-1', assignedDomains: 2 },
            { url: 'https://client.com/target-2', assignedDomains: 2 },
            { url: 'https://client.com/target-3', assignedDomains: 1 }
          ]
        };

      case 'no_domains':
        return {
          success: false,
          error: 'No qualified domains found',
          details: 'Only domains with high_quality or good_quality qualification can be matched to target URLs'
        };

      case 'no_targets':
        return {
          success: false,
          error: 'No target pages found for client',
          details: 'Please add target pages to the client before running target URL matching'
        };

      case 'partial_success':
        return {
          success: true,
          totalQualified: 10,
          totalMatched: 7,
          matchDistribution: {
            excellent: 2,
            good: 3,
            fair: 2,
            poor: 0
          },
          targetPageCoverage: [
            { url: 'https://client.com/target-1', assignedDomains: 4 },
            { url: 'https://client.com/target-2', assignedDomains: 3 }
          ]
        };

      case 'error':
        return {
          success: false,
          error: 'Failed to match target URLs',
          details: 'AI service timeout - please try again'
        };

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}

// Page object helper for Playwright tests
export class TargetMatchingPageHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to bulk analysis project page
   */
  async navigateToProject(clientId: string, projectId: string) {
    await this.page.goto(`/clients/${clientId}/bulk-analysis/projects/${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select domains by checkbox
   */
  async selectDomains(domainIds: string[]) {
    for (const domainId of domainIds) {
      const checkbox = this.page.locator(`[data-domain-id="${domainId}"] input[type="checkbox"]`);
      await checkbox.check();
    }
  }

  /**
   * Click the "Match Target URLs" button
   */
  async clickMatchTargetUrls() {
    const button = this.page.locator('button:has-text("Match Target URLs")');
    await button.click();
  }

  /**
   * Wait for target matching to complete
   */
  async waitForMatchingComplete(timeout: number = 30000) {
    // Wait for either success indicator or error message
    await this.page.waitForSelector(
      'text="AI Suggested", [data-testid="error-message"]',
      { timeout }
    );
  }

  /**
   * Get match quality indicators
   */
  async getMatchQualityIndicators() {
    const indicators = await this.page.locator('[data-testid*="match-quality"]').allInnerTexts();
    return indicators.map(text => {
      if (text.includes('🎯')) return 'excellent';
      if (text.includes('✅')) return 'good';
      if (text.includes('⚠️')) return 'fair';
      if (text.includes('❌')) return 'poor';
      return 'unknown';
    });
  }

  /**
   * Expand domain detail modal
   */
  async expandDomainDetail(domainId: string) {
    const expandButton = this.page.locator(`[data-domain-id="${domainId}"] [data-testid="expand-domain-button"]`);
    await expandButton.click();
  }

  /**
   * Get target analysis from expanded modal
   */
  async getTargetAnalysis() {
    return {
      hasAnalysis: await this.page.locator('h4:has-text("AI Target URL Analysis")').isVisible(),
      targetUrls: await this.page.locator('[data-testid="target-url"]').allInnerTexts(),
      evidence: {
        directKeywords: await this.page.locator('[data-testid="direct-keywords"] .keyword').allInnerTexts(),
        relatedKeywords: await this.page.locator('[data-testid="related-keywords"] .keyword').allInnerTexts()
      },
      reasoning: await this.page.locator('[data-testid="match-reasoning"]').textContent()
    };
  }

  /**
   * Check if bulk action button is visible and enabled
   */
  async checkBulkActionButton() {
    const button = this.page.locator('button:has-text("Match Target URLs")');
    return {
      isVisible: await button.isVisible(),
      isEnabled: await button.isEnabled(),
      count: await this.extractCountFromButton()
    };
  }

  /**
   * Extract domain count from button text
   */
  private async extractCountFromButton(): Promise<number> {
    const buttonText = await this.page.locator('button:has-text("Match Target URLs")').textContent();
    const match = buttonText?.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Simulate API response for testing
   */
  async mockTargetMatchingAPI(response: MockAPIResponse) {
    await this.page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      await route.fulfill({
        status: response.success ? 200 : 400,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock domain data for testing
   */
  async mockDomainData(domains: BulkAnalysisDomain[]) {
    await this.page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ domains })
      });
    });
  }

  /**
   * Check for error messages
   */
  async getErrorMessages() {
    const errorElements = this.page.locator('[data-testid="error-message"], .error-message, .text-red-600');
    return await errorElements.allInnerTexts();
  }

  /**
   * Check loading states
   */
  async checkLoadingStates() {
    return {
      hasSpinner: await this.page.locator('[data-testid="loading-spinner"]').isVisible(),
      buttonDisabled: await this.page.locator('button:has-text("Match Target URLs")').isDisabled(),
      loadingText: await this.page.locator('text="Matching URLs..."').isVisible()
    };
  }
}

// Mock data presets for common test scenarios
export const TestDataPresets = {
  // Complete dataset with all match qualities
  COMPLETE_DATASET: TargetMatchingTestDataGenerator.generateMixedQualityDomains(8),
  
  // Only excellent matches
  EXCELLENT_MATCHES_ONLY: Array.from({ length: 3 }, (_, i) => 
    TargetMatchingTestDataGenerator.generateDomainWithTargetMatch('excellent', {
      id: `excellent-${i + 1}`,
      domain: `excellent-example-${i + 1}.com`
    })
  ),
  
  // Qualified but unmatched domains
  QUALIFIED_UNMATCHED: TargetMatchingTestDataGenerator.generateUnmatchedQualifiedDomains(5),
  
  // Mixed qualification statuses
  MIXED_QUALIFICATION: TargetMatchingTestDataGenerator.generateMixedQualificationDomains(),
  
  // Large dataset for performance testing
  LARGE_DATASET: Array.from({ length: 50 }, (_, i) => {
    const qualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor'];
    const quality = qualities[i % qualities.length];
    return TargetMatchingTestDataGenerator.generateDomainWithTargetMatch(quality, {
      id: `large-dataset-${i + 1}`,
      domain: `large-${quality}-${i + 1}.com`
    });
  }),

  // Standard target pages
  STANDARD_TARGET_PAGES: TargetMatchingTestDataGenerator.generateTargetPages(4),

  // Test client
  TEST_CLIENT: TargetMatchingTestDataGenerator.generateTestClient()
};

// Authentication helper for tests
export class AuthHelper {
  /**
   * Mock internal user authentication
   */
  static async mockInternalUser(page: Page) {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-internal-token');
      window.sessionStorage.setItem('user_session', JSON.stringify({
        userId: 'internal-user-123',
        userType: 'internal',
        name: 'Internal Test User',
        permissions: ['target_matching', 'bulk_analysis']
      }));
    });
  }

  /**
   * Mock account user authentication
   */
  static async mockAccountUser(page: Page, clientId: string) {
    await page.addInitScript((clientId) => {
      window.localStorage.setItem('auth_token', 'mock-account-token');
      window.sessionStorage.setItem('user_session', JSON.stringify({
        userId: 'account-user-123',
        userType: 'account',
        name: 'Account Test User',
        accountId: clientId
      }));
    }, clientId);
  }

  /**
   * Clear authentication
   */
  static async clearAuth(page: Page) {
    await page.addInitScript(() => {
      window.localStorage.removeItem('auth_token');
      window.sessionStorage.removeItem('user_session');
    });
  }
}

// Performance testing utilities
export class PerformanceHelper {
  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(measurements: Array<{ name: string; duration: number }>) {
    const total = measurements.reduce((sum, m) => sum + m.duration, 0);
    const average = total / measurements.length;
    const max = Math.max(...measurements.map(m => m.duration));
    const min = Math.min(...measurements.map(m => m.duration));

    return {
      total: Math.round(total),
      average: Math.round(average),
      max: Math.round(max),
      min: Math.round(min),
      measurements: measurements.map(m => ({
        name: m.name,
        duration: Math.round(m.duration)
      }))
    };
  }
}

// Visual testing utilities
export class VisualTestHelper {
  constructor(private page: Page) {}

  /**
   * Take screenshot of match quality indicators
   */
  async screenshotMatchQualityIndicators() {
    const indicators = this.page.locator('[data-testid*="match-quality"]');
    return await indicators.first().screenshot();
  }

  /**
   * Take screenshot of target analysis modal
   */
  async screenshotTargetAnalysisModal() {
    const modal = this.page.locator('[data-testid="target-analysis-section"]');
    return await modal.screenshot();
  }

  /**
   * Compare visual elements
   */
  async compareVisualElements(selector: string, expectedScreenshotPath: string) {
    const element = this.page.locator(selector);
    return await element.screenshot({ 
      path: expectedScreenshotPath,
      animations: 'disabled'
    });
  }
}

// Export all utilities
export default {
  TargetMatchingTestDataGenerator,
  TargetMatchingPageHelper,
  TestDataPresets,
  AuthHelper,
  PerformanceHelper,
  VisualTestHelper
};