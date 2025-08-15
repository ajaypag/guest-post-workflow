# Test Execution Guide - Internal Publisher Management

This guide provides step-by-step instructions for running and interpreting the internal publisher management E2E tests.

## Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, run tests
npx playwright test __tests__/e2e/internal-publisher-management/
```

### 2. Run Current State Tests (Document Failures)
```bash
# Run tests that document current broken state
npx playwright test __tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts

# Expected Result: FAILURES that document current issues
```

### 3. Run Future State Tests (Validate Fixes)
```bash
# Run tests for how system should work (will pass once fixed)
npx playwright test __tests__/e2e/internal-publisher-management/02-ideal-future-state.spec.ts

# Expected Result: PASS when issues are resolved
```

## Detailed Test Execution

### Test Categories

#### 1. Current State Failures (`01-current-state-failures.spec.ts`)
**Purpose**: Document current broken functionality
**How to Run**:
```bash
npx playwright test 01-current-state-failures.spec.ts --reporter=line
```

**Expected Output**:
```
❌ ISSUE 1: Internal user should be able to access /internal/publishers
   Expected: Functional publisher management interface  
   Actual: 404 Not Found / Layout broken

❌ ISSUE 2: Internal navigation should include working publisher links
   Expected: Working navigation to /internal/publishers
   Actual: Navigation link broken

❌ ISSUE 3: Publisher API endpoints should allow internal user access
   Expected: 200 OK with data
   Actual: 401 Unauthorized
```

**Interpreting Failures**:
- Each failure documents a specific issue that needs to be fixed
- Console output shows expected vs actual behavior
- Test names indicate the issue type and priority

#### 2. Ideal Future State (`02-ideal-future-state.spec.ts`)
**Purpose**: Validate complete functionality once implemented
**How to Run**:
```bash
npx playwright test 02-ideal-future-state.spec.ts --headed
```

**Expected Output (Future)**:
```
✅ Internal user should access publisher management dashboard
✅ Internal user should view accurate publisher statistics  
✅ Internal user should search publishers by company name
✅ Internal user should view publisher details
✅ Internal user should verify publisher
```

#### 3. Specific Scenarios (`03-specific-scenarios.spec.ts`)
**Purpose**: Test complex workflows and user journeys
**How to Run**:
```bash
npx playwright test 03-specific-scenarios.spec.ts --workers=1
```

**Test Scenarios**:
- Publisher onboarding workflow (create → connect website → add offering → verify)
- Bulk publisher verification
- Website ownership transfers
- Conflict resolution for disputed websites

#### 4. Security Tests (`04-security-tests.spec.ts`)
**Purpose**: Verify access controls and security model
**How to Run**:
```bash
npx playwright test 04-security-tests.spec.ts --forbid-only
```

**Security Areas**:
- Authentication requirements
- Authorization by user type
- API security (CSRF, input validation)
- Data access controls

## Running Tests with Different Options

### Development Mode
```bash
# Run with UI for debugging
npx playwright test --ui

# Run specific test with debug
npx playwright test --debug 01-current-state-failures.spec.ts

# Run with headed browser
npx playwright test --headed
```

### CI/CD Mode
```bash
# Run all tests (headless)
npx playwright test __tests__/e2e/internal-publisher-management/

# Generate HTML report
npx playwright test --reporter=html

# Run with video recording
npx playwright test --video=on
```

### Filtering Tests
```bash
# Run specific test by name
npx playwright test -g "Internal user should access publisher management"

# Run only security tests
npx playwright test -g "Security"

# Run only current state failures
npx playwright test 01-current-state-failures.spec.ts
```

## Interpreting Test Results

### Current State Test Results

#### ✅ SUCCESS (Unexpected but Good)
If current state tests pass, it means the functionality is already working:
```
✅ SUCCESS: Internal user can access publisher management page
```
**Action**: Move on to testing more advanced functionality

#### ❌ EXPECTED FAILURE (Documenting Issues)
If current state tests fail as expected:
```
❌ CURRENT ISSUE: Internal user cannot properly access publisher management
Expected: Functional publisher management interface
Actual Error: TypeError: Cannot read property 'title' of undefined
Issue Type: Layout/UI broken or incomplete
```
**Action**: This documents the issue that needs to be fixed

#### ⚠️ UNEXPECTED BEHAVIOR
If tests behave differently than expected:
```
⚠️ UNEXPECTED: Page loads but with different content than expected
```
**Action**: Investigate further - may indicate partial implementation

### Future State Test Results

#### ✅ PASS (Goal Achieved)
When future state tests pass:
```
✅ Internal user should access publisher management dashboard
✅ Internal user should view accurate publisher statistics
```
**Action**: Feature is working correctly

#### ❌ FAIL (Not Yet Implemented)  
When future state tests fail:
```
❌ Internal user should verify publisher
   Expected: Status should update to 'verified'
   Actual: Verify button not found
