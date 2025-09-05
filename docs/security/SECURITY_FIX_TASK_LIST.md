# Security Fix Implementation Task List

## 🔴 CRITICAL-1: Email API Authentication Fix
**Severity**: CRITICAL | **Effort**: 2 hours | **Files**: 4

### Pre-Implementation Tasks
- [ ] Review current `requireInternalUser()` implementation in `/lib/auth/middleware.ts`
- [ ] Test email functionality in dev environment before changes
- [ ] Document current email API usage patterns
- [ ] Check if any external services call these endpoints

### Implementation Tasks

#### 1. Fix `/app/api/email/send/route.ts`
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check after line 12 (replacing TODO comment)
- [ ] Handle auth failure with proper 401 response
- [ ] Test sending different email types (welcome, workflow-completed, contact-outreach, custom)
- [ ] Verify error handling still works

#### 2. Fix `/app/api/email/stats/route.ts`
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check after line 5 (replacing TODO comment)
- [ ] Test statistics retrieval with date ranges
- [ ] Verify unauthorized access returns 401

#### 3. Fix `/app/api/email/logs/route.ts`
- [ ] Locate file and review current implementation
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check at start of handler
- [ ] Test log retrieval functionality
- [ ] Verify pagination still works if implemented

#### 4. Fix `/app/api/email/bulk/route.ts`
- [ ] Locate file and review current implementation
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check at start of handler
- [ ] Test bulk email functionality
- [ ] Add rate limiting for bulk operations

### Post-Implementation Tasks
- [ ] Run TypeScript compilation check
- [ ] Test all email endpoints with valid auth
- [ ] Test all email endpoints without auth (should fail)
- [ ] Update any frontend code that calls these endpoints
- [ ] Add API documentation noting auth requirement
- [ ] Create unit tests for auth protection

---

## 🔴 CRITICAL-2: Airtable Sync Security Fix
**Severity**: CRITICAL | **Effort**: 2 hours | **Files**: 1

### Pre-Implementation Tasks
- [ ] Review Airtable webhook documentation for signature validation
- [ ] Check if `AIRTABLE_WEBHOOK_SECRET` env variable exists
- [ ] Document current sync frequency and data volume
- [ ] Identify any automation that triggers sync

### Implementation Tasks

#### 1. Secure POST endpoint `/app/api/airtable/sync/route.ts`
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Replace TODO comment (line 13-14) with auth check
- [ ] Add webhook signature validation function
- [ ] Implement signature check for automated webhooks
- [ ] Add IP whitelist for Airtable IPs (if available)
- [ ] Log all sync attempts with timestamp and source

#### 2. Secure GET endpoint (same file)
- [ ] Add auth check at start of GET handler
- [ ] Consider making stats internal-only
- [ ] Remove sensitive data from response
- [ ] Add query parameter validation
- [ ] Implement result pagination if not present

### Webhook Security Implementation
```typescript
function verifyAirtableSignature(payload: string, signature: string): boolean {
  // Implementation details
}
```
- [ ] Create signature validation function
- [ ] Add environment variable for webhook secret
- [ ] Test with valid signatures
- [ ] Test with invalid signatures
- [ ] Add replay attack prevention (timestamp check)

### Post-Implementation Tasks
- [ ] Test manual sync with auth
- [ ] Test webhook sync with signature
- [ ] Verify sync still works properly
- [ ] Update Airtable webhook configuration
- [ ] Monitor for any sync failures
- [ ] Document new auth requirements

---

## 🔴 CRITICAL-3: Configuration Exposure Fix
**Severity**: CRITICAL | **Effort**: 30 minutes | **File**: 1

### Pre-Implementation Tasks
- [ ] Check if endpoint is used in production
- [ ] Search codebase for references to `/api/email/test-config`
- [ ] Determine if endpoint is needed at all

### Implementation Tasks

