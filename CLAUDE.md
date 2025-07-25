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
- ⚠️ Auto-save diagnostics removed (reverted)

## 🔧 Quick Reference

| What You Need | Where to Find It |
|--------------|------------------|
| **Local Setup** | [docs/setup/LOCAL_DEV.md](docs/setup/LOCAL_DEV.md) |
| **Deploy to Coolify** | [docs/setup/COOLIFY_DEPLOY.md](docs/setup/COOLIFY_DEPLOY.md) |
| **Database Schema** | [docs/architecture/DATABASE.md](docs/architecture/DATABASE.md) |
| **Build AI Agents** | [docs/agents/BUILDING_BLOCKS.md](docs/agents/BUILDING_BLOCKS.md) |
| **Auto-Save Fix** | [docs/agents/AUTO_SAVE_PATTERN.md](docs/agents/AUTO_SAVE_PATTERN.md) |
| **Debug Issues** | [docs/admin/DIAGNOSTICS.md](docs/admin/DIAGNOSTICS.md) |
| **All Documentation** | [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) |

### Production Config
```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=disable
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### OpenAI Accounts
- info@onlyoutreach.com
- ajay@pitchpanda.com  
- ajay@linkio.com

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

## 📚 Full Documentation

For detailed guides on all topics:
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Complete documentation index
- **[Building Agents](docs/agents/)** - Agent patterns and examples
- **[Database Rules](docs/db/)** - Schema patterns and pitfalls
- **[Architecture](docs/architecture/)** - System design and patterns

---

**Need help?** Check [docs/](docs/) or use diagnostic tools at `/admin/*`