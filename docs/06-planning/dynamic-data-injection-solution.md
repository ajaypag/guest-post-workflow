# Dynamic Data Injection for ManyReach V3 Extraction

## Problem
Niche, category, and website type lists change frequently as new publishers are added to the system. Hardcoding these lists in extraction prompts will quickly become outdated.

## Solution: Template-Based Prompt Generation

### Architecture

```typescript
// lib/services/manyreach/promptGenerator.ts
export class ManyReachPromptGenerator {
  private db: Database;
  
  async generateExtractionPrompt(tableName: string): Promise<string> {
    // 1. Load base template
    const template = await this.loadTemplate(tableName);
    
    // 2. Fetch current data from database
    const dynamicData = await this.fetchDynamicData();
    
    // 3. Inject data into template
    return this.injectData(template, dynamicData);
  }
  
  private async fetchDynamicData() {
    const [niches, categories, types] = await Promise.all([
      this.db.execute(sql`
        SELECT DISTINCT unnest(niche) as value 
        FROM websites 
        WHERE niche IS NOT NULL 
        ORDER BY value
      `),
      this.db.execute(sql`
        SELECT DISTINCT unnest(categories) as value 
        FROM websites 
        WHERE categories IS NOT NULL 
        ORDER BY value
      `),
      this.db.execute(sql`
        SELECT DISTINCT unnest(website_type) as value 
        FROM websites 
        WHERE website_type IS NOT NULL 
        ORDER BY value
      `)
    ]);
    
    return {
      NICHE_COUNT: niches.rows.length,
      NICHE_LIST: niches.rows.map(r => r.value).join(', '),
      CATEGORY_COUNT: categories.rows.length,
      CATEGORY_LIST: categories.rows.map(r => r.value).join(', '),
      TYPE_COUNT: types.rows.length,
      TYPE_LIST: types.rows.map(r => r.value).join(', ')
    };
  }
  
  private injectData(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }
}
```

### Implementation Options

#### Option 1: Runtime Generation (Recommended)
Generate prompts on-demand when processing emails:

```typescript
// api/manyreach/v3/extract/route.ts
export async function POST(req: Request) {
  const { emailTrail, tableName } = await req.json();
  
  // Generate fresh prompt with current data
  const promptGenerator = new ManyReachPromptGenerator(db);
  const extractionPrompt = await promptGenerator.generateExtractionPrompt(tableName);
  
  // Use prompt with AI
  const extraction = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: extractionPrompt },
      { role: "user", content: emailTrail }
    ]
  });
  
  return extraction;
}
```

**Pros:**
- Always uses latest data
- No maintenance needed
- Simple implementation

**Cons:**
- Small performance overhead (cached queries help)
- Database dependency for each extraction

#### Option 2: Scheduled Regeneration
Update prompts periodically via cron job:

```typescript
// scripts/regenerate-prompts.ts
async function regeneratePrompts() {
  const generator = new ManyReachPromptGenerator(db);
  const tables = ['websites', 'publishers', 'publisherOfferings'];
  
  for (const table of tables) {
    const prompt = await generator.generateExtractionPrompt(table);
    await savePromptToCache(table, prompt);
  }
}

// Run every 6 hours
schedule.scheduleJob('0 */6 * * *', regeneratePrompts);
```

**Pros:**
- Better performance (pre-generated)
- Can review prompts before use
- Versioning possible

**Cons:**
- Can be out of sync temporarily
- Requires cron/scheduler setup
- More complex architecture

#### Option 3: Webhook-Based Updates
Regenerate when data changes:

```typescript
// Trigger on website insert/update
export async function onWebsiteChange() {
  // Invalidate prompt cache
  await promptCache.invalidate('websites');
  
  // Optionally regenerate immediately
  if (config.eagerRegeneration) {
    await regeneratePrompt('websites');
  }
}
```

**Pros:**
- Always synchronized
- Efficient (only updates when needed)
- Event-driven architecture

**Cons:**
- Most complex to implement
- Requires webhook infrastructure
- Need to track all change points

## Recommendation

**Start with Option 1 (Runtime Generation)** because:
1. Simplest to implement and maintain
2. Query performance is negligible with proper indexing
3. Guarantees data freshness
4. Can migrate to Option 2/3 later if needed

### Performance Optimization
```sql
-- Add indexes for distinct queries
CREATE INDEX idx_websites_niche ON websites USING GIN (niche);
CREATE INDEX idx_websites_categories ON websites USING GIN (categories);
CREATE INDEX idx_websites_type ON websites USING GIN (website_type);
```

### Template Storage
Store templates in `/prompts/templates/` with placeholders:

```markdown
<!-- /prompts/templates/websites-extraction.md -->
# Website Extraction Guidelines

## Available Niches
The system currently recognizes {{NICHE_COUNT}} niches:
{{NICHE_LIST}}

Note: If the publisher mentions a niche not in this list, still extract it - the system will handle new niches appropriately.
```

## Benefits
1. **Always Current**: No manual updates needed
2. **Single Source of Truth**: Database drives everything
3. **Flexible**: Can add new fields easily
4. **Maintainable**: Templates separate from code
5. **Scalable**: Works as data grows

## Migration Path
1. Phase 1: Implement runtime generation
2. Phase 2: Add caching layer (Redis/in-memory)
3. Phase 3: Monitor performance metrics
4. Phase 4: Move to scheduled generation if needed