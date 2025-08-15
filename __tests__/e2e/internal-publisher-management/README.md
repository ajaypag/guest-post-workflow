# Internal Publisher Management E2E Tests

This test suite provides comprehensive end-to-end testing for internal user access to publisher functionality. The tests are designed to both document current issues and validate future implementations.

## Test Structure

### 1. Current State Failure Tests (`01-current-state-failures.spec.ts`)
**Purpose**: Document the CURRENT BROKEN state of internal publisher management
**Expected Result**: These tests are expected to FAIL and serve as documentation

**Critical Issues Being Tested**:
- Publisher layout blocks internal users completely (`/publisher/*` routes)
- API endpoints reject internal users (401 unauthorized) 
- Missing internal publisher detail pages (`/internal/publishers/[id]`)
- Broken navigation links in internal layout
- No internal publisher creation workflow
- Missing publisher-website relationship management for internal users

### 2. Ideal Future State Tests (`02-ideal-future-state.spec.ts`) 
**Purpose**: Define how internal publisher management SHOULD work
**Expected Result**: These tests will PASS once all issues are fixed

**Functionality Being Tested**:
- Complete internal user access to publisher management
- Publisher CRUD operations by internal users
- Publisher-website relationship management
- Publisher offering management  
- Publisher verification workflows
- Search and filtering capabilities
- Analytics and reporting

### 3. Specific Scenario Tests (`03-specific-scenarios.spec.ts`)
**Purpose**: Test realistic user journeys and complex multi-step workflows

**Scenarios Covered**:
- Complete publisher onboarding workflow
- Bulk publisher verification
- Publisher performance monitoring
- Website ownership transfers
- Conflict resolution for disputed websites
- Comprehensive reporting and analytics

### 4. Security Tests (`04-security-tests.spec.ts`)
**Purpose**: Verify security model and access controls

**Security Areas Tested**:
- Authentication requirements
- Authorization by user type (internal vs publisher vs account)
- API security and CSRF protection
- Data access controls and audit logging
- Rate limiting and abuse prevention
- Secure error handling

## Page Object Models

### LoginPage
- Handles authentication for different user types
- Provides login utilities for test setup

### InternalLayoutPage  
- Tests internal navigation and layout
- Verifies breadcrumbs, user info, and navigation links

### PublisherManagementPage
- Tests publisher list, search, and filtering
- Verifies statistics and bulk operations

### PublisherDetailPage
- Tests individual publisher management
- Handles website relationships and offering management

## Test Data Management

### TestDataFactory
- Creates consistent test data for publishers, websites, offerings
- Provides predefined scenarios for different test cases
- Generates unique identifiers to avoid conflicts

### DatabaseHelpers
- Manages test data creation and cleanup
- Provides database verification utilities
- Handles test isolation and cleanup

## Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Set up test database
npm run db:test:setup

# Start development server
npm run dev
```

### Run All Tests
```bash
# Run all internal publisher management tests
npm run test:e2e:internal-publisher

# Run specific test files
npx playwright test __tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts
npx playwright test __tests__/e2e/internal-publisher-management/02-ideal-future-state.spec.ts
```

### Run with Different Options
```bash
# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium

# Generate report
npx playwright test --reporter=html
```

## Environment Setup

### Test Data
The tests use the following test credentials:
- **Internal Admin**: `ajay@outreachlabs.com` / `FA64!I$nrbCauS^d`
- **Test Publishers**: Generated dynamically with unique emails
- **Test Websites**: Generated with unique domains

### Database Cleanup
Tests automatically clean up test data:
- Before each test suite runs
- After each individual test
- All test data is prefixed/tagged for safe cleanup

## Expected Test Results

### Current State (Expected Failures)
When run against the current codebase, expect these results:

✅ **Working Areas**:
- Basic authentication and internal user login
- Some internal layout navigation
- Basic database connectivity

❌ **Current Issues** (Expected Failures):
- `/internal/publishers` page may return 404 or broken layout
- Publisher API endpoints return 401 for internal users
- Publisher detail pages (`/internal/publishers/[id]`) don't exist
- Publisher creation workflow missing
- Relationship management interfaces missing

### Future State (Target Results)
Once issues are fixed, expect these results:

✅ **All Tests Should Pass**:
- Complete publisher management interface accessible
- Full CRUD operations for publishers
- Working website-publisher relationships
- Verification workflows functional
- Search and analytics working
- Security model properly implemented

## Test Maintenance

### Adding New Tests
1. Use existing page object models when possible
2. Create test data using `TestDataFactory`
3. Clean up test data in `afterEach` hooks
4. Follow naming conventions for test descriptions

### Updating Tests
1. Update page objects when UI changes
2. Modify test data factory for schema changes
3. Update expected results as features are implemented
4. Keep security tests current with security requirements

## Integration with CI/CD

### Test Pipeline Integration
```yaml
# Example GitHub Actions integration
- name: Run Internal Publisher E2E Tests
  run: |
    npm run test:e2e:internal-publisher
    npx playwright test __tests__/e2e/internal-publisher-management/
```

### Test Reports
- HTML reports generated in `playwright-report/`
- Screenshots and videos captured for failures
- Test artifacts stored for debugging

## Troubleshooting

### Common Issues

**Tests fail with "Page not found"**
- Verify development server is running
- Check that routes exist in the application
- Confirm database is properly seeded

**Authentication failures** 
- Verify test credentials are correct
- Check that internal user exists in database
- Confirm authentication endpoints are working

**Database errors**
- Ensure test database is set up
- Run database migrations
- Check database connection string

**Timeout errors**
- Increase timeout values for slow operations
- Check for infinite loading states
- Verify network connectivity

### Debug Mode
```bash
# Run single test with debug
npx playwright test --debug __tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts

# Run with verbose logging
DEBUG=pw:api npx playwright test
```

## Contributing

When adding new tests:
1. Follow the existing test structure and patterns
2. Use descriptive test names that explain what is being tested
3. Include both positive and negative test cases
4. Add appropriate error handling and cleanup
5. Update this README with any new patterns or requirements

## Security Considerations

- Test credentials are for development/testing only
- Test data is automatically cleaned up
- No real sensitive data should be used in tests
- Security tests verify access controls but don't expose vulnerabilities