#### Option A: Remove Endpoint (Recommended for Production)
- [ ] Check `NODE_ENV` at start of handler
- [ ] Return 404 if `NODE_ENV === 'production'`
- [ ] Keep functionality for development/staging

#### Option B: Secure Endpoint
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check at start of handler
- [ ] Remove sensitive data from response:
  - [ ] Remove `resendKeyPrefix` (line 10)
  - [ ] Remove `resendKeyLength` (line 9)
  - [ ] Remove `nodeEnv` (line 15)
  - [ ] Keep only non-sensitive config

### Post-Implementation Tasks
- [ ] Test in development environment
- [ ] Verify production returns 404 or requires auth
- [ ] Update any debugging documentation
- [ ] Check monitoring/health check dependencies

---

## 🔴 CRITICAL-4: Database Checker Security Fix
**Severity**: CRITICAL | **Effort**: 1 hour | **File**: 1

### Pre-Implementation Tasks
- [ ] Review what database operations are performed
- [ ] Check if used by any monitoring systems
- [ ] Document legitimate use cases
- [ ] Consider if endpoint should exist in production

### Implementation Tasks

#### Secure `/app/api/database-checker/route.ts`
- [ ] Import `requireInternalUser` from `@/lib/auth/middleware`
- [ ] Add auth check at start of POST handler
- [ ] Add additional admin role check:
  ```typescript
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  ```
- [ ] Consider moving to `/api/admin/database-checker`
- [ ] Add rate limiting (max 1 request per minute)
- [ ] Log all access attempts with user ID

#### Reduce Information Disclosure
- [ ] Limit schema information returned
- [ ] Remove column default values from response
- [ ] Remove nullable information
- [ ] Return only table names and row counts
- [ ] Remove test data creation functionality

### Post-Implementation Tasks
- [ ] Test with admin user
- [ ] Test with internal non-admin user (should fail)
- [ ] Test with account user (should fail)
- [ ] Test without auth (should fail)
- [ ] Update any monitoring tools using this endpoint

---

## 🔴 CRITICAL-5: ManyReach Webhook Security Fix
**Severity**: CRITICAL | **Effort**: 2 hours | **File**: 1

### Pre-Implementation Tasks
- [ ] Check if `MANYREACH_WEBHOOK_URL_SECRET` is set in production
- [ ] Review ManyReach webhook documentation
- [ ] Test current webhook in staging environment
- [ ] Document current webhook URL pattern

### Implementation Tasks

#### Fix `/app/api/webhooks/manyreach/[secret]/route.ts`
- [ ] Re-enable URL secret validation (line 185):
  ```typescript
  const secretValid = validateWebhookSecret(secret);
  ```
- [ ] Add security event logging for failed attempts
- [ ] Implement API key validation if ManyReach provides one:
  ```typescript
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.MANYREACH_API_KEY) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  ```
- [ ] Fix IP validation function (lines 112-143)
- [ ] Add ManyReach's actual IP ranges
- [ ] Implement timestamp validation (5-minute window)

### Security Logging
- [ ] Create security log entry for failed validations
- [ ] Include IP, timestamp, and reason for failure
- [ ] Alert on multiple failed attempts
- [ ] Track successful webhooks for audit

### Post-Implementation Tasks
- [ ] Generate new webhook secret: `openssl rand -hex 32`
- [ ] Update environment variables
- [ ] Test with valid secret
- [ ] Test with invalid secret
- [ ] Update ManyReach webhook configuration
- [ ] Monitor webhook processing for 24 hours

---

## 🟠 HIGH-1: Session Validation Enhancement
**Severity**: HIGH | **Effort**: 4 hours | **Files**: Multiple

### Pre-Implementation Tasks
- [ ] Review current SessionManager implementation
- [ ] Understand session storage mechanism
- [ ] Document session lifecycle
- [ ] Check session expiry handling

### Implementation Tasks

