# AI Integration Documentation

> **Last Updated**: 2025-08-08  
> **Status**: ✅ Production Ready  
> **Models**: O3, O3-2025-04-16, O4-mini, GPT-3.5-turbo

## Overview

The system integrates multiple OpenAI models through both the Responses API and Agents SDK to power keyword generation, content creation, SEO optimization, and site qualification features.

## Core AI Services

### 1. Keyword Generation
**Service**: `keywordGenerationService.ts`  
**Model**: O3 via Responses API  
**Purpose**: Generate relevant keywords for target pages

**Process**:
1. Initial generation using prompt `pmpt_6872f2263c98819590f881b5ec7212aa087e433dc13d1236`
2. Follow-up listicle keyword generation
3. Advanced parsing and deduplication
4. Returns 5-10 primary keywords

**Usage**:
```typescript
POST /api/target-pages/[id]/keywords
POST /api/keywords/generate
```

### 2. Description Generation
**Service**: `descriptionGenerationService.ts`  
**Model**: O3 via Responses API  
**Purpose**: Generate concise site descriptions

**Features**:
- Single-prompt generation
- Markdown removal and text sanitization
- Length validation (max 500 chars)
- Prompt ID: `pmpt_687320ae29748193b407cc07bd0a683f0605e5d920c44630`

**Usage**:
```typescript
POST /api/target-pages/[id]/description
```

### 3. AI Site Qualification
**Service**: `aiQualificationService.ts`  
**Model**: O3 via Responses API  
**Purpose**: Evaluate guest post opportunities

**Qualification Levels**:
- `high_quality`: Direct topical match, strong authority
- `good_quality`: Related topics, moderate authority
- `marginal_quality`: Tangential relevance
- `disqualified`: No topical relevance

**Features**:
- Concurrent processing (10 domains parallel)
- Evidence-based qualification
- Authority assessment
- Topic scope determination

**Output Structure**:
```json
{
  "overlapStatus": "direct|related|both|none",
  "authorityDirect": "strong|moderate|weak|n/a",
  "authorityRelated": "strong|moderate|weak|n/a",
  "topicScope": "short_tail|long_tail|ultra_long_tail",
  "qualificationStatus": "high_quality|good_quality|marginal_quality|disqualified",
  "reasoning": "Detailed explanation...",
  "evidence": {
    "direct_count": 5,
    "direct_median_position": 12.5,
    "related_count": 8,
    "related_median_position": 25.3
  }
}
```

### 4. Article Generation V2
**Service**: `agenticArticleV2Service.ts`  
**Models**: 
- Main: O3-2025-04-16 (Agents SDK)
- Completion: O4-mini (ArticleEndCritic)

**Architecture**: True LLM orchestration without tools

**Phases**:
1. **Planning**: Research analysis and outline
2. **Title/Introduction**: Structured opening
3. **Iterative Writing**: Section-by-section generation
4. **Completion Detection**: ArticleEndCritic determines when done

**Features**:
- Real-time streaming to UI
- Auto-save with race condition prevention
- Session versioning for multiple attempts
- Dynamic outline-based completion
- 40 section limit

**Usage**:
```typescript
POST /api/workflows/[id]/auto-generate-v2
POST /api/workflows/[id]/auto-generate-v2/stream
```

### 5. Semantic SEO Audit
**Service**: `agenticSemanticAuditService.ts`  
**Model**: O3-2025-04-16 (Agents SDK)  
**Purpose**: SEO optimization of articles

**Architecture**:
- Multi-phase workflow: Parse → Audit → Optimize
- File Search: Vector store `vs_68710d7858ec8191b829a50012da7707`
- Structured tools: `parse_article`, `audit_section`

**Features**:
- Section-by-section optimization
- Citation tracking (max 3 per article)
- Pattern variation to avoid AI detection
- Real-time progress tracking
- Retry logic for text responses

**Usage**:
```typescript
POST /api/workflows/[id]/semantic-audit
POST /api/workflows/[id]/semantic-audit/stream
```

### 6. Outline Generation
**Services**: Multiple versions (V1, V2, V3, Unified)  
**Models**: O3-deep-research, O3-2025-04-16  
**Purpose**: Research and outline creation

**Multi-Agent Workflow**:
1. **Triage Agent**: Determines clarification needs
2. **Clarifying Agent**: Asks targeted questions
3. **Instruction Builder**: Creates research instructions
4. **Research Agent**: Web search and outline creation

**Features**:
- Web search integration
- File search knowledge base
- Comprehensive research outlines
- Real-time status updates

**Usage**:
```typescript
POST /api/workflows/[id]/outline-generation/start
POST /api/workflows/[id]/outline-generation/start-v2
POST /api/workflows/[id]/outline-generation/stream
```

### 7. Final Polish
**Service**: `agenticFinalPolishService.ts`, `agenticFinalPolishV2Service.ts`  
**Model**: O3-2025-04-16  
**Purpose**: Final article refinement

**Features**:
- Style and tone optimization
- Grammar and flow improvements
- Brand voice consistency
- Citation verification
- Markdown formatting

**Usage**:
```typescript
POST /api/workflows/[id]/final-polish/start
POST /api/workflows/[id]/final-polish/stream
```

