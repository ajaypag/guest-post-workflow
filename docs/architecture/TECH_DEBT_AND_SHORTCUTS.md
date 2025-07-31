# Tech Debt and Shortcuts Documentation

This document tracks technical debt, shortcuts, and architectural compromises made during development.

## ✅ RESOLVED Tech Debt

### Authentication System (Fixed 2025-01-30)
- ✅ **Missing authentication on critical endpoints** - Added auth to `/api/orders/new`, `/api/orders/[id]/confirm`, `/api/orders/calculate-pricing`
- ✅ **Permission bugs in account endpoints** - Fixed to use correct session fields
- ✅ **No password reset flow** - Implemented complete password reset with email
- ✅ **No account settings page** - Created full settings/profile management
- ✅ **JWT tokens not refreshing** - Implemented automatic token refresh
- ✅ **No rate limiting** - Added rate limiting to auth endpoints  
- ✅ **Basic role management** - Implemented role-based permissions system
- ✅ **XSS-vulnerable localStorage** - Migrated to HTTP-only cookies

## 🔴 CRITICAL Tech Debt

### 1. Payment Recording System ⚠️
**Impact**: Can't mark orders as paid, blocking workflow generation
**Current**: Workflow generation checks `order.paidAt` but no way to set it
**Workaround**: Use `skipPaymentCheck: true` in API calls
**Fix Required**:
- Payment recording endpoint (`/api/orders/[id]/record-payment`)
- Invoice generation and storage
- Payment UI in order management

### 2. Invite-Only Registration System
**Impact**: Can't create new account users
**Current**: Registration endpoint returns "not implemented"
**Workaround**: Manual database insertion
**Fix**: Complete invite system implementation

## 🟡 MEDIUM Priority Tech Debt

### Authentication & Security
1. **No offline token inspection**
   - Can't check JWT expiration client-side
   - Blindly refreshes every 5 minutes
   - **Better**: Server endpoint for token metadata

2. **Limited error context**
   - All auth failures redirect to login
   - Can't distinguish expired vs invalid
   - **Better**: Specific error codes from server

3. **No CSRF protection**
   - Relying only on sameSite cookies
   - No explicit CSRF tokens
   - **Better**: Double-submit cookie pattern

4. **Basic refresh strategy**
   - Refreshes regardless of activity
   - No idle timeout
   - **Better**: Activity-based refresh

### Data & Integrations
1. **Hardcoded domain metrics**
   - DR always 70, traffic always 10000
   - **Fix**: Integrate DataForSEO API

2. **Static pricing calculation**
   - Fixed prices regardless of quality
   - **Fix**: Dynamic pricing based on metrics

3. **Basic niche assignment**
   - Random assignment logic
   - **Fix**: Smart matching algorithm

4. **CreatedBy References** 
   - Orders use session.userId correctly
   - Workflows still need proper user tracking
   - **Fix**: Update WorkflowService to use proper user data

### Architecture
1. **Step component duplication**
   - Two versions (*Clean.tsx and *.tsx)
   - Technical debt from refactoring
   - **Fix**: Complete migration to Clean versions

2. **In-memory rate limiting**
   - Resets on server restart
   - **Fix**: Redis-based rate limiting

3. **In-memory password reset tokens**
   - Lost on server restart
   - **Fix**: Database-backed tokens

## 🟢 LOW Priority Tech Debt

### User Experience
1. **No token persistence across tabs**
   - Each tab verifies independently
   - **Better**: BroadcastChannel for tab sync

2. **No logout broadcast**
   - Other tabs don't know about logout
   - **Better**: BroadcastChannel notification

3. **No client-side user cache**
   - Fetches user data on every load
   - **Better**: SessionStorage cache

### Developer Experience
1. **Incomplete TypeScript types**
   - Some `any` types remain
   - **Fix**: Proper type definitions

2. **Missing API documentation**
   - No OpenAPI/Swagger docs
   - **Fix**: Generate from route handlers

3. **Limited error handling**
   - Generic error messages
   - **Fix**: Structured error responses

## 📊 Tech Debt Metrics

| Category | Critical | Medium | Low | Total |
|----------|----------|--------|-----|-------|
| Resolved | 8 | 0 | 0 | 8 |
| Remaining | 2 | 10 | 6 | 18 |

## 🚀 Recommended Priority

1. **Payment Recording System** (Blocking workflow generation)
2. **Invite-Only Registration** (Blocking new accounts)
3. **DataForSEO Integration** (Data quality)
4. **CSRF Protection** (Security)
5. **Redis Rate Limiting** (Production stability)

## ✨ Recent Completions (2025-01-30)

### Phase 5: Workflow Generation ✅
- **WorkflowGenerationService** - Complete service implementation
- **Payment-aware generation** - Blocks until `order.paidAt` is set
- **Flexible payment terms** - `skipPaymentCheck` option
- **Smart user assignment** - Auto-assigns based on workload
- **Pre-filled workflows** - Starts with site selection data
- **Order item creation** - Links workflows to orders properly

## 📝 Notes

- Most shortcuts are pragmatic choices balancing security, functionality, and development speed
- Critical items block business functionality
- Medium items affect security or scalability
- Low items are nice-to-have improvements

Last updated: 2025-01-30