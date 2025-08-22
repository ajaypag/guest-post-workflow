# Target URL Matching Test Guide

## Overview

This document provides comprehensive guidance for testing the Target URL Matching functionality implemented in Phase 4. The test suite validates all aspects of the AI-powered target URL matching system, from frontend components to API endpoints to user workflows.

## Test Architecture

### Test Types

1. **Unit Tests** (`__tests__/unit/target-url-matching.test.ts`)
   - Component testing (MatchQualityIndicator)
   - Utility function testing (getBestMatchQuality)
   - Data processing logic
   - TypeScript interface validation

2. **Integration Tests** (`__tests__/integration/target-url-matching-api.test.ts`)
   - API endpoint testing
   - Database integration
   - Authentication/authorization
   - Error handling scenarios

3. **End-to-End Tests** (`__tests__/e2e/target-url-matching.spec.ts`)
   - Complete user workflows
   - UI component interactions
   - Real data testing
   - Cross-browser compatibility

### Test Structure

```
__tests__/
├── unit/
│   └── target-url-matching.test.ts          # Component & utility tests
├── integration/
│   └── target-url-matching-api.test.ts      # API & database tests
├── e2e/
│   └── target-url-matching.spec.ts          # End-to-end workflows
├── utils/
│   └── target-url-matching-helpers.ts       # Test utilities & data
├── target-matching-setup.ts                 # Test configuration
└── run-target-matching-tests.sh             # Test runner script
```

## Running Tests

### Quick Start

```bash
# Run all target matching tests
npm run test:target-matching

# Or use the comprehensive test runner
./___tests__/run-target-matching-tests.sh

# Run specific test types
npm run test:unit -- target-url-matching
npm run test:integration -- target-url-matching-api
npm run test:e2e -- target-url-matching
```

### Advanced Options

```bash
# Use real database data
./___tests__/run-target-matching-tests.sh --real-data

# Run in headed mode (visible browser)
./___tests__/run-target-matching-tests.sh --headed

# Skip specific test types
./___tests__/run-target-matching-tests.sh --skip-e2e --skip-integration

# Run sequentially for debugging
./___tests__/run-target-matching-tests.sh --sequential

# Set custom timeout
./___tests__/run-target-matching-tests.sh --timeout 120000
```

## Test Coverage Areas

### 1. Component Rendering

**What's Tested:**
- MatchQualityIndicator component renders correctly
- Target Page column displays AI suggestions
- Bulk action button shows correct states
- Domain detail modal shows target analysis

**Key Test Cases:**
```typescript
test('renders excellent quality indicator correctly', () => {
  render(<MatchQualityIndicator quality="excellent" />);
  expect(screen.getByText('🎯excellent')).toBeInTheDocument();
});

test('displays AI suggestion when domain has target match data', () => {
  const domain = createDomainWithTargetMatch('excellent');
  render(<BulkAnalysisTable domains={[domain]} ... />);
  expect(screen.getByText('AI Suggested')).toBeVisible();
});
```

### 2. API Integration

**What's Tested:**
- `/api/clients/[id]/bulk-analysis/target-match` endpoint
- Request/response validation
- Authentication checks
- Error handling scenarios
- Database update operations

**Key Test Cases:**
```typescript
test('successfully matches target URLs for qualified domains', async () => {
  const response = await targetMatchPOST(request, context);
  expect(response.status).toBe(200);
  expect(responseData.success).toBe(true);
  expect(responseData.totalMatched).toBe(2);
});

test('returns error when no qualified domains found', async () => {
  mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue([]);
  const response = await targetMatchPOST(request, context);
  expect(response.status).toBe(400);
});
```

### 3. User Workflows

**What's Tested:**
- Complete target matching workflow
- Domain selection and bulk actions
- Individual domain matching
- Error states and recovery
- Loading states and progress

**Key Test Cases:**
```typescript
test('should complete full target matching workflow', async ({ page }) => {
  await navigateToProjectPage(page);
  await page.locator('input[type="checkbox"]').first().check();
  await page.locator('button:has-text("Match Target URLs")').click();
  await expect(page.locator('text=AI Suggested')).toBeVisible();
});
```

### 4. Data Processing