### 8. Formatting QA
**Service**: `agenticFormattingQAService.ts`  
**Model**: O3-2025-04-16  
**Purpose**: Quality assurance

**Checks**:
- Markdown validation
- Structure verification
- Link checking
- Image format validation
- Heading hierarchy

**Usage**:
```typescript
POST /api/workflows/[id]/formatting-qa/start
POST /api/workflows/[id]/formatting-qa/stream
```

## Architecture Patterns

### V2 Pattern (Recommended)
```typescript
// True LLM orchestration approach
const agent = await client.agents.createRun({
  model: "o3-2025-04-16",
  instructions: "", // Empty - let agent drive
  messages: [
    { role: "user", content: prompt }
  ]
});
```

**Benefits**:
- More natural interaction
- Agent drives conversation
- Flexible response handling
- Better completion detection

### Agent Retry Pattern
```typescript
import { assistantSentPlainText, RETRY_NUDGE } from '@/lib/utils/agentUtils';

if (assistantSentPlainText(messages)) {
  messages.push({
    role: "user",
    content: RETRY_NUDGE
  });
}
```

**Purpose**: Handle text-only responses when tools expected

### Auto-Save Pattern
```typescript
// Prevent race conditions with immediate data
const handleContentChange = (newContent: string) => {
  setContent(newContent);
  triggerAutoSave(newContent); // Pass data directly
};
```

## Configuration

### Environment Variables
```env
OPENAI_API_KEY=sk-your-key-here

# Optional for different environments
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_ORG_ID=org-xxx
```

### OpenAI Accounts
System supports multiple accounts:
- info@onlyoutreach.com
- ajay@pitchpanda.com
- ajay@linkio.com

### Vector Store
**ID**: `vs_68710d7858ec8191b829a50012da7707`  
**Contents**:
- SEO writing guidelines
- Brand voice documentation
- Content optimization rules
- Citation guidelines

### Model Selection

| Use Case | Recommended Model | Fallback |
|----------|------------------|----------|
| Keyword Generation | O3 | GPT-3.5-turbo |
| Article Writing | O3-2025-04-16 | O3 |
| Completion Detection | O4-mini | Manual |
| SEO Optimization | O3-2025-04-16 | O3 |
| Research/Outlines | O3-deep-research | O3-2025-04-16 |

## Error Handling

### Common Issues & Solutions

**1. VARCHAR Truncation**
```sql
-- Check for truncation issues
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'workflows' 
AND data_type = 'character varying';
```
**Solution**: Use TEXT columns for AI content

**2. Auto-Save Race Conditions**
```typescript
// Wrong - race condition
onChange(newData);

// Correct - immediate data
onChange(newData);
triggerAutoSave(newData);
```

**3. Text Response Instead of Tools**
```typescript
// Implement retry pattern
if (assistantSentPlainText(messages)) {
  // Add retry nudge
  continueWithRetry();
}
```

**4. Token Limits**
- Chunk content for large documents
- Use streaming for real-time updates
- Implement pagination for results

### Diagnostic Tools

**Admin Pages**:
- `/admin/agent-diagnostics` - Real-time monitoring
- `/admin/o3-deep-research-diagnostics` - Research agent testing
- `/admin/outline-generation-diagnostics` - Outline testing
- `/admin/test-o3-api-call` - API connectivity

**API Diagnostics**:
```bash
# Test O3 API
curl -X POST /api/admin/test-o3-api-call

# Check agent sessions
curl /api/admin/agent-diagnostics/sessions

# Validate VARCHAR limits
curl /api/admin/check-varchar-limits
```

## Best Practices

### 1. Use V2 Services
Prefer V2 implementations for new features:
- Better orchestration
- Natural conversation flow
- Improved error handling

### 2. Implement Retry Logic
Always include retry patterns:
```typescript
const MAX_RETRIES = 3;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    // AI call
    break;
  } catch (error) {
    retries++;
    await delay(1000 * retries);
  }
}
```

### 3. Stream for Long Operations
Use streaming for better UX:
```typescript
const stream = await agentService.stream();
for await (const chunk of stream) {
  // Update UI in real-time
}
```

### 4. Monitor and Log
Enable diagnostics in production:
```typescript
import { createDiagnosticLogger } from '@/lib/utils/agentDiagnostics';

const logger = createDiagnosticLogger('service-name');
logger.logEvent('phase', data);
```

## Cost Management

### Token Usage Estimates
- Keyword Generation: ~500 tokens/request
- Description: ~300 tokens/request
- Article Generation: ~8,000-15,000 tokens/article
- SEO Audit: ~5,000-10,000 tokens/article
- Outline Generation: ~3,000-5,000 tokens/outline

### Optimization Tips
1. Cache responses when possible
2. Use cheaper models for simple tasks
3. Implement rate limiting
4. Monitor usage via OpenAI dashboard
5. Set budget alerts

## Future Improvements

### Planned
1. GPT-4 Vision for image analysis
2. Claude integration for comparison
3. Local LLM options for sensitive data
4. Advanced caching strategies

### Experimental
1. Multi-model voting for quality
2. Fine-tuned models for specific tasks
3. Embedding-based content matching
4. Real-time collaboration features

---

**Note**: This documentation reflects the current AI integration as of 2025-08-08. Always test AI features thoroughly before production deployment.