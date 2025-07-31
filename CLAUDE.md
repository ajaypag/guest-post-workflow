# Guest Post Workflow - AI Coder Guide

Production-ready workflow system with PostgreSQL, multi-user auth, and AI agent integration.

## 🚨 Critical Production Info

**Version**: v1.0.0 (Stable) | **Status**: ✅ Production on Coolify

### Must Know Before Coding
1. **Do NOT change** JSON storage model for workflows - it's working
2. **Step components**: Use `*Clean.tsx` files, NOT original versions ([details](#step-component-warning))
3. **VARCHAR limits**: AI content needs TEXT columns, not VARCHAR ([details](#varchar-critical))
4. **Build must pass** before deployment - run `npm run build`

### Recent Changes (Keep in Mind)
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
  - See: docs/architecture/USER_TYPES.md
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

## 🔧 Quick Reference

| What You Need | Where to Find It |
|--------------|------------------|
| **Local Setup** | [docs/setup/LOCAL_DEV.md](docs/setup/LOCAL_DEV.md) |
| **Deploy to Coolify** | [docs/setup/COOLIFY_DEPLOY.md](docs/setup/COOLIFY_DEPLOY.md) |
| **Database Schema** | [docs/architecture/DATABASE.md](docs/architecture/DATABASE.md) |
| **Build AI Agents** | [docs/agents/BUILDING_BLOCKS.md](docs/agents/BUILDING_BLOCKS.md) |
| **Auto-Save Fix** | [docs/agents/AUTO_SAVE_PATTERN.md](docs/agents/AUTO_SAVE_PATTERN.md) |
| **Email System** | [docs/services/EMAIL_SERVICE.md](docs/services/EMAIL_SERVICE.md) |
| **Debug Issues** | [docs/admin/DIAGNOSTICS.md](docs/admin/DIAGNOSTICS.md) |
| **Order System Implementation** | [docs/architecture/ORDER_SYSTEM_IMPLEMENTATION.md](docs/architecture/ORDER_SYSTEM_IMPLEMENTATION.md) |
| **Tech Debt & Shortcuts** | [docs/architecture/TECH_DEBT_AND_SHORTCUTS.md](docs/architecture/TECH_DEBT_AND_SHORTCUTS.md) |
| **All Documentation** | [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) |

### Production Config
```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=disable
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
RESEND_API_KEY=re_your_api_key_here
```

### OpenAI Accounts
- info@onlyoutreach.com
- ajay@pitchpanda.com  
- ajay@linkio.com

### Email Configuration (Resend)
**TEMPORARY**: Using `onboarding@resend.dev` until domain verification complete
- **TODO**: After verifying `postflow.outreachlabs.net` in Resend:
  1. Remove temporary override in `lib/services/emailService.ts` line 29-31
  2. Emails will use: `noreply@postflow.outreachlabs.net`
- **Current**: All emails send from Resend's test address

## ⚠️ Active Issues & Warnings

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
[Full guide: docs/agents/AUTO_SAVE_PATTERN.md](docs/agents/AUTO_SAVE_PATTERN.md)

## 🤖 AI Agent Development

### V2 Pattern (Recommended)
New LLM orchestration approach - agent drives conversation naturally:
- Single agent, empty instructions
- Database-driven prompts
- ArticleEndCritic for completion
- [Full guide: docs/agents/V2_PATTERN.md](docs/agents/V2_PATTERN.md)

### Agent Text Retry Fix
```typescript
// Agents output text instead of tools? Apply this:
import { assistantSentPlainText, SEMANTIC_AUDIT_RETRY_NUDGE } from '@/lib/utils/agentUtils';
```
[Implementation: docs/agents/RETRY_PATTERN.md](docs/agents/RETRY_PATTERN.md)

## 🔍 Debugging Protocol

**When AI features fail with vague errors:**

1. **Run diagnostics**: `/admin/diagnostics`
2. **Check VARCHAR limits**: `/admin/varchar-limits` 
3. **Test exact insert**: `/admin/test-database-inserts`
4. **Verify tables**: `/admin/database-migration`

[Full protocol: docs/admin/DIAGNOSTICS.md](docs/admin/DIAGNOSTICS.md)

## 📋 Common Tasks

```bash
# Development
npm run dev              # Start local server
npm run build           # Production build (MUST PASS)
npm run db:studio       # Browse database

# Testing endpoints
/database-checker       # System health check
/api/workflows/[id]/validate  # Workflow validation
/admin/*               # Diagnostic tools
```

## 🚀 Latest Features

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
1. Check [CLIENT_SECURITY_IMPLEMENTATION.md](docs/architecture/CLIENT_SECURITY_IMPLEMENTATION.md)
2. Follow the pattern from [ORDER_SYSTEM_IMPLEMENTATION.md](docs/architecture/ORDER_SYSTEM_IMPLEMENTATION.md)
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
- **[Building Agents](docs/agents/)** - Agent patterns and examples
- **[Database Rules](docs/db/)** - Schema patterns and pitfalls
- **[Architecture](docs/architecture/)** - System design and patterns
- **[Security](docs/architecture/CLIENT_SECURITY_IMPLEMENTATION.md)** - Auth patterns for shared interfaces

---

**Need help?** Check [docs/](docs/) or use diagnostic tools at `/admin/*`