**What's Tested:**
- Target match data structure validation
- Match quality determination logic
- Evidence collection and display
- Keyword processing

**Key Test Cases:**
```typescript
test('getBestMatchQuality returns excellent when excellent match exists', () => {
  const data = { target_analysis: [{ match_quality: 'excellent' }] };
  expect(getBestMatchQuality(data)).toBe('excellent');
});
```

### 5. Error Handling

**What's Tested:**
- API timeout scenarios
- Malformed response handling
- Database connection errors
- Authentication failures
- Partial success scenarios

## Test Data Management

### Mock Data Generation

The test suite includes comprehensive mock data generators:

```typescript
// Generate domain with specific match quality
const domain = TargetMatchingTestDataGenerator.generateDomainWithTargetMatch('excellent');

// Generate mixed quality domains
const domains = TargetMatchingTestDataGenerator.generateMixedQualityDomains(4);

// Generate test scenarios
const mockResponse = TargetMatchingTestDataGenerator.generateMockAPIResponse('success');
```

### Test Data Presets

Pre-configured datasets for common scenarios:

```typescript
import { TestDataPresets } from '@/___tests__/utils/target-url-matching-helpers';

// Use pre-configured datasets
const excellentMatches = TestDataPresets.EXCELLENT_MATCHES_ONLY;
const mixedData = TestDataPresets.COMPLETE_DATASET;
const largeDataset = TestDataPresets.LARGE_DATASET;
```

### Real Data Testing

For integration with actual database:

```bash
# Enable real data mode
export USE_REAL_DATA=true
./___tests__/run-target-matching-tests.sh --real-data
```

## Custom Test Utilities

### Page Object Pattern

For E2E tests, use the `TargetMatchingPageHelper`:

```typescript
const pageHelper = new TargetMatchingPageHelper(page);

await pageHelper.navigateToProject(clientId, projectId);
await pageHelper.selectDomains(['domain-1', 'domain-2']);
await pageHelper.clickMatchTargetUrls();
await pageHelper.waitForMatchingComplete();

const indicators = await pageHelper.getMatchQualityIndicators();
expect(indicators).toContain('excellent');
```

### Custom Jest Matchers

Domain-specific matchers for cleaner assertions:

```typescript
// Check match quality
expect(domain).toHaveMatchQuality('excellent');

// Check suggested target
expect(domain).toHaveSuggestedTarget('https://client.com/target');

// Check qualification status
expect(domain).toBeQualifiedForMatching();

// Check evidence
expect(domain).toHaveTargetEvidence('direct', 5);
```

## Test Configuration

### Environment Variables

```bash
# Test configuration
export BASE_URL="http://localhost:3001"
export USE_REAL_DATA="false"
export TEST_TIMEOUT="60000"
export PARALLEL_EXECUTION="true"
export HEADLESS_MODE="true"

# Database configuration
export TEST_DATABASE_URL="postgresql://..."
export TEST_CLIENT_ID="test-client-123"
export TEST_PROJECT_ID="test-project-456"
```

### Jest Configuration

Specialized Jest config for target matching tests:

```javascript
// jest.target-matching.config.js
module.exports = {
  displayName: 'Target URL Matching Tests',
  testMatch: ['**/*target*url*matching*.(test|spec).(ts|tsx)'],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 75, statements: 75 }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/target-matching-setup.ts']
};
```

## Test Scenarios

### Success Scenarios

1. **Perfect Match**: Domain has excellent match for target URL
2. **Multiple Targets**: Domain matches multiple target URLs with different qualities
3. **Bulk Processing**: Process multiple domains simultaneously
4. **Re-matching**: Update existing target matches

### Error Scenarios

1. **No Qualified Domains**: Only pending/disqualified domains selected
2. **No Target Pages**: Client has no target pages configured
3. **API Timeout**: AI service takes too long to respond
4. **Partial Failure**: Some domains fail to update in database
5. **Authentication Error**: User not authorized for target matching

### Edge Cases

1. **Empty Data**: No domains, no keywords, no results
2. **Malformed Data**: Corrupted target match data structures
3. **Large Datasets**: Performance with 100+ domains
4. **Concurrent Access**: Multiple users running target matching

## Performance Testing

### Benchmarks

