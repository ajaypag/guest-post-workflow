# Guest Post Workflow - E2E Authentication Tests

Comprehensive end-to-end testing suite for authentication flows, user journeys, and permission systems in the Guest Post Workflow application.

## 🎯 Test Coverage

### Authentication Tests
- Internal user login/logout flows
- Account user login/logout flows  
- Invalid credential handling
- Session management and persistence
- Security vulnerability testing (SQL injection, XSS)

### Routing Protection Tests
- Unauthenticated route access controls
- Protected route redirections
- Role-based route access
- Deep link handling
- Performance and CORS testing

### Permission Boundary Tests
- Internal user admin privileges
- Account user data isolation
- Cross-user access prevention
- API endpoint permissions
- Role-based feature access

### User Journey Tests
- Complete internal user workflows
- Complete account user workflows
- Multi-tab session consistency
- Error recovery scenarios
- Performance benchmarks
- Accessibility compliance

## 🚀 Quick Start

### Prerequisites

1. **Development Server Running**
   ```bash
   # In main application directory
   npm run dev
   # Server should be accessible at http://localhost:3000
   ```

2. **Database Available**
   - PostgreSQL database with production data
   - Test users available:
     - `miro@outreachlabs.com` (internal)
     - `darko@outreachlabs.com` (internal)
     - `leo@outreachlabs.com` (internal)

3. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://user:pass@host:port/db
   TEST_BASE_URL=http://localhost:3000  # Optional, defaults to localhost:3000
   ```

### Installation

```bash
cd tests/e2e
npm install
```

### Run Tests

```bash
# Run all authentication tests
npm test

# Run in headless mode (faster)
npm run test:auth:headless

# Run in parallel (fastest)
npm run test:auth:parallel

# Run with verbose output
npm run test:auth:verbose

# Run specific test suite
npm run test:authentication
npm run test:routing
npm run test:permissions
npm run test:journeys

# Run specific test
npm run test:specific -- "should login internal user"
```

## 📊 Test Reports

After running tests, you'll find:

### Generated Reports
```
tests/e2e/reports/
├── auth-test-report-[timestamp].html    # Interactive HTML report
├── auth-test-report-[timestamp].json    # Detailed JSON data
├── screenshots/                         # Test screenshots
│   ├── login-page-internal.png
│   ├── internal-journey-01-login.png
│   └── ...
└── logs/                                # Execution logs
    └── test-execution-[date].log
```

### Report Features
- 📈 Success/failure metrics with percentages
- ⏱️ Performance timing data
- 📸 Screenshot verification points
- 🔍 Detailed error information
- 📋 Step-by-step journey tracking

## 🧪 Test Architecture

### File Structure
```
tests/e2e/
├── auth-suite.js              # Main orchestrator
├── utils/                     # Shared utilities
│   ├── auth-helpers.js        # Authentication functions
│   ├── browser-utils.js       # Puppeteer management
│   ├── db-helpers.js          # Database verification
│   └── test-config.js         # Configuration & reporting
├── specs/                     # Test specifications
│   ├── authentication.test.js # Login/logout tests
│   ├── routing.test.js        # Route protection tests
│   ├── permissions.test.js    # Permission boundary tests
│   └── user-journeys.test.js  # End-to-end workflows
└── reports/                   # Generated test reports
```

### Key Components

#### AuthHelper Class
```javascript
const authHelper = new AuthHelper('http://localhost:3000');
await authHelper.login(user);
await authHelper.testRouteAccess('/admin', true);
await authHelper.logout();
```

#### Browser Utilities
```javascript
await captureScreenshot(page, 'test-step-name');
await safeClick(page, 'button[type="submit"]');
await waitForElement(page, '.success-message');
```

#### Database Verification
```javascript
const users = await getTestUsers('internal');
const permissions = await getUserPermissions(userId, 'internal');
const verification = await verifyUserInDatabase(email, 'internal');
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_BASE_URL` | `http://localhost:3000` | Application server URL |
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `HEADLESS` | `true` | Run browser in headless mode |
| `VERBOSE` | `false` | Enable detailed logging |
| `PARALLEL` | `false` | Run tests in parallel |
| `RETRIES` | `2` | Number of test retries on failure |
| `SLOW_MO` | `0` | Slow down browser actions (ms) |

