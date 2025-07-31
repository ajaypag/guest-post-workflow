# Developer Guide

Comprehensive technical documentation for the Guest Post Workflow system.

## 📚 Documentation Map

### Getting Started
- [Local Development Setup](setup/LOCAL_DEV.md) - Get running in < 10 minutes
- [Coolify Deployment](setup/COOLIFY_DEPLOY.md) - Production deployment guide

### Building Features
- [Agent Building Blocks](agents/BUILDING_BLOCKS.md) - Create AI agents
- [Auto-Save Pattern](agents/AUTO_SAVE_PATTERN.md) - Fix race condition for AI content
- [Retry Pattern](agents/RETRY_PATTERN.md) - Handle agent text responses
- [V2 Pattern](agents/V2_PATTERN.md) - LLM orchestration approach

### Database & Infrastructure  
- [Schema Rules](db/SCHEMA_RULES.md) - VARCHAR sizes, TEXT usage
- [Migration Checklist](migrations/CHECKLIST.md) - Adding new tables
- **[Order Groups Migration](architecture/ORDER_GROUPS_MIGRATION.md)** - Phase 2 bulk analysis integration (RUN THIS!)

### Security & Authentication
- [Client Security Implementation](architecture/CLIENT_SECURITY_IMPLEMENTATION.md) - Authentication pattern for client management
- [User Types](architecture/USER_TYPES.md) - User type definitions and permissions
- **Pattern**: All shared interfaces follow the order system security model

### Debugging & Operations
- [Diagnostics Guide](admin/DIAGNOSTICS.md) - Debug production issues
- [Admin UI Requirements](admin/UI_REQUIREMENTS.md) - Required admin pages

### Architecture & Design
- **[ORDER_SYSTEM_IMPLEMENTATION.md](architecture/ORDER_SYSTEM_IMPLEMENTATION.md)** - Complete order system implementation guide (CURRENT PRIORITY)
- [Client Security Implementation](architecture/CLIENT_SECURITY_IMPLEMENTATION.md) - Security pattern for client management
- [Account Platform Architecture](architecture/ACCOUNT_PLATFORM_ARCHITECTURE.md) - Platform vision and user experience
- [Order Schema Design](architecture/ORDER_SCHEMA_DESIGN.md) - Database schema for order-centric system
- [Component Clean Pattern](architecture/COMPONENT_PATTERN.md) - Step component architecture
- [Database Architecture](architecture/DATABASE.md) - Overall database patterns

## 🏗️ System Overview

### Tech Stack
- **Frontend**: Next.js 15.3.4, React 19, Tailwind CSS
- **Backend**: Next.js API routes, PostgreSQL, Drizzle ORM
- **AI**: OpenAI Agents SDK, o3-2025-04-16 model
- **Deployment**: Coolify v4, Docker

### Key Services
```
/lib/services/
├── agenticArticleService.ts      # V1 article generation
├── agenticArticleV2Service.ts    # V2 LLM orchestration
├── agenticSemanticAuditService.ts # SEO optimization
└── workflowService.ts            # Core workflow CRUD
```

### Database Architecture
- **Users**: Authentication and roles
- **Workflows**: JSON storage for flexibility
- **Clients**: Customer management
- **Agent Sessions**: Agentic feature tracking

## 🔑 Critical Knowledge

### Step Components Have Two Versions
Due to technical debt, check which version is active:
```typescript
// components/StepForm.tsx shows real mapping
const stepForms = {
  'article-draft': ArticleDraftStepClean,  // NOT ArticleDraftStep
  'content-audit': ContentAuditStepClean,  // NOT ContentAuditStep
  // ...
};
```

### Always Use TEXT for AI Content
```sql
-- ❌ WRONG - Will fail silently
description VARCHAR(100)

-- ✅ CORRECT - No size limits
description TEXT
```

### V2 is the Future
V2 pattern (LLM orchestration) produces better results than V1 (code orchestration).

## 📋 Common Tasks

### Add New Agent Feature
1. Read [Building Blocks](agents/BUILDING_BLOCKS.md)
2. Create service in `/lib/services/`
3. Use TEXT columns in database
4. Add admin diagnostics
5. Implement SSE streaming

### Debug Production Issue
1. Check `/admin/diagnostics`
2. Look for VARCHAR limits
3. Verify table structure
4. Test with real data

### Update Step Component
1. Find which version is used (`grep -r "ComponentName"`)
2. Check `StepForm.tsx` mapping
3. Edit the Clean version
4. Test auto-save works

## 🚨 Before You Start

### Environment Setup
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
OPENAI_API_KEY=sk-...
```

### Required Tools
- Node.js 18+
- PostgreSQL
- Git
- VS Code (recommended)

### Useful Commands
```bash
npm run dev          # Start development
npm run db:studio    # Browse database
npm run build        # Test production build
npm run lint         # Check code style
```

## 📞 Getting Help

1. **Search codebase** for examples
2. **Check diagnostics** at `/admin/*`
3. **Read error logs** carefully
4. **Test locally** before deploying

## 🔗 Quick Links

- [Original CLAUDE.md](archive/DEVELOPER_GUIDE_ORIGINAL.md) - Full historical context
- GitHub: https://github.com/ajaypag/guest-post-workflow
- Production: Deployed on Coolify

---

**Remember**: This is production software serving real users. Test thoroughly!