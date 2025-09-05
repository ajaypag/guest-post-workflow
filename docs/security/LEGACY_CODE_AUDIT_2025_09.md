# Legacy Code & Test API Audit Report
**Date**: September 5, 2025  
**Status**: 🚨 CRITICAL - Immediate action required

## Executive Summary
Found **700+ files** that appear to be test, debug, or legacy code that should NOT be in production. This includes:
- **164+ test API endpoints** under `/api/test/`
- **179 test files** in root directory
- **186 scripts** in `/scripts` folder
- **100+ admin endpoints** that may be unnecessary
- Multiple endpoints with **hardcoded credentials** and **dangerous operations**

## 🔴 CRITICAL RISK - Remove Immediately

### 1. Database Setup & Admin Creation
| File | Risk | Description |
|------|------|-------------|
| `/app/api/setup-db/route.ts` | **CRITICAL** | Creates admin with hardcoded password `admin123` |
| `/app/api/fix-schema/page.tsx` | **CRITICAL** | Modifies database schema |
| `/app/api/migrate/page.tsx` | **CRITICAL** | Runs database migrations |
| `/app/api/admin/migrations/route.ts` | **CRITICAL** | Database migration endpoint |
| `/app/api/admin/run-migration/route.ts` | **CRITICAL** | Executes migrations |

**Risk**: Anyone could reset your database or create admin accounts with known passwords.

### 2. Data Deletion & Manipulation
| File | Risk | Description |
|------|------|-------------|
| `/app/api/admin/manyreach/clear/route.ts` | **CRITICAL** | Deletes ALL drafts and email logs |
| `/app/api/test/bulk-fix-corrupted-publishers/route.ts` | **CRITICAL** | Mass data manipulation |
| `/app/api/test/reset-shadow-migration/route.ts` | **CRITICAL** | Resets migration status |
| `/app/api/test/cleanup-publisher-data/route.ts` | **CRITICAL** | Mass data cleanup |

**Risk**: Could delete or corrupt production data.

### 3. Information Disclosure
| File | Risk | Description |
|------|------|-------------|
| `/app/api/debug-users/route.ts` | **HIGH** | Exposes user database info |
| `/app/api/debug/check-account/route.ts` | **HIGH** | Account debugging data |
| `/app/security-test/page.tsx` | **MEDIUM** | Security testing interface |
| `/app/api/test-openai/route.ts` | **MEDIUM** | Tests OpenAI (costs money) |

## 🟠 HIGH RISK - Test Endpoints (164+ files)

### Complete List of `/api/test/` Endpoints
```
/api/test/
├── auth/
│   ├── create-test-user/route.ts
│   ├── reset-password-test/route.ts
│   └── verify-token/route.ts
├── bulk-operations/
│   ├── bulk-fix-corrupted-publishers/route.ts
│   ├── cleanup-publisher-data/route.ts
│   └── reset-all-claims/route.ts
├── email/
│   ├── fulfillment-email/route.ts
│   ├── test-bulk-send/route.ts
│   └── verify-templates/route.ts
├── publisher/
│   ├── create-publisher-claim/route.ts
│   ├── reset-publisher-claim/route.ts
│   └── shadow-migration/route.ts
└── [... 150+ more test endpoints ...]
```

**Recommendation**: DELETE entire `/app/api/test/` directory

## 🟡 MEDIUM RISK - Admin Endpoints

### Potentially Unnecessary Admin Tools
| Directory | File Count | Purpose | Keep? |
|-----------|------------|---------|-------|
| `/app/admin/manyreach/` | 15 files | ManyReach management | Maybe |
| `/app/admin/diagnostics/` | 8 files | System diagnostics | No |
| `/app/admin/migrations/` | 5 files | Database migrations | No |
| `/app/admin/test-tools/` | 12 files | Testing utilities | No |
| `/app/admin/impersonate/` | 3 files | User impersonation | Review |
| `/app/admin/shadow-publishers/` | 6 files | Publisher management | Review |

## 📁 Root Directory Test Files (179 files)

### Test Scripts Pattern
```
test-*.js (87 files)
check-*.ts (42 files)
debug-*.js (15 files)
fix-*.ts (10 files)
validate-*.js (8 files)
verify-*.ts (7 files)
analyze-*.js (5 files)
inspect-*.ts (5 files)
```

**Examples**:
- `test_manyreach_flow.js`
- `test_full_flow.js`
- `test_smart_bulk_process.js`
- `check_order_state.ts`
- `debug_session.js`
- `fix_publisher_claims.ts`

