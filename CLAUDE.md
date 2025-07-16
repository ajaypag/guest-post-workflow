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

## ⚠️ CRITICAL: Database VARCHAR Column Sizes for Agentic Features

### The Hidden Killer: VARCHAR Size Limits

**🚨 THIS WILL WASTE HOURS OF DEBUGGING TIME IF NOT ADDRESSED 🚨**

When creating agentic features that save to PostgreSQL, **VARCHAR COLUMN SIZES ARE CRITICAL**. The agent will fail silently with vague "database error" messages if text exceeds column limits.

#### Real-World Failures That Occurred:

1. **polish_sections.polish_approach: varchar(100) → FAILED**
   - Agent generated: "engagement-focused-with-semantic-clarity-balanced-approach"
   - Error: Vague "Failed query" message, no indication it was length issue
   - Fix: Must be `varchar(255)` minimum

2. **polish_sections.title: varchar(255) → RISKY**
   - Long titles with special characters exceed 255
   - Fix: Use `varchar(500)` for safety

3. **audit_sections.editing_pattern: varchar(100) → FAILED**
   - Similar descriptive patterns as polish_approach
   - Fix: Must be `varchar(255)` minimum

#### When Creating ANY Agentic Table:

```sql
-- ❌ WRONG - Will cause silent failures
CREATE TABLE agent_outputs (
  approach VARCHAR(100),      -- TOO SMALL!
  description VARCHAR(100),   -- TOO SMALL!
  title VARCHAR(255)         -- RISKY!
);

-- ✅ CORRECT - Allows agent flexibility
CREATE TABLE agent_outputs (
  approach VARCHAR(255),      -- Safe for agent descriptions
  description TEXT,          -- Use TEXT for long content
  title VARCHAR(500),        -- Extra safe for titles
  status VARCHAR(50)         -- OK for fixed values
);
```

#### How to Debug VARCHAR Issues:

1. **Symptoms:**
   - Agent says "I encountered a database error"
   - Server logs show "Failed query: insert into..."
   - No clear error about column size

2. **Diagnosis:**
   - Go to `/admin/column-check` to see all column sizes
   - Look for "❌ TOO SMALL" indicators
   - Check if agent-generated content exceeds limits

3. **Quick Fix:**
   ```sql
   ALTER TABLE table_name ALTER COLUMN column_name TYPE varchar(255);
   ```

#### Prevention Rules:

1. **For agent-generated descriptions**: Use `VARCHAR(255)` minimum
2. **For titles**: Use `VARCHAR(500)` 
3. **For long content**: Use `TEXT` not VARCHAR
4. **For status/type fields**: `VARCHAR(50)` is sufficient
5. **When in doubt**: Use `TEXT` - better safe than sorry

#### Testing New Agentic Features:

Always create `/api/admin/check-column-sizes` endpoint to verify:
- All VARCHAR columns in new tables
- Compare against expected agent output lengths
- Add "Fix Column Sizes" button in migration UI

### Teams Workspace Button Added
All three active step components now include the Teams Workspace button:
- URL: https://chatgpt.com/g/g-p-686ea60485908191a5ac7a73ebf3a945/project?model=o3
- Added alongside the three OpenAI account buttons

## 🤖 AGENTIC AUTOMATION BEST PRACTICES

### Overview
This section documents proven patterns for building robust, production-ready AI agents using OpenAI Agents SDK. Based on successful implementations in `agenticArticleService.ts` and `agenticSemanticAuditService.ts`.

### Core Architecture Pattern

#### 1. Agent Service Class Structure
```typescript
export class AgenticServiceName {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async startSession(params): Promise<string> { /* Session initialization */ }
  async performTask(sessionId: string): Promise<void> { /* Main automation */ }
  async getSession(sessionId: string) { /* Session retrieval */ }
}
```

