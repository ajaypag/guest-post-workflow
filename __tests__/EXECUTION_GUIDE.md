# Test Execution Guide

## Prerequisites

1. **Database Running**
   ```bash
   # Ensure PostgreSQL is running on port 5433
   docker ps | grep postgres
   # Database: guest_post_test
   ```

2. **Development Server** (for E2E tests)
   ```bash
   # Terminal 1: Start dev server
   npm run dev
   # Verify running on http://localhost:3002
   ```

3. **Playwright Browsers** (for E2E tests)
   ```bash
   # Install browsers
   npx playwright install
   ```

## Test Execution Commands

### 1. Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test
npm test -- --testPathPatterns="publisherOfferingsService"

# Run with watch mode
npm run test:watch
```

### 2. Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm test -- --testPathPatterns="publisherBasic"
```

### 3. Security Tests
```bash
# Run all security tests
npm run test:security

# Run specific security test
npm test -- --testPathPatterns="sqlInjection"
```

### 4. End-to-End Tests
```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test
npx playwright test publisherWorkflow
```

### 5. Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### 6. All Tests
```bash
# Run complete test suite
npm run test:all
```

## Test Results Interpretation

### Successful Test Run
```
✓ Unit Tests: All services tested
✓ Integration Tests: API endpoints validated  
✓ Security Tests: Vulnerabilities prevented
✓ E2E Tests: User workflows verified

Coverage Summary:
- Lines: 85%+ 
- Functions: 88%+
- Branches: 75%+
- Statements: 86%+
```

### Common Issues and Solutions

#### 1. Database Connection Errors
```bash
# Check database is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Reset test database
npm run db:migrate
```

#### 2. Schema Mismatch Errors
```bash
# Verify migrations applied
npm run db:studio

# Check for missing columns
# Fix in PublisherFactory if needed
```

#### 3. E2E Test Failures
```bash
# Ensure dev server is running
npm run dev

# Check browser installation
npx playwright install

# Run with debug mode
npx playwright test --debug
```

#### 4. Test Timeout Issues
```bash
# Increase timeout in jest.config.js
testTimeout: 60000

# For specific tests
jest.setTimeout(60000)
```

## Test Environment Variables

```bash
# Required for all tests
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/guest_post_test

# Required for API tests  
NEXTAUTH_SECRET=test-secret-key
NEXTAUTH_URL=http://localhost:3002

# Optional for enhanced testing
TEST_TIMEOUT=30000
PLAYWRIGHT_BROWSERS=chromium
```

## Debug Mode

### Jest Debug
```bash
# Run tests with debug output
npm test -- --verbose --detectOpenHandles

# Debug specific test
npm test -- --testPathPatterns="specific.test" --verbose
```

### Playwright Debug
```bash
# Run with browser visible
npx playwright test --headed

# Step through test
npx playwright test --debug

# Record new test
npx playwright codegen localhost:3002
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run tests
      run: npm run test:all
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5433/guest_post_test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

## Performance Benchmarks

### Expected Test Times
- **Unit Tests**: 2-5 seconds total
- **Integration Tests**: 5-15 seconds total
- **Security Tests**: 10-30 seconds total
- **E2E Tests**: 30-120 seconds total
- **Full Suite**: 1-3 minutes total

### Memory Usage
- **Jest**: 100-200MB peak memory
- **Playwright**: 200-500MB peak memory
- **Database**: 50-100MB test data

## Test Data Management

### Cleanup Verification
```sql
-- Check for test data in database
SELECT COUNT(*) FROM publishers WHERE email LIKE '%test.com';
SELECT COUNT(*) FROM websites WHERE normalized_domain LIKE '%.test';

-- Manual cleanup if needed
DELETE FROM publishers WHERE email LIKE '%test.com';
DELETE FROM websites WHERE normalized_domain LIKE '%.test';
```

### Test Data Isolation
- All test data uses `.test` domains
- Test UUIDs are tracked for cleanup
- Tests run in isolated transactions
- Database reset between test suites

## Troubleshooting Guide

### Test Failures
1. **Check Prerequisites**: Database, dependencies, environment
2. **Run Individual Tests**: Isolate failing test
3. **Check Logs**: Review error messages and stack traces
4. **Verify Data**: Ensure test data is properly set up
5. **Reset Environment**: Clear cache, restart services

### Performance Issues
1. **Parallel Execution**: Ensure tests can run in parallel
2. **Database Connections**: Check connection pool limits
3. **Memory Leaks**: Monitor memory usage during tests
4. **Timeout Adjustments**: Increase timeouts for slow tests

### Browser Issues (E2E)
1. **Browser Installation**: Verify Playwright browsers installed
2. **Display Issues**: Set DISPLAY environment for headless
3. **Network Issues**: Check localhost accessibility
4. **Permissions**: Ensure browser can access test URLs

---

## Quick Start

1. **Install and Setup**
   ```bash
   npm install
   npx playwright install
   ```

2. **Verify Database**
   ```bash
   docker ps | grep postgres
   ```

3. **Run Basic Test**
   ```bash
   npm test -- --testPathPatterns="database.test"
   ```

4. **Run Full Suite**
   ```bash
   npm run test:all
   ```

5. **Review Results**
   ```bash
   open coverage/lcov-report/index.html
   ```

Your comprehensive test suite is ready for execution!