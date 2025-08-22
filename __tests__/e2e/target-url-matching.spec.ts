import { test, expect } from '@playwright/test';
import { AuthService } from '@/lib/auth';

/**
 * E2E Tests for Target URL Matching Feature (Phase 4)
 * 
 * This test suite validates the frontend UI components for target URL matching
 * implemented in Phase 4. Tests the following features:
 * 
 * 1. BulkAnalysisTable component with target matching columns
 * 2. MatchQualityIndicator component 
 * 3. "Match Target URLs" bulk action button
 * 4. Domain detail modal with target analysis
 * 5. API integration and error handling
 * 6. Real data testing with local database
 */

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3001',
  testClientId: process.env.TEST_CLIENT_ID || 'test-client-id',
  testProjectId: process.env.TEST_PROJECT_ID || 'test-project-id',
  // Test with real data from marketing worktree database
  useRealData: true,
  timeout: 30000 // 30 seconds for AI operations
};

// Test data factory for creating test domains with target matching data
class TargetMatchingTestData {
  static createDomainWithTargetMatch(overrides = {}) {
    return {
      id: `domain-${Date.now()}-${Math.random()}`,
      domain: 'example-domain.com',
      qualificationStatus: 'high_quality',
      suggestedTargetUrl: 'https://client.com/target-page',
      targetMatchData: {
        target_analysis: [
          {
            target_url: 'https://client.com/target-page',
            overlap_status: 'direct',
            strength_direct: 'strong',
            strength_related: 'moderate',
            match_quality: 'excellent',
            evidence: {
              direct_count: 5,
              direct_median_position: 15,
              direct_keywords: ['keyword1 (pos #10)', 'keyword2 (pos #20)'],
              related_count: 3,
              related_median_position: 25,
              related_keywords: ['related1 (pos #25)', 'related2 (pos #30)']
            },
            reasoning: 'Strong direct overlap with excellent ranking positions'
          }
        ],
        best_target_url: 'https://client.com/target-page',
        recommendation_summary: 'Excellent match for this target URL'
      },
      targetMatchedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createMultipleTargetMatches() {
    return [
      this.createDomainWithTargetMatch({
        id: 'excellent-match',
        domain: 'excellent-match.com',
        targetMatchData: {
          target_analysis: [{
            target_url: 'https://client.com/target-1',
            match_quality: 'excellent',
            overlap_status: 'direct',
            strength_direct: 'strong'
          }]
        }
      }),
      this.createDomainWithTargetMatch({
        id: 'good-match',
        domain: 'good-match.com',
        targetMatchData: {
          target_analysis: [{
            target_url: 'https://client.com/target-2',
            match_quality: 'good',
            overlap_status: 'related',
            strength_related: 'moderate'
          }]
        }
      }),
      this.createDomainWithTargetMatch({
        id: 'fair-match',
        domain: 'fair-match.com',
        targetMatchData: {
          target_analysis: [{
            target_url: 'https://client.com/target-3',
            match_quality: 'fair',
            overlap_status: 'related',
            strength_related: 'weak'
          }]
        }
      }),
      this.createDomainWithTargetMatch({
        id: 'poor-match',
        domain: 'poor-match.com',
        targetMatchData: {
          target_analysis: [{
            target_url: 'https://client.com/target-4',
            match_quality: 'poor',
            overlap_status: 'none',
            strength_direct: 'n/a'
          }]
        }
      })
    ];
  }
}

// Authentication helper
async function authenticateAsInternalUser(page) {
  // Mock authentication for testing
  await page.evaluateOnNewDocument(() => {
    window.localStorage.setItem('auth_token', 'test-internal-user-token');
    window.sessionStorage.setItem('user_session', JSON.stringify({
      userId: 'test-user-id',
      userType: 'internal',
      name: 'Test Internal User'
    }));
  });
}

// Navigate to bulk analysis project page
async function navigateToProjectPage(page, clientId = TEST_CONFIG.testClientId, projectId = TEST_CONFIG.testProjectId) {
  const url = `/clients/${clientId}/bulk-analysis/projects/${projectId}`;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

// Test group: Component Rendering Tests
test.describe('Target URL Matching - Component Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should display Target Page column in BulkAnalysisTable', async ({ page }) => {
    await navigateToProjectPage(page);
    
    // Check if Target Page column header exists
    await expect(page.locator('th:has-text("Target Page")')).toBeVisible();
    
    // Verify column structure
    const targetPageCells = page.locator('td[data-testid*="target-page"]');
    await expect(targetPageCells.first()).toBeVisible();
  });

  test('should render MatchQualityIndicator components correctly', async ({ page }) => {
    // Mock domains with different match qualities
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = TargetMatchingTestData.createMultipleTargetMatches();
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);

    // Check for match quality indicators
    await expect(page.locator('[data-testid="match-quality-excellent"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-quality-good"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-quality-fair"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-quality-poor"]')).toBeVisible();

    // Verify visual indicators
    await expect(page.locator('text=🎯')).toBeVisible(); // excellent
    await expect(page.locator('text=✅')).toBeVisible(); // good
    await expect(page.locator('text=⚠️')).toBeVisible(); // fair
    await expect(page.locator('text=❌')).toBeVisible(); // poor
  });

  test('should show "Match Target URLs" bulk action button', async ({ page }) => {
    await navigateToProjectPage(page);
    
    // Select some qualified domains first
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();

    // Check for the bulk action button
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    await expect(matchButton).toBeVisible();
    await expect(matchButton.locator('[data-testid="target-icon"]')).toBeVisible();
    
    // Verify button shows count
    await expect(page.locator('text=/Match Target URLs \\(\\d+\\)/')).toBeVisible();
  });

  test('should display AI suggestions in Target Page column', async ({ page }) => {
    // Mock domain with AI suggestion
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);

    // Check for AI suggestion display
    await expect(page.locator('[data-testid="ai-suggested-target"]')).toBeVisible();
    await expect(page.locator('text=AI Suggested')).toBeVisible();
    await expect(page.locator('[data-testid="sparkles-icon"]')).toBeVisible();
    
    // Verify target URL is displayed (truncated form)
    await expect(page.locator('text=target-page')).toBeVisible();
  });