#### 2. Database Schema for Agent Sessions
```sql
-- Session tracking with versioning
agent_sessions (
  id, workflow_id, version, step_id, status,
  total_sections, completed_sections, session_metadata,
  started_at, completed_at, created_at, updated_at
)

-- Generated content by section/chunk
content_sections (
  id, session_id, section_number, title, content,
  word_count, status, created_at, updated_at
)
```

### Essential Agent Configuration

#### 1. Agent Initialization Pattern
```typescript
const agent = new Agent({
  name: 'AgentName',
  instructions: 'Expert role description + AUTOMATED WORKFLOW continuation directive',
  model: 'o3-2025-04-16', // Proven model for complex tasks
  tools: [fileSearch, customTool1, customTool2] // Strategic tool selection
});
```

**Key Instructions Elements:**
- **Role Definition**: Clear expertise area and purpose
- **Automation Directive**: "This is an AUTOMATED WORKFLOW - continue until completion without asking for permission"
- **Output Guidelines**: Specific formatting and quality requirements
- **Context Preservation**: Instructions for maintaining conversation flow

#### 2. Tool Design Patterns

**Zod Schema Validation (Required):**
```typescript
const toolSchema = z.object({
  parameter: z.string().describe('Clear parameter description'),
  count: z.number().describe('Specific numeric constraints'),
  is_last: z.boolean().describe('Workflow continuation logic')
});

const customTool = tool({
  name: "tool_name",
  description: "Clear, specific tool purpose",
  parameters: toolSchema,
  execute: async (args) => {
    // 1. Validation and data processing
    // 2. Database operations
    // 3. SSE progress updates
    // 4. Return continuation context
  }
});
```

**Tool Categories:**
- **Planning Tools**: Structure and analyze before execution
- **Content Generation Tools**: Section-by-section creation with context
- **Progress Tracking Tools**: Session state management
- **Knowledge Tools**: File search integration for guidelines

### Real-Time Streaming Architecture

#### 1. Server-Sent Events (SSE) Pattern
```typescript
// Connection Management
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
}

function sseUpdate(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('SSE push failed:', error);
  }
}
```

#### 2. Progress Update Events
```typescript
// Event Types for UI Updates
sseUpdate(sessionId, { type: 'status', status: 'planning', message: 'Analyzing outline...' });
sseUpdate(sessionId, { type: 'section_completed', section_title, content, word_count });
sseUpdate(sessionId, { type: 'completed', final_content, total_sections });
```

### Conversation Management

#### 1. Message Flow Pattern
```typescript
const messages: any[] = [
  { role: 'user', content: initialPrompt }
];

// Process agent responses systematically
for await (const event of result.toStream()) {
  if (event.name === 'tool_called') {
    messages.push({
      role: 'assistant',
      tool_calls: [{ /* tool call data */ }]
    });
  }
  
  if (event.name === 'tool_output') {
    messages.push({
      role: 'tool',
      content: toolOutput.output,
      tool_call_id: toolOutput.tool_call_id
    });
  }
}
```

#### 2. Automation Continuation Guards
```typescript
// Prevent agent from stopping mid-workflow
if (conversationActive) {
  messages.push({
    role: 'user',
    content: 'YOU MUST CONTINUE THE AUTOMATED WORKFLOW. DO NOT WAIT FOR PERMISSION.'
  });
}

// Safety limits to prevent infinite loops
if (messages.length > 100 || sectionCount > 20) {
  conversationActive = false;
  // Graceful workflow termination
}
```

### Knowledge Base Integration

#### 1. File Search Implementation
```typescript
// Vector store integration for guidelines and best practices
const fileSearch = fileSearchTool(['vs_68710d7858ec8191b829a50012da7707']);

// Usage in prompts
const prompt = `
REQUIRED ACTIONS:
1. FIRST: Use file search to review relevant guidelines from knowledge base
2. THEN: Apply guidelines to current task
3. FINALLY: Execute task with learned context
`;
```

#### 2. Knowledge Categories
- **Style Guidelines**: Writing tone, format requirements
- **SEO Best Practices**: Technical optimization rules
- **Brand Guidelines**: Voice, terminology, constraints
- **Quality Standards**: Output validation criteria