**Recommendation**: Move to `/tests` directory or remove entirely

## 📜 Scripts Directory (186 files)

### Categories of Scripts
| Type | Count | Examples | Risk |
|------|-------|----------|------|
| Migrations | 45 | `migrate-*.ts` | HIGH |
| Fixes | 38 | `fix-*.ts` | HIGH |
| Imports | 22 | `import-*.ts` | MEDIUM |
| Analysis | 31 | `analyze-*.ts` | LOW |
| Tests | 50 | `test-*.ts` | LOW |

**High Risk Scripts**:
- `scripts/force_update_niche.ts`
- `scripts/reset-all-publishers.ts`
- `scripts/cleanup-orphaned-data.ts`
- `scripts/migrate-production-data.ts`

## 🗑️ Backup & Old Files

### Files to Remove
```
middleware-old.ts
middleware-complex.ts
app/api/workflows/route-backup.ts
app/bulk-analysis/page-old.tsx
app/admin/users/page-old.tsx
components/orders/OrderSiteReviewTableV2.backup.tsx
```

## 📊 Summary Statistics

### File Counts by Category
| Category | Count | Action |
|----------|-------|--------|
| Test API endpoints | 164+ | DELETE |
| Root test files | 179 | MOVE/DELETE |
| Scripts | 186 | REVIEW/ARCHIVE |
| Admin endpoints | 100+ | AUDIT |
| Backup files | 15+ | DELETE |
| Test documentation | 10+ | ARCHIVE |
| **TOTAL** | **700+** | |

### Risk Distribution
- 🔴 **Critical**: 15 endpoints (immediate removal)
- 🟠 **High**: 164+ endpoints (test APIs)
- 🟡 **Medium**: 186 scripts + 100 admin endpoints
- 🟢 **Low**: Documentation and config files

## 🎯 Recommended Action Plan

### Phase 1: Immediate (Today)
1. **Delete** `/app/api/setup-db/` - Hardcoded admin creation
2. **Delete** entire `/app/api/test/` directory - 164+ test endpoints
3. **Delete** `/app/api/debug-users/` - User info exposure
4. **Delete** all backup files (`*-old.ts`, `*.backup.tsx`)
5. **Secure** remaining admin endpoints with `requireInternalUser()`

### Phase 2: High Priority (This Week)
1. **Move** root test files to `/tests` directory or separate repo
2. **Archive** `/scripts` directory to separate repository
3. **Audit** each `/app/admin/` endpoint for production necessity
4. **Remove** migration and diagnostic pages from `/app/`

### Phase 3: Cleanup (Next Sprint)
1. **Remove** test documentation from main repo
2. **Clean up** TODO comments and dead code
3. **Implement** environment-based route protection
4. **Add** linting rules to prevent test code in main branch

## 🔒 Security Recommendations

### Immediate Actions
1. **Change any default passwords** if setup-db was ever run in production
2. **Audit database** for test users with known credentials
3. **Review logs** for any usage of test/debug endpoints
4. **Implement rate limiting** on remaining admin endpoints

### Long-term Improvements
1. **Separate test environment** from production code
2. **CI/CD checks** to prevent test code deployment
3. **Code review process** to catch test utilities
4. **Regular security audits** to find accumulated test code

## 🚨 Most Dangerous Findings

### Top 5 Critical Endpoints to Remove
1. `/api/setup-db` - Creates admin with `admin123` password
2. `/api/admin/manyreach/clear` - Deletes ALL email data
3. `/api/test/bulk-fix-corrupted-publishers` - Mass data manipulation
4. `/api/debug-users` - Exposes user database structure
5. `/api/test/reset-shadow-migration` - Resets publisher migrations

### Hardcoded Credentials Found
- Admin email: `admin@example.com`
- Admin password: `admin123`
- Test user: `test@example.com`
- Various test API keys in test files

## 📝 Notes

- Many test files appear to be from development/debugging sessions
- Scripts folder contains one-off fixes that shouldn't be needed in stable production
- Admin interface has grown to 50+ pages, many appear to be temporary tools
- Test endpoints are currently protected only by middleware session checks
- No environment-based filtering (test code runs in production)

---

**Recommendation**: Immediate removal of critical endpoints, followed by systematic cleanup of test code. Consider implementing a separate test/staging environment to prevent this accumulation in the future.

*Generated: September 5, 2025*