  test('should show "Get AI suggestion" for qualified domains without target data', async ({ page }) => {
    // Mock qualified domain without target matching
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [{
        id: 'qualified-no-target',
        domain: 'qualified-domain.com',
        qualificationStatus: 'high_quality',
        // No suggestedTargetUrl or targetMatchData
      }];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);

    // Check for "Get AI suggestion" button
    await expect(page.locator('text=Multiple options')).toBeVisible();
    await expect(page.locator('button:has-text("🎯 Get AI suggestion")')).toBeVisible();
  });

  test('should show appropriate messages for non-qualified domains', async ({ page }) => {
    // Mock domains with different statuses
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [
        { id: 'pending', domain: 'pending.com', qualificationStatus: 'pending' },
        { id: 'disqualified', domain: 'disqualified.com', qualificationStatus: 'disqualified' }
      ];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);

    // Check status messages
    await expect(page.locator('text=Qualify first')).toBeVisible();
    await expect(page.locator('text=Not suitable')).toBeVisible();
  });
});

// Test group: Domain Detail Modal Tests
test.describe('Target URL Matching - Domain Detail Modal', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should display target URL analysis in expanded domain detail', async ({ page }) => {
    // Mock domain with comprehensive target matching data
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);

    // Click to expand domain detail
    await page.locator('[data-testid="expand-domain-button"]').first().click();

    // Check for Target URL Analysis section
    await expect(page.locator('h4:has-text("AI Target URL Analysis")')).toBeVisible();
    
    // Verify target analysis details
    await expect(page.locator('text=https://client.com/target-page')).toBeVisible();
    await expect(page.locator('text=Overlap: direct')).toBeVisible();
    await expect(page.locator('text=Direct: strong')).toBeVisible();
    await expect(page.locator('text=Related: moderate')).toBeVisible();
    
    // Check evidence display
    await expect(page.locator('text=Direct Keywords (5)')).toBeVisible();
    await expect(page.locator('text=Related Keywords (3)')).toBeVisible();
    await expect(page.locator('text=keyword1 (pos #10)')).toBeVisible();
    await expect(page.locator('text=related1 (pos #25)')).toBeVisible();
    
    // Verify AI reasoning
    await expect(page.locator('text=Strong direct overlap with excellent ranking positions')).toBeVisible();
  });

  test('should show AI recommendation summary', async ({ page }) => {
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Expand domain detail
    await page.locator('[data-testid="expand-domain-button"]').first().click();
    
    // Check recommendation summary
    await expect(page.locator('[data-testid="recommendation-summary"]')).toBeVisible();
    await expect(page.locator('text=Excellent match for this target URL')).toBeVisible();
  });

  test('should display timestamp for when target matching was completed', async ({ page }) => {
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Expand domain detail
    await page.locator('[data-testid="expand-domain-button"]').first().click();
    
    // Check timestamp display
    await expect(page.locator('text=/Target matching completed:/')).toBeVisible();
  });

  test('should handle multiple target URL matches correctly', async ({ page }) => {
    // Mock domain with multiple target URL options
    const multiTargetDomain = TargetMatchingTestData.createDomainWithTargetMatch({
      targetMatchData: {
        target_analysis: [
          {
            target_url: 'https://client.com/target-1',
            match_quality: 'excellent',
            overlap_status: 'direct',
            strength_direct: 'strong',
            evidence: { direct_count: 5, related_count: 2, direct_keywords: [], related_keywords: [] },
            reasoning: 'Perfect match'
          },
          {
            target_url: 'https://client.com/target-2',
            match_quality: 'good',
            overlap_status: 'related',
            strength_related: 'moderate',
            evidence: { direct_count: 2, related_count: 4, direct_keywords: [], related_keywords: [] },
            reasoning: 'Good related match'
          }
        ],
        best_target_url: 'https://client.com/target-1',
        recommendation_summary: 'Target-1 is the best match'
      }
    });

    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      await route.fulfill({ json: { domains: [multiTargetDomain] } });
    });

    await navigateToProjectPage(page);
    
    // Expand domain detail
    await page.locator('[data-testid="expand-domain-button"]').first().click();
    
    // Check multiple targets are displayed
    await expect(page.locator('text=target-1')).toBeVisible();
    await expect(page.locator('text=target-2')).toBeVisible();
    
    // Verify different match qualities
    await expect(page.locator('[data-testid="match-quality-excellent"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-quality-good"]')).toBeVisible();
  });
});

