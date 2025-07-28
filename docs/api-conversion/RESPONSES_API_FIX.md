# Responses API Fix

## Error Analysis

The error message clearly states:
```
400 One of "input" or "previous_response_id" or 'prompt' must be provided.
```

## Current (Failed) Attempt
```typescript
const response = await this.openai.responses.create({
  model: "o3",
  instructions: prompt,  // ❌ Not a valid parameter
  input: "",            // ❌ Empty input
  reasoning: { effort: "high" },
  store: true
});
```

## Working Examples in Codebase

### Example 1: With Prompt ID
```typescript
const response = await openai.responses.create({
  model: "o3",
  prompt: { 
    id: "pmpt_687320ae29748193b407cc07bd0a683f0605e5d920c44630",
    version: "1"
  },
  input: input,  // ✅ Actual data provided
  reasoning: { effort: "high" },
  store: true
});
```

### Example 2: From API route
```typescript
const response = await openai.responses.create({
  model: "o3",
  prompt: { 
    id: "pmpt_68710db9410c8196ab64b7921e7325730317ff998ddbc50b" 
  },
  input: input,  // ✅ Actual data provided
  reasoning: { effort: "high" },
  store: true
});
```

## Correct Fix Options

### Option 1: Use prompt object without ID (inline prompt)
```typescript
const response = await this.openai.responses.create({
  model: "o3",
  prompt: prompt,  // Pass the prompt string directly as the prompt
  input: "",       // Can be empty if all data is in prompt
  reasoning: { effort: "high" },
  store: true
});
```

### Option 2: Put all data in input
```typescript
const response = await this.openai.responses.create({
  model: "o3",
  input: prompt,   // Put the entire prompt as input
  reasoning: { effort: "high" },
  store: true
});
```

### Option 3: Hybrid approach (recommended)
```typescript
// Prepare structured input data
const inputData = {
  clientInfo: this.formatClientInfo(clientContext),
  domainInfo: this.formatDomainInfo(domain)
};

// Instructions for how to process the data
const instructions = `Analyze the following domain for guest posting opportunities and return a JSON qualification result.`;

const response = await this.openai.responses.create({
  model: "o3",
  prompt: instructions,
  input: JSON.stringify(inputData),
  reasoning: { effort: "high" },
  store: true
});
```

## API Parameters Reference

Based on the error and working examples:

**Required (at least one):**
- `input`: The data to process
- `previous_response_id`: For continuing conversations
- `prompt`: Either a string or object with ID

**Optional:**
- `model`: Model to use (default: o3)
- `reasoning`: Effort level configuration
- `store`: Whether to store the conversation
- `instructions`: NOT a valid parameter (this was our mistake)

## Recommended Implementation

Since we have a complex prompt with instructions AND data, the best approach is:
1. Use `input` for the actual data (domain info, client context)
2. Use `prompt` for the instructions on how to process it
3. This separates concerns and makes it clearer