- **Single Domain**: < 2 seconds
- **10 Domains**: < 10 seconds
- **50 Domains**: < 30 seconds
- **100 Domains**: < 60 seconds

### Performance Tests

```typescript
test('handles large domain sets performance', async ({ page }) => {
  test.setTimeout(120000);
  
  const startTime = Date.now();
  await triggerTargetMatching(50);
  const endTime = Date.now();
  
  expect(endTime - startTime).toBeLessThan(60000);
});
```

## Debugging Tests

### Common Issues

1. **Component Not Found**: Check test-id attributes
2. **API Mocking**: Verify mock response format
3. **Timing Issues**: Add proper waits for async operations
4. **Authentication**: Ensure proper session mocks

### Debug Commands

```bash
# Run single test with debug output
npm run test:unit -- --testNamePattern="MatchQualityIndicator" --verbose

# Run E2E tests in headed mode
npx playwright test --headed --debug

# Generate coverage report
npm run test:coverage -- --testPathPattern=target-url-matching
```

### Debug Tools

```typescript
// Add debug output in tests
console.log('Domain data:', JSON.stringify(domain, null, 2));

// Screenshot on failure (E2E tests)
await page.screenshot({ path: 'debug-screenshot.png' });

// Pause execution for inspection
await page.pause();
```

## Continuous Integration

### GitHub Actions

```yaml
name: Target URL Matching Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run target matching tests
        run: ./___tests__/run-target-matching-tests.sh --sequential
      - name: Upload test results
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: test-results
          path: test-results/
```

## Test Reports

### Generated Reports

After running tests, reports are available in:

- **HTML Report**: `test-results/target-matching/test-report-{timestamp}.html`
- **Coverage Report**: `coverage/target-matching/index.html`
- **Playwright Report**: `test-results/playwright-report/index.html`

### Report Contents

- Test execution summary
- Pass/fail statistics
- Coverage percentages
- Performance metrics
- Screenshots/videos (E2E tests)
- Error details and stack traces

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, specific test names
2. **Single Responsibility**: One assertion per test when possible
3. **Arrange-Act-Assert**: Follow AAA pattern consistently
4. **Mock External Dependencies**: Don't rely on external services
5. **Test Edge Cases**: Include error conditions and boundary values

### Maintaining Tests

1. **Keep Tests Fast**: Unit tests < 100ms, integration < 1s
2. **Regular Updates**: Update tests when implementation changes
3. **Remove Flaky Tests**: Fix or remove unreliable tests
4. **Document Complex Logic**: Comment non-obvious test setup

### Test Data

1. **Use Factories**: Generate test data consistently
2. **Minimal Data**: Only include necessary fields
3. **Realistic Data**: Match production data patterns
4. **Clean Up**: Reset state between tests

## Troubleshooting

### Common Test Failures

| Error | Cause | Solution |
|-------|--------|----------|
| `Component not found` | Missing test-id or incorrect selector | Add/fix data-testid attributes |
| `API mock not called` | URL pattern mismatch | Check mock URL patterns match exactly |
| `Timeout exceeded` | Slow async operations | Increase timeout or add proper waits |
| `Authentication error` | Missing session mock | Verify auth mocks are properly configured |
| `Database error` | Real DB connection in test mode | Ensure test DB mocks are active |

### Getting Help

1. **Check Logs**: Review detailed test logs in `test-results/`
2. **Debug Mode**: Run tests with `--debug` flag
3. **Isolation**: Run single failing test to isolate issue
4. **Documentation**: Review implementation docs for context

## Future Enhancements

### Planned Improvements

1. **Visual Regression Tests**: Screenshot comparisons
2. **Accessibility Tests**: WCAG compliance validation
3. **Load Testing**: Stress testing with concurrent users
4. **Mobile Testing**: Responsive design validation
5. **API Contract Tests**: OpenAPI specification validation

### Test Coverage Goals

- **Unit Tests**: 90% coverage for core utilities
- **Integration Tests**: 85% coverage for API endpoints
- **E2E Tests**: 100% coverage for critical user paths
- **Component Tests**: 80% coverage for UI components

---

This comprehensive test suite ensures the Target URL Matching functionality is thoroughly validated before production deployment. Regular execution of these tests will catch regressions and maintain system reliability.