### Error Handling & Recovery

#### 1. Graceful Degradation
```typescript
try {
  await performAgentTask(sessionId);
} catch (error) {
  console.error('Agent task failed:', error);
  
  // Update session status
  await updateSession(sessionId, { 
    status: 'failed', 
    errorMessage: error.message 
  });
  
  // Notify UI
  sseUpdate(sessionId, { 
    type: 'error', 
    message: 'Agent encountered an error',
    canRetry: true 
  });
}
```

#### 2. Session Recovery
```typescript
// Resume interrupted sessions
async resumeSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (session.status === 'failed' || session.status === 'interrupted') {
    const lastCompletedSection = session.completedSections || 0;
    // Continue from last successful point
    return this.performTask(sessionId, { resumeFrom: lastCompletedSection });
  }
}
```

### Production Deployment Considerations

#### 1. Environment Configuration
```env
OPENAI_API_KEY=sk-...           # Primary API key
OPENAI_API_KEY_BACKUP=sk-...    # Backup for rate limiting
VECTOR_STORE_ID=vs_...          # Knowledge base ID
AGENT_TIMEOUT_MS=300000         # 5 minute timeout
```

#### 2. Monitoring & Logging
```typescript
// Detailed logging for production debugging
console.log(`🤖 Agent session ${sessionId}: Starting ${taskName}`);
console.log(`📊 Progress: ${completed}/${total} sections completed`);
console.log(`⏱️ Processing time: ${duration}ms`);
console.log(`💰 Token usage: ${inputTokens}/${outputTokens}`);
```

### Performance Optimization

#### 1. Chunking Strategy
- **Section-by-Section Processing**: Prevents token limit issues
- **Context Preservation**: Maintain previous sections for flow
- **Parallel Processing**: Multiple agents for independent tasks

#### 2. Rate Limiting
```typescript
// Implement delays between API calls
await new Promise(resolve => setTimeout(resolve, 1000));

// Use multiple API keys for higher throughput
const apiKey = this.getAvailableApiKey();
```

### Proven Models & Settings

#### 1. Model Selection
- **Primary**: `o3-2025-04-16` - Best for complex reasoning and tool usage
- **Fallback**: `gpt-4-turbo` - Reliable performance for simpler tasks
- **Avoid**: `gpt-3.5-turbo` - Insufficient for complex agentic workflows

#### 2. Runner Configuration
```typescript
const runner = new Runner({
  modelProvider: this.openaiProvider,
  tracingDisabled: true,    // Performance optimization
  maxRetries: 3,           // Error resilience
  timeout: 300000          // 5 minute timeout
});
```

### Success Metrics

#### 1. Quality Indicators
- **Completion Rate**: % of sessions that finish successfully
- **Content Quality**: Human evaluation scores
- **Automation Level**: % reduction in manual intervention
- **Processing Time**: Average time per section/task

#### 2. Technical Metrics
- **Token Efficiency**: Tokens per output unit
- **Error Rate**: Failed sessions per total attempts
- **Recovery Rate**: Successfully resumed sessions
- **User Satisfaction**: Feedback scores

**Reference Implementations:**
- Article Generation: `/lib/services/agenticArticleService.ts`
- Semantic SEO Audit: `/lib/services/agenticSemanticAuditService.ts`
- UI Components: `/components/ui/AgenticArticleGenerator.tsx`
- API Endpoints: `/app/api/workflows/[id]/auto-generate/stream/route.ts`

## 🔧 MANDATORY DIAGNOSTIC PROTOCOL FOR AGENTIC FEATURES

### THE PROBLEM: Hours of Debugging Without Root Cause Analysis

**🚨 CRITICAL ISSUE**: When implementing agentic features, vague database errors waste 4-6 hours of back-and-forth debugging. This protocol prevents that.

### MANDATORY STEPS: Create These 4 Diagnostic Tools BEFORE Building Any Agentic Feature

