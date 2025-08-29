# Current Field Usage for Guest Post Website Selection

## The Field

**Location**: `workflows.content.steps[].outputs.domain`  
**Step ID**: `domain-selection`  
**Component**: `DomainSelectionStepClean.tsx`  
**Line**: 72-74  

## How Users Enter It

Text input field in Step 0 of workflows:
```tsx
<SavedField
  label="Guest Post Website Domain"  
  value={domain}
  onChange={(value) => onChange({ ...step.outputs, domain: value })}
/>
```

## Examples from Database

- `"https://howtobuysaas.com/"`
- `"https://fintechzoom.io/"`  
- `"https://seopressor.com/"`
- `"for your testing.com"`

## Current Storage

Raw string in JSON, no connection to websites table.