// Test group: API Integration Tests
test.describe('Target URL Matching - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should call target matching API when bulk action is clicked', async ({ page }) => {
    let apiCalled = false;
    let requestPayload = null;

    // Mock successful target matching API response
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      apiCalled = true;
      requestPayload = await route.request().postDataJSON();
      
      await route.fulfill({
        json: {
          success: true,
          totalQualified: 2,
          totalMatched: 2,
          matchDistribution: { excellent: 1, good: 1, fair: 0, poor: 0 },
          targetPageCoverage: [
            { url: 'https://client.com/target-1', assignedDomains: 1 },
            { url: 'https://client.com/target-2', assignedDomains: 1 }
          ]
        }
      });
    });

    await navigateToProjectPage(page);
    
    // Select qualified domains
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();
    
    // Click the target matching button
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Wait for API call
    await page.waitForTimeout(1000);
    
    // Verify API was called with correct payload
    expect(apiCalled).toBe(true);
    expect(requestPayload).toHaveProperty('domainIds');
    expect(Array.isArray(requestPayload.domainIds)).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      await route.fulfill({
        status: 500,
        json: {
          error: 'Failed to match target URLs',
          details: 'AI service timeout'
        }
      });
    });

    await navigateToProjectPage(page);
    
    // Select domains and trigger matching
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Check for error message display
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=/Failed to match target URLs/')).toBeVisible();
  });

  test('should show loading state during API call', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({ json: { success: true } });
    });

    await navigateToProjectPage(page);
    
    // Select domains and trigger matching
    await page.locator('input[type="checkbox"]').first().check();
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    await matchButton.click();
    
    // Check loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('button:has-text("Matching URLs...")')).toBeVisible();
    await expect(matchButton).toBeDisabled();
  });

  test('should refresh domain data after successful matching', async ({ page }) => {
    let refreshCalled = false;

    // Mock successful API response
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      await route.fulfill({ json: { success: true, totalMatched: 2 } });
    });

    // Mock domain refresh
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      refreshCalled = true;
      const updatedData = TargetMatchingTestData.createMultipleTargetMatches();
      await route.fulfill({ json: { domains: updatedData } });
    });

    await navigateToProjectPage(page);
    
    // Trigger matching
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Wait for completion
    await page.waitForTimeout(2000);
    
    // Verify refresh was called and UI updated
    expect(refreshCalled).toBe(true);
    await expect(page.locator('text=AI Suggested')).toBeVisible();
  });

  test('should handle individual domain target matching', async ({ page }) => {
    let apiCalled = false;

    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      apiCalled = true;
      const payload = await route.request().postDataJSON();
      expect(payload.domainIds).toHaveLength(1);
      await route.fulfill({ json: { success: true, totalMatched: 1 } });
    });

    await navigateToProjectPage(page);
    
    // Click individual "Get AI suggestion" button
    await page.locator('button:has-text("🎯 Get AI suggestion")').first().click();
    
    await page.waitForTimeout(1000);
    expect(apiCalled).toBe(true);
  });
});