#### 1. Comprehensive Database Diagnostics (`/admin/diagnostics`)
**Purpose**: Understand the ACTUAL database structure vs. what the code expects

**Required Features**:
- Schema analysis for all tables
- Missing column detection
- Data storage pattern analysis (JSON vs. separate tables)
- Sample data structure examination
- Primary diagnosis with specific recommendations

**Code Pattern**:
```typescript
// /app/api/admin/comprehensive-diagnostics/route.ts
export async function GET() {
  const diagnostics = {
    tableSchemas: {},
    sampleData: {},
    issues: [],
    recommendations: [],
    diagnosis: {
      primaryIssue: 'Specific root cause',
      likelyRoot: 'Why this is happening',
      immediateAction: 'Exact fix needed'
    }
  };
  
  // Analyze each table structure
  for (const tableName of requiredTables) {
    const schema = await getTableSchema(tableName);
    diagnostics.tableSchemas[tableName] = schema;
    
    // Check for missing expected columns
    const missingColumns = expectedColumns.filter(col => !schema.columns.includes(col));
    if (missingColumns.length > 0) {
      diagnostics.issues.push({
        severity: 'CRITICAL',
        table: tableName,
        message: `Missing expected columns: ${missingColumns.join(', ')}`,
        recommendation: 'Update queries to read from actual data structure'
      });
    }
  }
  
  return diagnostics;
}
```

#### 2. VARCHAR Column Analysis (`/admin/varchar-limits`)
**Purpose**: Prevent "Failed query: insert" errors from VARCHAR size limits

**Required Features**:
- Check all VARCHAR columns in agentic tables
- Identify columns too small for AI-generated content
- Auto-fix button to expand to TEXT/appropriate sizes
- Test with sample AI-generated content

**Critical Columns to Check**:
- Any column storing AI descriptions: `VARCHAR(255)` minimum
- Title fields: `VARCHAR(500)` minimum  
- Long content: `TEXT` type
- Status/type fields: `VARCHAR(50)` is sufficient

**Code Pattern**:
```typescript
// /app/api/admin/check-varchar-limits/route.ts
export async function POST() {
  const fixes = [
    { column: 'check_description', type: 'TEXT' },
    { column: 'issues_found', type: 'TEXT' },
    { column: 'fix_suggestions', type: 'TEXT' }
  ];
  
  for (const fix of fixes) {
    await db.execute(sql`
      ALTER TABLE ${tableName} 
      ALTER COLUMN ${fix.column} TYPE ${fix.type}
    `);
  }
}
```

#### 3. PostgreSQL Error Capture (`/admin/test-database-inserts`)
**Purpose**: Capture EXACT PostgreSQL error details, not vague "database error" messages

**Required Features**:
- Test exact failing INSERT with real data
- Capture detailed PostgreSQL error codes and messages
- Identify specific data type mismatches
- Test fixes with same data

**Critical Error Patterns**:
- `invalid input syntax for type integer: "8.5"` → Use `Math.round()` for integers
- `null value in column violates not-null constraint` → Use empty string `''` instead of `null`
- `value too long for type character varying(N)` → Increase VARCHAR size

**Code Pattern**:
```typescript
// /app/api/admin/test-database-inserts/route.ts
export async function POST() {
  const testData = { /* exact failing data */ };
  
  try {
    await db.execute(sql`INSERT INTO table_name VALUES (...)`);
  } catch (error) {
    return {
      postgresError: {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        message: error.message,
        severity: error.severity
      },
      diagnosis: analyzeError(error)
    };
  }
}
```

#### 4. Database Migration Verification (`/admin/database-migration`)
**Purpose**: Ensure all required tables exist with correct structure

**Required Features**:
- Check table existence for each agentic feature
- Verify column types match expectations
- Migration buttons for each feature
- Rollback capability

### WORKFLOW: Systematic Troubleshooting Process

#### Phase 1: Database Structure Analysis (5 minutes)
1. **Run comprehensive diagnostics** → `/admin/diagnostics`
2. **Identify schema mismatches** → Look for missing columns, wrong data storage patterns
3. **Check actual vs. expected structure** → Fix queries to match reality