### Test Configuration
```javascript
// tests/e2e/utils/test-config.js
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: {
    default: 30000,
    navigation: 45000,
    element: 10000
  },
  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 }
  }
};
```

## 🎯 Usage Examples

### Running Specific Test Scenarios

```bash
# Test only internal user authentication
npm run test:specific -- "Internal User Authentication"

# Test only routing protection
npm run test:specific -- "Routing Protection Tests"

# Test cross-user permissions
npm run test:specific -- "Cross-User Data Access"

# Test complete user journeys
npm run test:specific -- "Internal User Complete Workflow"
```

### Custom Test Execution

```bash
# Run with custom settings
HEADLESS=false VERBOSE=true npm test

# Run against different server
TEST_BASE_URL=http://localhost:3001 npm test

# Run with slower execution for debugging
SLOW_MO=500 npm test

# Run in CI environment
CI=true npm run test:auth:parallel
```

### Development Mode

```bash
# Watch mode for test development
npm run test:jest:watch

# Clean reports before running
npm run clean:reports && npm test

# Get help with available commands
npm run help
```

## 🛠️ Troubleshooting

### Common Issues

#### "Development server not accessible"
```bash
# Ensure main app server is running
cd ../../  # Go to main app directory
npm run dev
# Then run tests in another terminal
```

#### "Database connection failed"  
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# Verify database is accessible
psql $DATABASE_URL -c "SELECT 1;"
```

#### "No test users found"
```bash
# Verify test users exist in database
psql $DATABASE_URL -c "SELECT email FROM users WHERE email LIKE '%outreachlabs.com';"
```

#### "Browser launch failed"
```bash
# Install Puppeteer dependencies
sudo apt-get update
sudo apt-get install -y chromium-browser

# Or use system Chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm test
```

#### "Tests timeout"
```bash
# Increase timeout for slower systems
TEST_TIMEOUT=60000 npm test

# Run in non-headless mode to debug
HEADLESS=false npm test
```

### Debug Mode

```bash
# Run with full debugging
DEBUG=* VERBOSE=true HEADLESS=false npm test

# Capture more screenshots
SCREENSHOT_ON_FAILURE=true npm test

# Keep browser open after tests
KEEP_BROWSER_OPEN=true npm test
```

## 📈 Performance Benchmarks

### Expected Performance Metrics
- **Login**: < 10 seconds
- **Route Navigation**: < 8 seconds each
- **Logout**: < 5 seconds  
- **Complete Journey**: < 60 seconds
- **Database Queries**: < 2 seconds

### Performance Optimization
```bash
# Run in parallel for faster execution
npm run test:auth:parallel

# Use headless mode
npm run test:auth:headless

# Limit screenshot capture
SCREENSHOT_ON_FAILURE=false npm test
```

## 🔒 Security Testing

The test suite includes security vulnerability testing:

### SQL Injection Tests
```javascript
// Tests malicious SQL in login forms
"admin'; DROP TABLE users; --"
"admin' OR '1'='1"
```

### XSS Tests  
```javascript
// Tests script injection attempts
'<script>alert("xss")</script>@example.com'
'javascript:alert("xss")@example.com'
```

### Session Security
- Cookie security verification
- Session timeout handling
- Cross-tab session consistency
- Permission boundary enforcement

## 🤝 Contributing

### Adding New Tests

1. **Create test file** in `specs/` directory
2. **Use existing utilities** from `utils/`
3. **Follow naming conventions**: `feature.test.js`
4. **Include proper logging**: `logTestExecution()`
5. **Add screenshots**: `captureScreenshot()`

### Test File Template
```javascript
const { AuthHelper } = require('../utils/auth-helpers');
const { getConfig, logTestExecution } = require('../utils/test-config');

describe('Feature Tests', () => {
  let authHelper;
  const config = getConfig();

  beforeAll(async () => {
    authHelper = new AuthHelper(config.baseUrl);
    await authHelper.initialize();
  });

  afterAll(async () => {
    if (authHelper) {
      await authHelper.cleanup();
    }
  });

  test('should test feature functionality', async () => {
    // Test implementation
    logTestExecution('info', 'Test completed', { data });
  });
});
```

## 📚 Additional Resources

- [Puppeteer Documentation](https://puppeteer.github.io/puppeteer/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [PostgreSQL Node.js Client](https://node-postgres.com/)
- [Guest Post Workflow Documentation](../../docs/)

## 📝 License

MIT License - see main application license for details.