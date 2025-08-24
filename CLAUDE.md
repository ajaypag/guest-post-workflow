# Guest Post Workflow - AI Coder Guide

Production-ready workflow system with PostgreSQL, multi-user auth, and AI agent integration.

## 🚨 Critical Production Info

**Version**: v1.0.2 (TypeScript Fixed) | **Status**: ✅ Production Ready

### Must Know Before Coding
1. **Do NOT change** JSON storage model for workflows - it's working
2. **Step components**: Use `*Clean.tsx` files, NOT original versions ([details](#step-component-warning))
3. **VARCHAR limits**: AI content needs TEXT columns, not VARCHAR ([details](#varchar-critical))
4. **Build verification**: Always use `timeout 600 npm run build` - default builds show false success ([details](#typescript-build-status))
5. **NEW: Domain Normalization** - All domains must use normalized format ([details](#domain-normalization-critical))
6. **NEW: Run Migrations** - Critical migrations pending before production

### 🚨 PENDING MIGRATIONS (Run These First!)
1. **Publisher System**: `migrations/0035_publisher_offerings_system_fixed.sql`
2. **Domain Normalization**: `migrations/0037_normalize_existing_domains.sql`
3. **Target URL Matching**: `migrations/0060_add_target_url_matching.sql` (✅ Tested locally)
4. **Inclusion Status Fix**: `migrations/0061_fix_inclusion_status_defaults.sql` (✅ NEW - 2025-08-20)
   - **IMPORTANT**: Run via `/admin/fix-inclusion-status` page for production
   - Fixes NULL inclusion_status defaulting to 'included' for better UX
5. **Use Admin Panel**: `/admin/domain-migration` for safe migration

### Recent Changes (Keep in Mind)
- ✅ Inclusion Status Default Fix (2025-08-20)
  - Fixed NULL inclusion_status causing UI/backend mismatch
  - All line items now default to 'included' for better UX
  - Fixes invoicing and metrics tracking
  - Admin migration page: `/admin/fix-inclusion-status`
  - Migration: `migrations/0061_fix_inclusion_status_defaults.sql`
- ✅ Target URL Matching System (2025-08-19) - PHASES 1-3 COMPLETE
  - AI-powered domain to target URL matching (no more random assignments!)
  - Two-step process: qualification → target matching with O3 model
  - Database fields: `suggested_target_url`, `target_match_data`, `target_matched_at`
  - Standalone API: `/api/clients/[id]/bulk-analysis/target-match`
  - Integrated in master-qualify with `skipTargetMatching` option
  - Full evidence tracking with match quality scores
  - Migration: `migrations/0060_add_target_url_matching.sql`
  - See: [docs/05-features/target-url-matching-implementation.md](docs/05-features/target-url-matching-implementation.md)
- ✅ TypeScript Compilation Fixed (2025-02-14) - ALL ERRORS RESOLVED
  - Fixed Next.js 15 Promise-based searchParams compatibility
  - Aligned database schema with TypeScript interfaces
  - Fixed nullable fields, string/number type mismatches
  - Updated component prop types and table structures
  - Build now passes cleanly with extended timeout verification
- 🔄 Order Interface Redesign (2025-01-31) - IN PROGRESS
  - Three-column layout with space-efficient grouped views
  - Dual-mode: Simple (wizard) vs Detailed (power user)
  - Placeholder system for connected flow
  - Package-based pricing tiers
  - See: `/orders/new` and [docs/06-planning/order-interface-redesign.md](docs/06-planning/order-interface-redesign.md)
- ✅ V2 Article Generation with ArticleEndCritic (2025-01-19)
- ✅ Agent retry pattern for text response fix
- ✅ Dynamic outline-based completion detection
- ✅ Increased section limit to 40
- ✅ Auto-save race condition fix for AI agents (2025-01-20)
- ✅ User system migration to invite-only (2025-01-29)
- ✅ Email service integration with invitations (2025-01-29)
- ⚠️ Auto-save diagnostics removed (reverted)
- 🏗️ Advertiser/Publisher architecture redesign (2025-01-30)
  - Created separate tables for advertisers/publishers
  - Orders currently use users.id (migration needed)
  - See: docs/02-architecture/authentication.md
- ✅ Account Authentication System (2025-01-30)
  - Full login/logout with HTTP-only cookies
  - Password reset via email
  - Account settings & profile management
  - JWT auto-refresh & rate limiting
  - Role-based permissions (viewer/editor/admin)
- ✅ Order System Phase 1 & 2 Complete (2025-01-30)
  - Multi-client order creation working
  - Bulk analysis projects auto-created on order confirmation
  - Notification system for internal users
  - **MIGRATION REQUIRED**: Run `/admin/order-groups-migration`
- 🆕 Publisher Portal System (2025-02-14)
  - Publishers can manage websites and offerings
  - Internal team can use same infrastructure
  - One website → multiple publishers (no duplicates)
  - See: [docs/06-planning/publisher-portal-implementation.md](docs/06-planning/publisher-portal-implementation.md)
- 🆕 Internal Portal (2025-02-14)
  - Website management at `/internal/websites`
  - Publisher oversight tools
  - Bulk operations support
  - See: [docs/06-planning/internal-portal-plan.md](docs/06-planning/internal-portal-plan.md)
- ⚠️ Domain Normalization System (2025-02-14)
  - CRITICAL: Prevents duplicate websites
  - Normalizes www, protocols, casing
  - Migration tool at `/admin/domain-migration`
  - See: [docs/07-qa/domain-handling-qa-report.md](docs/07-qa/domain-handling-qa-report.md)

## 🔧 Quick Reference

| What You Need | Where to Find It |
|--------------|------------------|
| **Local Setup** | [docs/01-getting-started/local-development.md](docs/01-getting-started/local-development.md) |
| **Deploy to Coolify** | [docs/01-getting-started/deployment.md](docs/01-getting-started/deployment.md) |
| **Database Schema** | [docs/02-architecture/database-schema.md](docs/02-architecture/database-schema.md) |
| **Build AI Agents** | [docs/03-development/building-ai-agents.md](docs/03-development/building-ai-agents.md) |
| **Auto-Save Fix** | [docs/03-development/auto-save-pattern.md](docs/03-development/auto-save-pattern.md) |
| **Email System** | [docs/04-operations/email-service.md](docs/04-operations/email-service.md) |
| **Debug Issues** | [docs/04-operations/diagnostics.md](docs/04-operations/diagnostics.md) |
| **Order System Implementation** | [docs/02-architecture/order-system.md](docs/02-architecture/order-system.md) |
| **Tech Debt & Shortcuts** | [docs/02-architecture/technical-debt.md](docs/02-architecture/technical-debt.md) |
| **All Documentation** | [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) |

### Production Config
```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=disable
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
RESEND_API_KEY=re_your_api_key_here
```

### Email Configuration (Resend)
- **From Address**: `info@linkio.com`
- **Reply-To**: `info@linkio.com`
- **Service**: Resend API with environment variable `RESEND_API_KEY`

## ⚠️ Active Issues & Warnings

### 🎯 TypeScript Build Status
**Status**: ✅ **FULLY RESOLVED** (2025-02-14)
- **Build Time**: ~24 seconds (passing)
- **Pages Generated**: 301 (all successful)
- **Errors**: 0 TypeScript errors
- **Method**: Extended timeout builds to catch real errors
- **Key Insight**: Default builds show false success - always use extended timeout for real error detection

### Step Component Warning
```
❌ NEVER EDIT: ArticleDraftStep.tsx, ContentAuditStep.tsx, FinalPolishStep.tsx
✅ ALWAYS EDIT: ArticleDraftStepClean.tsx, ContentAuditStepClean.tsx, FinalPolishStepClean.tsx
```
Check `components/StepForm.tsx` line 40-57 for actual imports.

### VARCHAR Critical
**Problem**: AI generates long text → VARCHAR(100) → silent failures  
**Solution**: Always use TEXT for AI content
```sql
-- ❌ WRONG
approach VARCHAR(100)  -- AI text gets truncated

-- ✅ CORRECT  
approach TEXT         -- Safe for AI content
```
Run `/admin/varchar-limits` to check all columns.

### Domain Normalization Critical
**Problem**: Same website stored multiple times (www.example.com, EXAMPLE.COM, https://example.com)  
**Impact**: Duplicate data, failed matching, broken publisher assignments  
**Solution**: All domains normalized automatically
```typescript
// Input variations all normalize to same domain:
normalizeDomain('https://www.example.com') // → 'example.com'
normalizeDomain('WWW.EXAMPLE.COM')         // → 'example.com'
normalizeDomain('example.com/')            // → 'example.com'
```
**Migration**: Run `/admin/domain-migration` to normalize existing data  
**New Code**: Use `import { normalizeDomain } from '@/lib/utils/domainNormalizer'`

### Auto-Save Race Condition (AI Agents)
**Problem**: AI generates content → Auto-save shows success → But saves empty data!  
**Cause**: React setState race condition - auto-save reads old state  
**Solution**: Pass immediate data to `triggerAutoSave(data)`
```typescript
// ❌ WRONG - Race condition
onChange(newData);  // setState is async, auto-save reads old state

// ✅ CORRECT - Immediate data
onChange(newData);  // triggerAutoSave gets data directly
```
[Full guide: docs/03-development/auto-save-pattern.md](docs/03-development/auto-save-pattern.md)

## 🤖 AI Agent Development

### V2 Pattern (Recommended)
New LLM orchestration approach - agent drives conversation naturally:
- Single agent, empty instructions
- Database-driven prompts
- ArticleEndCritic for completion
- [Full guide: docs/03-development/ai-v2-pattern.md](docs/03-development/ai-v2-pattern.md)

### Agent Text Retry Fix
```typescript
// Agents output text instead of tools? Apply this:
import { assistantSentPlainText, SEMANTIC_AUDIT_RETRY_NUDGE } from '@/lib/utils/agentUtils';
```
[Implementation: docs/03-development/retry-pattern.md](docs/03-development/retry-pattern.md)

## 🔍 Debugging Protocol

**When AI features fail with vague errors:**

1. **Run diagnostics**: `/admin/diagnostics`
2. **Check VARCHAR limits**: `/admin/varchar-limits` 
3. **Test exact insert**: `/admin/test-database-inserts`
4. **Verify tables**: `/admin/database-migration`

[Full protocol: docs/04-operations/diagnostics.md](docs/04-operations/diagnostics.md)

## 📋 Common Tasks

```bash
# Development
npm run dev                    # Start local server
npm run build                  # Production build (✅ PASSING)
timeout 600 npm run build      # Extended timeout for real error detection
npm run db:studio             # Browse database

# Testing endpoints
/database-checker       # System health check
/api/workflows/[id]/validate  # Workflow validation
/admin/*               # Diagnostic tools
```

## 🚀 Latest Features

### TypeScript Compilation Fixed (Production Ready)
- **Status**: ✅ **FULLY RESOLVED** (2025-02-14)
- All 29 TypeScript errors systematically eliminated
- Build passes cleanly in ~24 seconds
- Extended timeout pattern prevents false success detection
- Database schema properly aligned with TypeScript interfaces
- Next.js 15 compatibility issues resolved
- See: [docs/03-development/typescript-compilation-fixes.md](docs/03-development/typescript-compilation-fixes.md)

### Order Interface Redesign (In Progress)
- Three-column layout with space-efficient grouped views
- Dual-mode interface: Simple (wizard) vs Detailed (power user)
- Placeholder system for connected flow between columns
- Package-based pricing (Bronze/Silver/Gold/Custom)
- **Status**: Initial implementation complete, further refinement needed
- See: `/orders/new` and [docs/06-planning/order-interface-redesign.md](docs/06-planning/order-interface-redesign.md)

### V2 Article Generation (Production Ready)
- True LLM orchestration without complex tools
- ArticleEndCritic with o4-mini for completion detection  
- Dynamic outline analysis
- 40 section support
- See: `AgenticArticleV2Service` and toggle in `ArticleDraftStepClean.tsx`

### Services with Retry Fix Applied
- ✅ `agenticSemanticAuditService.ts`
- 🔄 `agenticArticleService.ts` (in progress)
- ⏳ `agenticFormattingQAService.ts` (planned)

## 🔒 Security & Authentication

**When implementing auth/permissions for shared interfaces**:
1. Check [CLIENT_SECURITY_IMPLEMENTATION.md](docs/02-architecture/security.md)
2. Follow the pattern from [ORDER_SYSTEM_IMPLEMENTATION.md](docs/02-architecture/order-system.md)
3. Key pattern:
```typescript
if (session.userType === 'internal') {
  // Full access
} else if (session.userType === 'account') {
  // Check ownership (accountId === userId)
}
```

## 📚 Full Documentation

For detailed guides on all topics:
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete documentation index
- **[Building Agents](docs/03-development/)** - Agent patterns and examples
- **[Database Rules](docs/03-development/)** - Schema patterns and pitfalls
- **[Architecture](docs/02-architecture/)** - System design and patterns
- **[Security](docs/02-architecture/security.md)** - Auth patterns for shared interfaces

---

**Need help?** Check [docs/](docs/) or use diagnostic tools at `/admin/*`