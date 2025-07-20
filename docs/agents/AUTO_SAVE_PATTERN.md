# Auto-Save Race Condition Pattern for AI Agents

> **Why**: Prevent false "Auto-saved" notifications that don't actually persist AI-generated content  
> **Use when**: Any AI agent generates content in workflow steps (especially multi-tab interfaces)  
> **Critical for**: ArticleDraftStepClean, ContentAuditStepClean, and any future agent integrations

## The Problem

When AI agents generate content and call `onChange()`, a React setState race condition causes auto-save to read stale (empty) state instead of the new content. This results in:

- ✅ UI shows "Auto-saved" notification
- ❌ Database saves empty content (`fullArticleLength: 0`)
- ❌ User loses AI-generated content on navigation

## Root Cause

```typescript
// PROBLEM: Race condition timeline
1. Agent completes → calls onChange({ fullArticle: "2000 chars..." })
2. React schedules setState (async) 
3. Auto-save timer triggers (2 seconds)
4. Auto-save reads state → still empty! (setState hasn't completed)
5. Saves empty data to database
6. setState completes → UI shows content (but it's not saved!)
```

## The Solution

Pass immediate data directly to auto-save, bypassing React state:

### 1. StepForm.tsx - Modified Auto-Save

```typescript
const triggerAutoSave = (immediateData?: any) => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  const timer = setTimeout(() => {
    console.log('⏱️ Auto-saving after 2 seconds of inactivity');
    if (immediateData) {
      console.log('🚀 Using immediate data for auto-save to avoid state race condition');
      // Use immediate data instead of stale state
      await onSave(localInputs, immediateData, false);
    } else {
      handleSave(false); // Fallback to normal save
    }
  }, 2000);

  setAutoSaveTimer(timer);
};
```

### 2. StepForm.tsx - Critical Fields Detection

```typescript
const handleOutputChange = (data: any) => {
  // Define critical fields that should trigger auto-save
  const criticalFields = ['finalArticle', 'fullArticle', 'seoOptimizedArticle', 'googleDocUrl'];
  
  const hasChangedCriticalField = criticalFields.some(field => {
    if (field === 'fullArticle' && data[field]) {
      const oldValue = localOutputs[field] || '';
      const newValue = data[field] || '';
      const hasChanged = oldValue !== newValue;
      
      if (hasChanged) {
        console.log(`✅ Critical field "${field}" has changed`);
        console.log(`   Agent version: ${data.agentVersion}, Generated: ${data.agentGenerated}`);
      }
      return hasChanged;
    }
    // ... other field checks
  });
  
  setLocalOutputs(data);
  setActiveOperations(prev => ({ ...prev, hasUnsavedChanges: true }));
  
  // Pass immediate data to avoid race condition
  if (hasChangedCriticalField) {
    console.log('🔄 Critical field changed, triggering auto-save with immediate data');
    triggerAutoSave(data); // Pass the immediate data!
  }
};
```

## Implementation Pattern for New Agents

When creating a new AI agent component that generates content:

### 1. Agent Component Pattern

```typescript
// components/ui/YourNewAgent.tsx
interface YourNewAgentProps {
  workflowId: string;
  // ... other props
  onComplete: (content: string) => void;
}

export const YourNewAgent = ({ onComplete, ...props }: YourNewAgentProps) => {
  const handleAgentComplete = (generatedContent: string) => {
    console.log('🎯 Agent completed with content length:', generatedContent.length);
    
    // Critical: Call onComplete to trigger the save flow
    onComplete(generatedContent);
  };
  
  // ... agent implementation
};
```

### 2. Step Component Integration

```typescript
// components/steps/YourStepClean.tsx
<YourNewAgent
  workflowId={workflow.id}
  onComplete={(content) => {
    console.log('🎯 Agent onComplete called with content length:', content.length);
    
    const updatedOutputs = { 
      ...step.outputs, 
      yourContentField: content,
      agentGenerated: true,
      agentVersion: 'v1', // or 'v2', 'v2-mock', etc.
      generatedAt: new Date().toISOString()
    };
    
    console.log('📤 Calling onChange with updated outputs');
    onChange(updatedOutputs);
    console.log('✅ onChange completed - auto-save will handle persistence');
  }}
/>
```

### 3. Add Your Field to Critical Fields

In `StepForm.tsx`, add your content field to the critical fields list:

```typescript
const criticalFields = [
  'finalArticle', 
  'fullArticle', 
  'seoOptimizedArticle', 
  'yourContentField', // Add your field here!
  'googleDocUrl'
];
```

## Testing the Fix

1. **Create a Mock Component** (recommended for testing):
   ```typescript
   // components/ui/YourAgentMock.tsx
   // See AgenticArticleGeneratorV2Mock.tsx as example
   ```

2. **Console Logs to Verify**:
   ```
   ✅ GOOD: "Using immediate data for auto-save to avoid state race condition"
   ✅ GOOD: "fullArticleLength: 1507" (actual content length)
   
   ❌ BAD: "fullArticleLength: 0" (race condition not fixed)
   ```

3. **Test Scenarios**:
   - Generate content → Check auto-save logs
   - Navigate away → Come back → Content should persist
   - No false navigation warnings after save

## Common Pitfalls

1. **Don't forget to log in onComplete**:
   ```typescript
   // Always add logging to debug issues
   console.log('🎯 Agent onComplete called with content length:', content.length);
   ```

2. **Include metadata fields**:
   ```typescript
   // These help with debugging and display logic
   agentGenerated: true,
   agentVersion: 'v1',
   generatedAt: new Date().toISOString()
   ```

3. **Check field is in critical fields list**:
   - If your field isn't in the list, auto-save won't trigger
   - StepForm.tsx line ~274

## Affected Components

Currently implemented in:
- ✅ `ArticleDraftStepClean.tsx` - `fullArticle` field
- ✅ `ContentAuditStepClean.tsx` - `seoOptimizedArticle` field

Needs implementation in:
- ⏳ `FinalPolishStepClean.tsx` - `finalArticle` field
- ⏳ Any new agent-powered steps

## Summary

The auto-save race condition is a critical issue that affects all AI agent integrations. By passing immediate data to the auto-save function, we bypass React's async setState and ensure AI-generated content is actually saved when the user sees "Auto-saved".

**Remember**: Manual save always works because it reads current state. Auto-save needs immediate data to work correctly with AI agents.