#### 1. Enhance Middleware Session Check `/middleware.ts`
- [ ] Replace `hasSession()` function (lines 33-44) with `hasValidSession()`
- [ ] Implement quick validation without full session load:
  ```typescript
  async function hasValidSession(request: NextRequest): Promise<boolean> {
    const sessionId = request.cookies.get('auth-session')?.value;
    if (!sessionId) return false;
    
    // Quick validation without full session load
    const isValid = await SessionManager.quickValidate(sessionId);
    return isValid;
  }
  ```
- [ ] Update all references to use new function
- [ ] Add session expiry check
- [ ] Add signature validation

#### 2. Implement Quick Validation in SessionManager
- [ ] Add `quickValidate()` method to SessionManager
- [ ] Check session exists in store
- [ ] Verify session not expired
- [ ] Validate session signature
- [ ] Cache validation results (5 minute TTL)

### Post-Implementation Tasks
- [ ] Test with valid sessions
- [ ] Test with expired sessions
- [ ] Test with invalid session IDs
- [ ] Test with tampered cookies
- [ ] Performance test middleware
- [ ] Monitor for increased latency

---

## 🟠 HIGH-2: Global Rate Limiting Implementation
**Severity**: HIGH | **Effort**: 1 day | **Files**: Multiple

### Pre-Implementation Tasks
- [ ] Research Redis hosting options
- [ ] Set up Redis instance (development)
- [ ] Review current rate limiter usage
- [ ] Document API usage patterns
- [ ] Define rate limits per endpoint type

### Implementation Tasks

#### 1. Set Up Redis Infrastructure
- [ ] Install Redis dependencies: `npm install ioredis`
- [ ] Add `REDIS_URL` to environment variables
- [ ] Create Redis connection singleton
- [ ] Add connection retry logic
- [ ] Implement health check endpoint

#### 2. Enhance Rate Limiter `/lib/utils/rateLimiter.ts`
- [ ] Replace in-memory storage with Redis
- [ ] Implement distributed rate limiting
- [ ] Add sliding window algorithm
- [ ] Create different limiter instances:
  - [ ] Public endpoints: 100 req/min
  - [ ] Auth endpoints: 10 req/min
  - [ ] Write operations: 30 req/min
  - [ ] Admin endpoints: 50 req/min
- [ ] Add bypass for internal services

#### 3. Apply Rate Limiting in Middleware
- [ ] Import rate limiter in `/middleware.ts`
- [ ] Add rate limit check before auth check
- [ ] Return 429 with Retry-After header
- [ ] Log rate limit violations
- [ ] Add metrics collection

### Endpoint-Specific Limits
- [ ] `/api/email/*` - 10 req/min per user
- [ ] `/api/ai/*` - 5 req/min per user
- [ ] `/api/bulk-analysis/*` - 2 req/min per user
- [ ] `/api/admin/*` - 50 req/min per user
- [ ] Webhooks - 100 req/min per source

### Post-Implementation Tasks
- [ ] Load test rate limiting
- [ ] Verify Redis failover behavior
- [ ] Test with concurrent requests
- [ ] Monitor Redis memory usage
- [ ] Create rate limit dashboard
- [ ] Document rate limits in API docs

---

## 🟠 HIGH-3: Authentication Pattern Standardization
**Severity**: HIGH | **Effort**: 6 hours | **Files**: 50+

### Pre-Implementation Tasks
- [ ] Audit all API endpoints for current auth patterns
- [ ] Count usage of each pattern
- [ ] Identify edge cases
- [ ] Choose standard pattern
- [ ] Create migration guide

### Decision: Standard Pattern Selection
- [ ] Option A: `withAuth()` wrapper (functional)
- [ ] Option B: `requireAuth()` at start (imperative)
- [ ] Option C: Decorator pattern (if TypeScript supports)
- [ ] Document decision rationale

### Implementation Tasks

