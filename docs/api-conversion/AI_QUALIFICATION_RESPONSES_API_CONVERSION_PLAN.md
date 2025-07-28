# AI Qualification Service - Responses API Conversion Plan

## Current State Analysis

### 1. Current Implementation (INCORRECT)
The `aiQualificationService.ts` currently uses the older chat.completions API:
```typescript
const response = await this.openai.chat.completions.create({
  model: "o3-2025-04-16",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});
```

### 2. Correct Pattern (Responses API)
Based on codebase analysis, the correct pattern uses:
```typescript
const response = await openai.responses.create({
  model: "o3",
  prompt: { id: "pmpt_xxx", version: "1" },
  input: input,
  reasoning: { effort: "high" },
  store: true
});
```

### 3. Key Differences
| Feature | Chat Completions API | Responses API |
|---------|---------------------|---------------|
| Method | `chat.completions.create()` | `responses.create()` |
| Model | `o3-2025-04-16` | `o3` |
| Input | `messages` array | `instructions` + `input` |
| Output | `choices[0].message.content` | `output_text` |
| Format | `response_format` | Built into prompt |
| Prompt | Message content | `instructions` (inline) or prompt ID |
| State | Stateless | Stateful with `store: true` |

## Conversion Requirements

### 1. Prompt Management
- **Current**: Inline prompt construction in `buildPromptForSingleDomain()`
- **Options**: 
  - Use inline prompts with `instructions` parameter (simpler, no changes needed)
  - Use stored prompts with prompt ID (optional, for reusability)
- **Decision**: Use inline prompts to minimize changes and maintain flexibility

### 2. Response Structure
- **Current**: Expects `response.choices[0].message.content`
- **Required**: Access `response.output_text`
- **Current JSON parsing**: Manual extraction with regex fallback
- **Required**: Direct JSON parsing (if prompt configured for JSON)

### 3. Error Handling
- **Current**: Generic error handling
- **Required**: Handle responses API specific errors

### 4. Token Usage
- **Current**: Not tracked
- **Available**: `response.usage` with input_tokens/output_tokens

## Implementation Steps

### Step 1: Update Service Constructor
No changes needed - constructor remains the same:

### Step 2: Convert API Call with Inline Prompt
```typescript
private async processSingleDomain(
  domain: DomainData,
  clientContext: ClientContext
): Promise<QualificationResult> {
  try {
    // Build the prompt using existing method
    const prompt = this.buildPromptForSingleDomain(domain, clientContext);
    
    // Use Responses API with inline prompt
    const response = await this.openai.responses.create({
      model: "o3",
      instructions: prompt,  // Use inline prompt instead of prompt ID
      input: "",  // Empty input since all data is in instructions
      reasoning: { effort: "high" },
      store: true
    });

    // Parse response - same logic as before
    const content = response.output_text;
    if (!content) throw new Error('No response from AI');

    // Try to parse JSON from the response (keeping existing parsing logic)
    let result;
    try {
      if (!content.trim().startsWith('{')) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Full response:', content);
      throw new Error('Invalid JSON in AI response');
    }
    
    // Return formatted result using existing logic
    if (result.qualification && result.reasoning) {
      return {
        domainId: domain.domainId,
        domain: domain.domain,
        qualification: this.validateQualification(result.qualification),
        reasoning: result.reasoning,
        overlapStatus: result.overlap_status || 'none',
        authorityDirect: result.authority_direct || 'n/a',
        authorityRelated: result.authority_related || 'n/a',
        topicScope: result.topic_scope || 'long_tail',
        evidence: result.evidence ? {
          direct_count: result.evidence.direct_count || 0,
          direct_median_position: result.evidence.direct_median_position || null,
          related_count: result.evidence.related_count || 0,
          related_median_position: result.evidence.related_median_position || null
        } : {
          direct_count: 0,
          direct_median_position: null,
          related_count: 0,
          related_median_position: null
        }
      };
    }
    
    throw new Error('Invalid response format from AI');
  } catch (error) {
    // Keep existing error handling
    console.error(`Domain ${domain.domain} processing error:`, error);
    return {
      domainId: domain.domainId,
      domain: domain.domain,
      qualification: 'marginal_quality' as const,
      reasoning: 'AI processing error - requires manual review',
      overlapStatus: 'none',
      authorityDirect: 'n/a',
      authorityRelated: 'n/a',
      topicScope: 'long_tail',
      evidence: {
        direct_count: 0,
        direct_median_position: null,
        related_count: 0,
        related_median_position: null
      }
    };
  }
}
```

### Step 3: No Changes Needed
The existing helper methods (`buildPromptForSingleDomain`, `extractKeywordThemes`, `validateQualification`) remain unchanged since we're using inline prompts.

## Testing Strategy

### 1. Unit Tests
- Mock `openai.responses.create()` calls
- Test response parsing
- Test error scenarios

### 2. Integration Tests
- Test with actual OpenAI API
- Verify JSON response format
- Compare results with current implementation

### 3. Validation
- Run parallel tests: old vs new API
- Ensure qualification results match
- Monitor token usage and costs

## Migration Checklist

- [ ] Update service to use Responses API with inline prompts
- [ ] Update response parsing logic
- [ ] Add proper error handling
- [ ] Add token usage tracking
- [ ] Update tests
- [ ] Test with sample domains
- [ ] Compare results with current implementation
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

## Rollback Plan

1. Keep current implementation as fallback
2. Add feature flag for API selection
3. Monitor error rates
4. Quick revert if issues arise

## Cost Considerations

- O3 model pricing: $2.00/1M input tokens, $8.00/1M output tokens
- Store: true adds conversation history (additional storage)
- Monitor usage closely during migration

## Timeline

1. **Day 1**: Create prompt, get ID, implement conversion
2. **Day 2**: Testing and validation
3. **Day 3**: Staging deployment and monitoring
4. **Day 4**: Production deployment

## Notes

- The Responses API is stateful - consider implications
- Prompt versioning allows updates without code changes
- Built-in JSON support eliminates parsing issues
- Better error messages and debugging capabilities