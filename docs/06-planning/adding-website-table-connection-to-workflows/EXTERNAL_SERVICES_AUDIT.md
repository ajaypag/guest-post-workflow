# External Services Audit: Domain Field Usage

## Orders Integration ✅ CONFIRMED

### Workflow Creation from Orders
**Location**: `orderService.ts:createWorkflowsFromOrder()`

**How it works**:
1. Order items contain `item.domain` field  
2. Creates workflow title: `${companyName} - ${item.domain}`
3. **Does NOT populate** workflow `step.outputs.domain` 
4. Links via `orderItemId` field in workflows table

**Key Finding**: Order domain becomes workflow title, but **domain-selection step starts empty**

### Order Item Structure 
**Fields**:
- `orderItemId` - Links workflow to order line item
- `item.domain` - Used for workflow title only
- No direct connection to `step.outputs.domain`

## Bulk Analysis Connections ❌ NO DIRECT CONNECTION

### Current State
- **Bulk Analysis** → `websites` table (connected)
- **Workflows** → `step.outputs.domain` string (disconnected)  
- **No bridge** between bulk analysis domains and workflow domains

### What We Found
- Bulk analysis uses `bulkAnalysisDomains.domain` 
- Orders use `orderLineItems.assignedDomain`
- Both connect to `websites` table via domain matching
- Workflows don't participate in this connection

### The Gap
```
Bulk Analysis → websites ✅ CONNECTED
Orders → websites ✅ CONNECTED  
Workflows → ??? ❌ DISCONNECTED
```

## External Services Using Domain Field

### Email Services
1. **chatwootSyncService** - Uses `workflow.domain` for email subjects
2. **workflowEmailService** - References domain in email content
3. **chatwootService** - Uses domain for publisher outreach

### Workflow Generation
1. **workflowGenerationService** - Handles domain-selection step creation
2. **orderService** - Creates workflows from orders with domain titles

### Task Management
1. **taskService** - Extracts domain from `domainSelectionStep.outputs.domain`

## Impact Assessment

### Current Connections
- **18 files** reference the domain field
- **13 workflow steps** depend on it
- **Multiple email services** use it for outreach
- **Order system** creates workflows but doesn't populate the field

### Missing Connections
- No link between workflow domains and bulk analysis
- No connection to website metadata (pricing, contacts, etc.)
- No validation against available websites
- Manual entry leads to typos and inconsistencies

## Conclusion

**The domain field is extensively used but poorly connected**:
- Heavy internal usage across 18 files
- No integration with rich website data
- No connection to bulk analysis system  
- Orders create workflows but don't populate domain field
- Manual entry bypasses all existing website intelligence