#### 1. Create Standard Auth Utilities
- [ ] Create `/lib/auth/standard.ts`
- [ ] Export standard auth check function
- [ ] Export role-based checks
- [ ] Export resource-based checks
- [ ] Add TypeScript types

#### 2. Update All Endpoints (Systematic Approach)
- [ ] Create list of all API routes
- [ ] Group by authentication requirement:
  - [ ] Public (no auth)
  - [ ] Authenticated (any user)
  - [ ] Internal only
  - [ ] Admin only
  - [ ] Resource-based
- [ ] Update each group systematically
- [ ] Test each endpoint after update

#### 3. Remove Old Patterns
- [ ] Deprecate unused auth functions
- [ ] Update imports
- [ ] Remove redundant code
- [ ] Update documentation

### Post-Implementation Tasks
- [ ] Run full API test suite
- [ ] Update API documentation
- [ ] Create developer guide
- [ ] Add linting rules for auth patterns
- [ ] Code review all changes

---

## 🟠 HIGH-4: SQL Injection Prevention Audit
**Severity**: HIGH | **Effort**: 2 hours | **Files**: ~10

### Pre-Implementation Tasks
- [ ] Search for all `pool.query()` usage
- [ ] Search for all `db.execute()` usage
- [ ] Search for template literal SQL
- [ ] Document current ORM usage (Drizzle)
- [ ] List all dynamic query builders

### Implementation Tasks

#### 1. Audit Raw SQL Queries
- [ ] Review `/app/api/airtable/sync/route.ts:43-57`
- [ ] Check all query parameters are parameterized
- [ ] Replace template literals with parameterized queries:
  ```typescript
  // BAD
  `SELECT * FROM users WHERE id = ${userId}`
  
  // GOOD
  'SELECT * FROM users WHERE id = $1', [userId]
  ```

#### 2. Fix Identified Vulnerable Queries
- [ ] List each vulnerable query location
- [ ] Convert to parameterized format
- [ ] Test query still works
- [ ] Add input validation
- [ ] Consider moving to ORM

#### 3. Add Query Validation Layer
- [ ] Create SQL validation utility
- [ ] Check for common injection patterns
- [ ] Log suspicious queries
- [ ] Add query timeout limits
- [ ] Implement query complexity limits

### Prevention Measures
- [ ] Add ESLint rule for template literal SQL
- [ ] Create safe query builder utilities
- [ ] Document safe SQL practices
- [ ] Add SQL injection tests
- [ ] Regular security scanning

### Post-Implementation Tasks
- [ ] Test all modified queries
- [ ] Run SQL injection test suite
- [ ] Performance test parameterized queries
- [ ] Update developer documentation
- [ ] Schedule regular SQL audits

---

## Implementation Priority Order

### Week 1 - Critical Issues
1. Day 1: CRITICAL-1 (Email APIs) + CRITICAL-3 (Config Exposure)
2. Day 2: CRITICAL-2 (Airtable) + CRITICAL-4 (DB Checker)
3. Day 3: CRITICAL-5 (ManyReach Webhook)
4. Day 4-5: Testing and verification

### Week 2 - High Priority
1. Day 1-2: HIGH-2 (Global Rate Limiting)
2. Day 3: HIGH-1 (Session Validation)
3. Day 4-5: HIGH-3 (Auth Standardization)

### Week 3 - Cleanup
1. Day 1: HIGH-4 (SQL Injection Audit)
2. Day 2-3: Testing and monitoring
3. Day 4-5: Documentation and training

---

## Success Metrics

- [ ] 0 unauthenticated critical endpoints
- [ ] 100% of endpoints have rate limiting
- [ ] Single auth pattern across codebase
- [ ] 0 template literal SQL queries
- [ ] Session validation < 50ms latency
- [ ] Security test suite passing
- [ ] Monitoring alerts configured
- [ ] Team trained on secure patterns

---

*Last Updated: September 5, 2025*