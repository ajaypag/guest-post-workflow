# Development Guide

Developer documentation for building and extending the system.

## Contents

### AI Development
- **[building-ai-agents.md](building-ai-agents.md)** - How to create new AI agents
- **[ai-v2-pattern.md](ai-v2-pattern.md)** - V2 orchestration pattern
- **[retry-pattern.md](retry-pattern.md)** - Handling AI retry logic
- **[auto-save-pattern.md](auto-save-pattern.md)** - Auto-save implementation

### Best Practices
- **[database-guidelines.md](database-guidelines.md)** - Database schema rules
- **[component-patterns.md](component-patterns.md)** - React component patterns
- **[marketing-header-guide.md](marketing-header-guide.md)** - Marketing header implementation
- **[responsive-design.md](responsive-design.md)** - Responsive design fixes
- **[archive-behavior.md](archive-behavior.md)** - Archive functionality behavior

## Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Follow patterns in existing code
   - Ensure `npm run build` passes

2. **AI Agent Development**
   - Use V2 pattern for new agents
   - Implement retry logic
   - Add diagnostic logging

3. **Database Changes**
   - Use TEXT for AI content (not VARCHAR)
   - Run migrations before deploying
   - Update schema documentation

## Common Patterns

### Auto-Save Pattern
```typescript
// Pass data immediately to avoid race conditions
onChange(newData);
triggerAutoSave(newData); // Don't rely on state
```

### AI Retry Pattern
```typescript
if (assistantSentPlainText(messages)) {
  messages.push({ role: "user", content: RETRY_NUDGE });
}
```

## Testing Commands

```bash
npm run lint        # Code style
npm run typecheck   # TypeScript
npm run build       # Must pass before commit
```