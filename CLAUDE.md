# Guest Post Workflow v1.0.0 - Production Ready

## Overview
This is a **STABLE PRODUCTION VERSION** of the Guest Post Workflow application successfully deployed on Coolify with full PostgreSQL database integration.

## Key Features Working
- ✅ **Multi-user authentication** with PostgreSQL database
- ✅ **Client management** with target pages persistence
- ✅ **16-step workflow creation** with full data persistence
- ✅ **Workflow step data saving** across all steps
- ✅ **Multiple OpenAI account support** (3 accounts)

## Critical Information

### Database Configuration
- **Database**: PostgreSQL on Coolify
- **Connection**: Internal URL format required
- **SSL**: Must be disabled (ssl: false)
- **Schema**: Uses JSON storage for workflows (content field)

### Authentication
- Default admin: admin@example.com / admin123
- All users visible in admin panel
- Role-based access (user/admin)

### Recent Fixes Applied
1. **Workflow Creation** - Fixed schema mismatch, now uses JSON storage
2. **Step Data Persistence** - Fixed PUT endpoint that was stubbed
3. **Target Pages** - Created missing API endpoints for separate table
4. **Multi-Account GPT Links** - Added support for 3 OpenAI accounts

### OpenAI Accounts Supported
- info@onlyoutreach.com (original)
- ajay@pitchpanda.com
- ajay@linkio.com

## Architecture Notes

### Database Schema
```sql
-- Main tables
users (id, email, name, password_hash, role)
clients (id, name, website, description, created_by)
workflows (id, user_id, client_id, title, status, content, target_pages)
target_pages (id, client_id, url, domain, status)
workflow_steps (id, workflow_id, step_number, title, status, inputs, outputs)
```

### Key Services
- `/lib/db/workflowService.ts` - Workflow CRUD with JSON storage
- `/lib/db/clientService.ts` - Client and target pages management
- `/lib/storage.ts` - Frontend API communication layer

### API Endpoints
- `/api/workflows` - GET/POST workflows
- `/api/workflows/[id]` - GET/PUT/DELETE individual workflows
- `/api/clients/[id]/target-pages` - GET/POST/PUT/DELETE target pages
- `/api/database-checker` - System health diagnostics

## Deployment Instructions

### Environment Variables Required
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=disable
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### Coolify Setup
1. Deploy as Next.js application
2. Set environment variables in Coolify
3. Database will auto-initialize on first run
4. Default admin account created automatically

## Testing Tools Available
- `/database-checker` - Full system analysis
- `/api/workflows/[id]/validate` - Workflow validation
- `/api/check-table-structure` - Database schema verification

## Version History
- **v1.0.0** (2025-01-02) - First stable production release
  - All core features working
  - Database persistence complete
  - Multi-account support added
  - All known bugs fixed

## Important Notes for Future Development
1. **Do NOT change** the JSON storage model for workflows - it's working
2. **Always test** database operations locally before deployment
3. **Target pages** are stored separately from clients (different table)
4. **Workflow steps** data is stored within the workflow JSON content
5. **Build must pass** before deployment - run `npm run build` to verify

## CRITICAL: Step Component Technical Debt
**🚨 BEFORE EDITING ANY STEP COMPONENTS - READ THIS FIRST 🚨**

### The Problem
There are TWO versions of step components due to technical debt:
- **Original files** (e.g., `ArticleDraftStep.tsx`) - **DEPRECATED, NOT USED**
- **Clean files** (e.g., `ArticleDraftStepClean.tsx`) - **ACTIVE IN PRODUCTION**

### Which Files Are Actually Used
Check `components/StepForm.tsx` - line 40-57 shows the REAL component mapping:
```typescript
const stepForms = {
  'article-draft': ArticleDraftStepClean,     // NOT ArticleDraftStep
  'content-audit': ContentAuditStepClean,    // NOT ContentAuditStep  
  'final-polish': FinalPolishStepClean,      // NOT FinalPolishStep
  // ... other steps
};
```

### MANDATORY Process Before Editing Step Components
1. **Find component imports first**: `grep -r "ComponentName" --include="*.tsx"`
2. **Check StepForm.tsx** to see which version is actually used
3. **Look for multiple versions** of the same component
4. **Only edit the version that's imported in StepForm.tsx**
5. **Verify changes appear** in files that are actually imported

### Current Active Files (as of 2025-01-09)
- `ArticleDraftStepClean.tsx` ✅ EDIT THIS
- `ContentAuditStepClean.tsx` ✅ EDIT THIS  
- `FinalPolishStepClean.tsx` ✅ EDIT THIS
- `ArticleDraftStep.tsx` ❌ DO NOT EDIT (deprecated)
- `ContentAuditStep.tsx` ❌ DO NOT EDIT (deprecated)
- `FinalPolishStep.tsx` ❌ DO NOT EDIT (deprecated)

### Teams Workspace Button Added
All three active step components now include the Teams Workspace button:
- URL: https://chatgpt.com/g/g-p-686ea60485908191a5ac7a73ebf3a945/project?model=o3
- Added alongside the three OpenAI account buttons

## Contact
Created for OutreachLabs by Claude with Ajay
Repository: https://github.com/ajaypag/guest-post-workflow