// Test group: User Flow Tests
test.describe('Target URL Matching - User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should complete full target matching workflow', async ({ page }) => {
    // Step 1: Navigate to project page
    await navigateToProjectPage(page);
    
    // Step 2: Verify initial state (no target suggestions)
    await expect(page.locator('text=Multiple options')).toBeVisible();
    
    // Step 3: Select qualified domains
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();
    
    // Step 4: Click bulk target matching
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Step 5: Wait for completion and verify results
    await page.waitForSelector('text=AI Suggested', { timeout: TEST_CONFIG.timeout });
    await expect(page.locator('[data-testid="match-quality-indicator"]')).toBeVisible();
    
    // Step 6: Expand domain to see detailed analysis
    await page.locator('[data-testid="expand-domain-button"]').first().click();
    await expect(page.locator('h4:has-text("AI Target URL Analysis")')).toBeVisible();
  });

  test('should show target matching progress indication', async ({ page }) => {
    // Mock progressive API responses
    let callCount = 0;
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      callCount++;
      if (callCount === 1) {
        // First call - show progress
        await route.fulfill({
          json: { 
            success: false, 
            progress: { completed: 1, total: 3 },
            message: 'Processing...' 
          }
        });
      } else {
        // Final call - completion
        await route.fulfill({
          json: { success: true, totalMatched: 3 }
        });
      }
    });

    await navigateToProjectPage(page);
    
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Check for progress indicators
    await expect(page.locator('text=/Processing/')).toBeVisible();
  });

  test('should allow users to re-run target matching', async ({ page }) => {
    // Mock domains that already have target matching
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Select domain that already has matching data
    await page.locator('input[type="checkbox"]').first().check();
    
    // Should still be able to re-run matching
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    await expect(matchButton).toBeVisible();
    await expect(matchButton).not.toBeDisabled();
  });

  test('should handle domains with no qualification', async ({ page }) => {
    // Mock unqualified domains
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [
        { id: 'unqualified', domain: 'unqualified.com', qualificationStatus: 'pending' }
      ];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Select unqualified domain
    await page.locator('input[type="checkbox"]').first().check();
    
    // Target matching button should be disabled or show 0 count
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    if (await matchButton.isVisible()) {
      await expect(matchButton).toBeDisabled();
      await expect(page.locator('text=Match Target URLs (0)')).toBeVisible();
    }
  });
});

// Test group: Real Data Integration Tests
test.describe('Target URL Matching - Real Data Tests', () => {
  test.skip(!TEST_CONFIG.useRealData, 'Real data tests disabled');
  
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should work with real database domains', async ({ page }) => {
    // Navigate to actual project with real data
    await page.goto('/clients/real-client-id/bulk-analysis/projects/real-project-id');
    await page.waitForLoadState('networkidle');
    
    // Check if real domains are loaded
    await expect(page.locator('[data-testid="domains-table"]')).toBeVisible();
    
    // Look for qualified domains
    const qualifiedDomains = page.locator('[data-testid="qualified-domain"]');
    const count = await qualifiedDomains.count();
    
    if (count > 0) {
      // Select first few qualified domains
      await qualifiedDomains.first().locator('input[type="checkbox"]').check();
      
      // Try target matching with real data
      const matchButton = page.locator('button:has-text("Match Target URLs")');
      if (await matchButton.isVisible() && !await matchButton.isDisabled()) {
        await matchButton.click();
        
        // Wait for real API response (may take longer)
        await page.waitForTimeout(30000);
        
        // Check for success indicators
        await expect(page.locator('text=AI Suggested')).toBeVisible({ timeout: 60000 });
      }
    }
  });

  test('should handle large domain sets performance', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for large datasets
    
    await page.goto('/clients/client-with-many-domains/bulk-analysis/projects/large-project');
    await page.waitForLoadState('networkidle');
    
    // Select many domains (up to 50)
    await page.locator('button:has-text("Select All")').click();
    
    // Trigger bulk matching
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    if (await matchButton.isVisible()) {
      await matchButton.click();
      
      // Monitor performance and completion
      const startTime = Date.now();
      await page.waitForSelector('text=AI Suggested', { timeout: 120000 });
      const endTime = Date.now();
      
      console.log(`Target matching completed in ${endTime - startTime}ms`);
      
      // Verify reasonable performance (under 2 minutes for 50 domains)
      expect(endTime - startTime).toBeLessThan(120000);
    }
  });
});