#### Phase 2: Column Size Verification (3 minutes)
1. **Run VARCHAR analysis** → `/admin/varchar-limits`
2. **Fix any columns < 255 chars** → Auto-fix to TEXT/appropriate sizes
3. **Verify agent-generated content fits** → Test with sample data

#### Phase 3: Error Root Cause Analysis (2 minutes)
1. **Capture exact PostgreSQL errors** → `/admin/test-database-inserts`
2. **Identify specific data type issues** → Integer vs. decimal, null constraints
3. **Test fixes with same data** → Verify fixes work

#### Phase 4: Migration Verification (2 minutes)
1. **Verify all tables exist** → `/admin/database-migration`
2. **Check column types** → Ensure they match code expectations
3. **Run any missing migrations** → Fix schema issues

### COMMON FAILURE PATTERNS & FIXES

#### 1. Schema Assumption Failures
**Symptom**: "column does not exist" errors
**Root Cause**: Code assumes `workflow_steps` table but data is in `workflows.content.steps` JSON
**Fix**: Update queries to read from actual data structure
```typescript
// ❌ Wrong assumption
const workflow = await db.query.workflows.findFirst({
  with: { steps: true } // This table might not exist
});

// ✅ Correct approach
const workflow = await db.query.workflows.findFirst({
  where: eq(workflows.id, workflowId)
});
const steps = workflow.content?.steps || [];
```

#### 2. VARCHAR Size Failures
**Symptom**: "Failed query: insert" with no clear error
**Root Cause**: AI-generated content exceeds VARCHAR limits
**Fix**: Use TEXT for AI content, VARCHAR(255+) for descriptions
```sql
-- ❌ Too small for AI content
ALTER TABLE formatting_qa_checks ALTER COLUMN check_description TYPE VARCHAR(100);

-- ✅ Safe for AI content
ALTER TABLE formatting_qa_checks ALTER COLUMN check_description TYPE TEXT;
```

#### 3. Data Type Mismatches
**Symptom**: "invalid input syntax for type integer"
**Root Cause**: Sending decimals to integer columns
**Fix**: Round/convert data before insert
```typescript
// ❌ Sending decimal to integer column
confidenceScore: args.confidence, // 8.5 → fails

// ✅ Round to integer
confidenceScore: Math.round(args.confidence), // 8.5 → 9
```

#### 4. NULL Constraint Violations
**Symptom**: "null value in column violates not-null constraint"
**Root Cause**: Sending null to NOT NULL columns
**Fix**: Use empty string or appropriate defaults
```typescript
// ❌ Sending null to NOT NULL column
errorMessage: null, // fails if column is NOT NULL

// ✅ Use empty string
errorMessage: '', // works for NOT NULL TEXT columns
```

### DIAGNOSTIC TOOLS LOCATIONS

After implementing agentic features, these tools must be available:

1. **`/admin/diagnostics`** → Database structure analysis
2. **`/admin/varchar-limits`** → Column size verification and fixing
3. **`/admin/test-database-inserts`** → PostgreSQL error capture
4. **`/admin/database-migration`** → Migration verification

### PREVENTION RULES

1. **Always build diagnostics FIRST** → Don't debug blindly
2. **Test with real AI-generated content** → Don't use short test strings
3. **Capture exact PostgreSQL errors** → Don't settle for vague messages
4. **Use TEXT for AI content** → Don't risk VARCHAR limits
5. **Verify schema matches code** → Don't assume table structure

### SUCCESS CRITERIA

- **10 minutes to diagnose any issue** → Down from 4-6 hours
- **Specific error messages** → No more guessing
- **Automated fixes** → One-click solutions
- **Prevention built-in** → Issues caught before deployment

This protocol prevents the expensive debugging cycles that occurred with the formatting QA feature implementation.

## Contact
Created for OutreachLabs by Claude with Ajay
Repository: https://github.com/ajaypag/guest-post-workflow