```
**Action**: Feature needs to be implemented

#### ⏳ FLAKY (Partial Implementation)
When tests sometimes pass/fail:
```
⏳ Test passed 2/3 times - possible timing issue
```
**Action**: Check for race conditions or incomplete implementation

## Debugging Failed Tests

### Step 1: Identify the Issue Type

**404 Not Found Issues**:
```
❌ Error: Page returned 404
```
- Missing route in application
- Incorrect URL path
- Route not implemented yet

**401 Unauthorized Issues**:
```  
❌ API endpoint returns 401 Unauthorized
```
- Authentication not working
- Internal user type not recognized
- Missing permission checks

**Layout/UI Issues**:
```
❌ Expected element not found: page.locator('h1')
```
- Component not rendered
- CSS selector changed
- JavaScript error preventing render

**Database Issues**:
```
❌ Database connection failed
```
- Database not running
- Migration not applied
- Test data not created

### Step 2: Use Debug Tools

**Run with Debug Mode**:
```bash
npx playwright test --debug 01-current-state-failures.spec.ts
```
- Opens browser with developer tools
- Pauses at each step
- Allows manual inspection

**Add Console Logging**:
```typescript
console.log('Current URL:', page.url());
console.log('Page content:', await page.content());
```

**Take Screenshots**:
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Step 3: Check Prerequisites

**Development Server Running**:
```bash
curl http://localhost:3002/
```

**Database Connected**:
```bash
npm run db:studio
```

**Authentication Working**:
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -d '{"email":"ajay@outreachlabs.com","password":"FA64!I$nrbCauS^d"}'
```

## Common Scenarios and Solutions

### Scenario 1: All Tests Fail with "Cannot connect"
**Symptoms**: Tests fail immediately with connection errors
**Solutions**:
1. Start development server: `npm run dev`
2. Check port 3002 is available
3. Verify environment variables are set

### Scenario 2: Authentication Tests Fail
**Symptoms**: Login attempts fail or redirect loops
**Solutions**:
1. Verify test credentials in database
2. Check authentication routes are working
3. Clear browser cookies: `page.context().clearCookies()`

### Scenario 3: Database Tests Fail  
**Symptoms**: Tests fail when creating/reading test data
**Solutions**:
1. Run database migrations: `npm run db:migrate`
2. Check database connection string
3. Verify test database is clean

### Scenario 4: Page Not Found (404) Errors
**Symptoms**: Tests fail because routes don't exist
**Solutions**:
1. Check if routes are implemented in `app/` directory
2. Verify route patterns match test expectations
3. Check for typos in URLs

### Scenario 5: Tests Pass But Functionality Broken
**Symptoms**: Tests pass but manual testing shows issues
**Solutions**:
1. Review test assertions - may be too lenient
2. Add more specific checks
3. Test with real user data

## Performance Considerations

### Test Execution Time
- **Current State Tests**: ~2-3 minutes (expect failures)
- **Future State Tests**: ~5-8 minutes (full functionality)
- **Security Tests**: ~3-5 minutes (includes rate limiting tests)
- **Specific Scenarios**: ~8-12 minutes (complex workflows)

### Optimizing Test Speed
```bash
# Run tests in parallel (faster)
npx playwright test --workers=4

# Run tests sequentially (more stable)
npx playwright test --workers=1

# Skip slow tests during development
npx playwright test --grep-invert "slow"
```

### Resource Management
- Tests automatically clean up test data
- Browser contexts are isolated
- Database transactions are rolled back

## Continuous Integration

### CI Configuration
```yaml
name: Internal Publisher E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Run tests
        run: npx playwright test __tests__/e2e/internal-publisher-management/
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### CI Test Strategy
1. **On every PR**: Run current state tests to document any new issues
2. **On main branch**: Run all tests to track implementation progress  
3. **Nightly builds**: Run comprehensive test suite with performance monitoring

## Monitoring and Reporting

### Test Reports
- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: Machine-readable results for CI/CD
- **Video Recordings**: For failed tests (when enabled)

### Progress Tracking
Track implementation progress by monitoring test results:
```bash
# Generate progress report
npx playwright test --reporter=json > test-results.json
node scripts/analyze-test-progress.js test-results.json
```

### Success Criteria
**Phase 1 Complete**: All current state tests document issues correctly
**Phase 2 Complete**: Basic publisher management tests pass
**Phase 3 Complete**: All future state tests pass
**Phase 4 Complete**: All security and scenario tests pass

This indicates full internal publisher management functionality is implemented and working correctly.