// Test group: Edge Cases and Error Scenarios
test.describe('Target URL Matching - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should handle API timeout scenarios', async ({ page }) => {
    // Mock API timeout
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      // Don't respond to simulate timeout
      await new Promise(resolve => setTimeout(resolve, 31000));
    });

    await navigateToProjectPage(page);
    
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Should show timeout handling
    await expect(page.locator('text=/timeout|failed/i')).toBeVisible({ timeout: 35000 });
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed response
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      await route.fulfill({
        json: {
          // Missing required fields
          invalid: 'response'
        }
      });
    });

    await navigateToProjectPage(page);
    
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Should handle gracefully
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should handle domains with no target pages', async ({ page }) => {
    // Mock client with no target pages
    await page.route('/api/clients/*/target-pages', async route => {
      await route.fulfill({ json: { targetPages: [] } });
    });

    await navigateToProjectPage(page);
    
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    // Should show appropriate message
    await expect(page.locator('text=/No target pages/')).toBeVisible();
  });

  test('should handle partial matching results', async ({ page }) => {
    // Mock API with partial success
    await page.route('/api/clients/*/bulk-analysis/target-match', async route => {
      await route.fulfill({
        json: {
          success: true,
          totalQualified: 5,
          totalMatched: 3,
          failedUpdates: ['domain-1', 'domain-2'],
          message: 'Some domains could not be matched'
        }
      });
    });

    await navigateToProjectPage(page);
    
    // Select multiple domains
    await page.locator('button:has-text("Select All")').click();
    await page.locator('button:has-text("Match Target URLs")').click();
    
    await page.waitForTimeout(2000);
    
    // Should show partial success message
    await expect(page.locator('text=/3 of 5 domains matched/')).toBeVisible();
  });
});

// Test group: Accessibility and Responsive Design
test.describe('Target URL Matching - Accessibility & Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await navigateToProjectPage(page);
    
    // Tab through interface
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to reach target matching button
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    await matchButton.focus();
    await expect(matchButton).toBeFocused();
    
    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
  });

  test('should work on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToProjectPage(page);
    
    // Target matching functionality should still work
    await page.locator('input[type="checkbox"]').first().check();
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    
    // Button might be in a collapsed menu on mobile
    if (await matchButton.isVisible()) {
      await expect(matchButton).toBeVisible();
    } else {
      // Check for mobile menu
      await page.locator('[data-testid="mobile-menu-button"]').click();
      await expect(matchButton).toBeVisible();
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await navigateToProjectPage(page);
    
    // Check ARIA labels on key elements
    const matchButton = page.locator('button:has-text("Match Target URLs")');
    await expect(matchButton).toHaveAttribute('aria-label');
    
    // Match quality indicators should have proper labels
    const qualityIndicators = page.locator('[data-testid*="match-quality"]');
    if (await qualityIndicators.count() > 0) {
      await expect(qualityIndicators.first()).toHaveAttribute('aria-label');
    }
  });
});

// Test group: Visual Regression Tests
test.describe('Target URL Matching - Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsInternalUser(page);
  });

  test('should render match quality indicators correctly', async ({ page }) => {
    // Mock all quality types
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = TargetMatchingTestData.createMultipleTargetMatches();
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Take screenshot of quality indicators
    const qualitySection = page.locator('[data-testid="target-page-column"]').first();
    await expect(qualitySection).toHaveScreenshot('match-quality-indicators.png');
  });

  test('should display target analysis modal correctly', async ({ page }) => {
    await page.route('/api/clients/*/bulk-analysis/projects/*/domains', async route => {
      const mockData = [TargetMatchingTestData.createDomainWithTargetMatch()];
      await route.fulfill({ json: { domains: mockData } });
    });

    await navigateToProjectPage(page);
    
    // Open domain detail modal
    await page.locator('[data-testid="expand-domain-button"]').first().click();
    
    // Take screenshot of target analysis section
    const analysisSection = page.locator('[data-testid="target-analysis-section"]');
    await expect(analysisSection).toHaveScreenshot('target-analysis-modal.png');
  });
});