# Article Draft Workflow Bug Audit Report

## Executive Summary
The article draft workflow step has accumulated significant technical debt through the evolution of four different execution methods. The core issue is a "last write wins" architecture without any conflict detection or resolution mechanisms, creating multiple pathways for data loss and corruption.

## Architecture Overview

### Four Execution Flows
1. **ChatGPT Tab**: Manual copy-paste workflow with structured prompts
2. **Built-in Chat Tab**: Interactive chat interface with same prompts
3. **AI Agent V1 Tab**: Automated article generation with tool-based approach
4. **AI Agent V2 Tab**: Simplified orchestration with natural language flow

### Shared Data Model
All tabs write to the same fields in `step.outputs`:
- `fullArticle`: The complete article text
- `wordCount`: Article word count
- `draftStatus`: Current status ('in-progress', 'completed')
- `planningStatus`: Planning phase status
- `googleDocUrl`: External document link
- `agentGenerated`: Boolean flag for AI generation
- `agentVersion`: Which AI version was used

## Critical Bug Vectors

### 1. Race Condition: Concurrent Tab Usage
**Scenario**: User has multiple browser tabs open with same workflow
```
Tab A: User editing fullArticle manually
Tab B: User triggers AI Agent V2
Result: Agent overwrites user's manual edits without warning
```
**Root Cause**: No optimistic concurrency control or conflict detection

### 2. Auto-Save Timing Conflicts
**Scenario**: Overlapping auto-save triggers
```
SavedField debounce: 1 second
StepForm auto-save: Additional 2 seconds
Total delay: 3 seconds
```
**Issue**: Large window for concurrent modifications to occur

### 3. Agent State Pollution
**V1 Agent Issues**:
- Creates separate database tables (`agentSessions`, `articleSections`)
- Versioning system doesn't sync with main workflow
- Can have multiple versions running simultaneously
- Final article assembly may use wrong version

**V2 Agent Issues**:
- Simpler architecture but still creates `v2AgentSessions`
- No protection against multiple concurrent runs
- Overwrites `fullArticle` without checking existing content

### 4. Field Overwrite Patterns
**Critical Fields Without Protection**:
```typescript
articleStep.outputs = {
  ...articleStep.outputs,
  fullArticle: article,  // Overwrites without checking
  wordCount: totalWords,
  agentGenerated: true,
  draftStatus: 'completed'
};
```

### 5. Database Save Architecture Flaws
- **Full JSON replacement**: Entire workflow saved as single JSON blob
- **No partial updates**: Can't update single field without risk
- **No version control**: No way to detect stale updates
- **No transaction boundaries**: Updates aren't atomic

### 6. Missing Error Recovery
**Agent Failures**:
- V1: Retry mechanism for plain text responses but no workflow state recovery
- V2: No retry mechanism, fails silently on some errors
- Both: No rollback capability if partial generation fails

### 7. State Synchronization Issues
**Between Components**:
```
SavedField → onChange → StepForm → handleStepSave → storage → API → DB
    ↓
Local state (immediate update)
    ↓
Visual feedback ("Saved") before actual save confirmation
```
**Issue**: Optimistic UI updates can mask save failures

## Specific Vulnerability Analysis

### Manual vs Agent Conflicts
1. **Planning Phase Overlap**: User completes planning manually while agent is still running planning phase
2. **Section Writing Race**: Built-in chat writing section 3 while V2 agent writes section 5
3. **Final Assembly Mismatch**: Different versions of sections from different sources

### Auto-Save Edge Cases
1. **Network Timeout**: 3-second delay + network latency = high collision risk
2. **Rapid Tab Switching**: User switches tabs before auto-save completes
3. **Browser Refresh**: Pending auto-saves lost on page reload

### Agent-Specific Issues

**V1 Agent**:
- File search tool usage not synchronized with main workflow
- Section versioning disconnected from workflow versioning
- `articleSections` table can have orphaned records

**V2 Agent**:
- No section tracking, harder to resume from failures
- History accumulation can exceed memory limits (40 sections)
- ArticleEndCritic can fail silently, causing infinite loops

## Data Loss Scenarios

### Scenario 1: Concurrent Agent Runs
```
1. User starts V1 agent
2. Gets impatient, switches to V2 tab
3. Starts V2 agent
4. Both agents write to same workflow
5. Random winner based on completion time
```

### Scenario 2: Manual Edit During Generation
```
1. User starts agent generation
2. Sees partial output, makes manual corrections
3. Agent completes and overwrites everything
4. User's corrections lost
```

### Scenario 3: Auto-Save Collision
```
1. Tab A: User edits introduction
2. Tab B: User edits conclusion
3. Both trigger auto-save within 3-second window
4. One set of changes lost
```

## Technical Debt Accumulation

### Historical Evolution
1. **Phase 1**: Simple manual workflow with auto-save
2. **Phase 2**: Added built-in chat, reused auto-save
3. **Phase 3**: Added V1 agent, created new tables/patterns
4. **Phase 4**: Added V2 agent, simplified but didn't fix core issues

### Architectural Inconsistencies
- Mixed storage patterns (JSON blob + separate tables)
- Multiple versioning systems not synchronized
- Different error handling approaches per tab
- Inconsistent state management

## Risk Assessment

### High Risk Areas
1. **Production Data Loss**: Any concurrent usage pattern
2. **Agent Cost Overruns**: Multiple agents running unknowingly
3. **Partial Article States**: Incomplete generations saved as complete
4. **Version Confusion**: Wrong sections assembled from different versions

### Medium Risk Areas
1. **Performance Degradation**: Large conversation histories in V2
2. **UI Inconsistency**: Status indicators out of sync with reality
3. **Debug Difficulty**: Multiple state sources make troubleshooting hard

## Recommendations for Immediate Mitigation

### 1. Add Optimistic Concurrency Control
- Add `version` or `updatedAt` checking before saves
- Implement "compare-and-swap" pattern
- Show conflict warnings to users

### 2. Implement Workflow Locking
- Prevent multiple agents running simultaneously
- Add "agent_running" flag with timeout
- Block tab switching during agent execution

### 3. Separate Agent Output Storage
- Don't directly overwrite `fullArticle` during generation
- Store in `draftArticle` field first
- Require explicit user action to promote to final

### 4. Add Transaction Boundaries
- Wrap critical updates in database transactions
- Implement proper rollback on failures
- Use row-level locking for updates

### 5. Improve Error Visibility
- Surface auto-save failures to users
- Log all agent state transitions
- Add telemetry for collision detection

## Conclusion

The article draft workflow's evolution from a simple manual process to a complex multi-agent system has created numerous opportunities for data loss and corruption. The fundamental issue is the lack of conflict detection and resolution mechanisms in a system that now supports multiple concurrent execution paths. Without addressing these architectural issues, users will continue to experience intermittent data loss that's difficult to reproduce and debug.

The immediate priority should be implementing basic concurrency controls and separating agent-generated content from user-edited content to prevent overwrites. Long-term, the workflow needs a more robust state management system that can handle the complexity of multiple execution modes.