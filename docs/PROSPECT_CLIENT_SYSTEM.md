# Prospect vs Client System Design

## Overview
Transform the old `/bulk-analysis` page into a comprehensive dashboard that distinguishes between prospects (potential clients) and clients (signed customers).

## Database Changes
```sql
ALTER TABLE clients ADD COLUMN client_type VARCHAR(50) DEFAULT 'client';
ALTER TABLE clients ADD COLUMN converted_from_prospect_at TIMESTAMP;
ALTER TABLE clients ADD COLUMN conversion_notes TEXT;
```

## Feature Matrix

| Feature | Prospect | Client |
|---------|----------|--------|
| Bulk Analysis Projects | ✅ (Limited to 2) | ✅ (Unlimited) |
| Domain Analysis | ✅ | ✅ |
| Workflows | ❌ | ✅ |
| Target Pages | ✅ (Limited) | ✅ (Unlimited) |
| User Assignments | Sales only | All users |
| Auto-archive | After 90 days | Never |
| DataForSEO Analysis | ✅ | ✅ |

## User Scenarios

### 1. Sales Team Member
**Goal**: Qualify potential clients through bulk analysis

**Workflow**:
1. Creates new prospect from dashboard
2. Adds domains for analysis
3. Runs bulk qualification
4. Shares results with potential client
5. Converts to client when deal closes

**Dashboard View**:
- Default filter: Prospects only
- Sort by: Last activity, creation date
- Quick actions: Add prospect, view analysis

### 2. Account Manager
**Goal**: Oversee client projects and team assignments

**Workflow**:
1. Views all clients and prospects
2. Monitors project progress
3. Assigns team members to clients
4. Tracks conversion metrics

**Dashboard View**:
- Default filter: All (prospects + clients)
- Grouped by: Type, then status
- Metrics: Conversion rate, project velocity

### 3. SEO Analyst/Doer
**Goal**: Execute bulk analysis and create workflows

**Workflow**:
1. Sees only assigned clients
2. Quick access to bulk analysis
3. Creates workflows from qualified domains
4. Focuses on execution

**Dashboard View**:
- Default filter: My assigned clients
- Sort by: Priority, last activity
- Quick actions: Start analysis, create workflow

### 4. First-Time User
**Goal**: Understand the system and get started

**Workflow**:
1. Sees onboarding prompt
2. Guided to create first prospect/client
3. Tutorial for bulk analysis process
4. Success metrics shown

**Dashboard View**:
- Onboarding overlay
- Sample data option
- Help tooltips

## Conversion Flow

### Prospect → Client Conversion
1. **Trigger**: User clicks "Convert to Client" button
2. **Modal**: 
   - Confirms conversion
   - Optional conversion notes
   - Assignment of team members
3. **Actions**:
   - Update `client_type` to 'client'
   - Set `converted_from_prospect_at` timestamp
   - Save conversion notes
   - Enable workflow creation
   - Notify assigned users
4. **Result**: Full client features enabled

## Dashboard Components

### 1. Stats Bar
```typescript
interface Stats {
  totalProspects: number;
  activeClients: number;
  activeProjects: number;
  domainsAnalyzed: number;
  conversionRate: number; // This month
}
```

### 2. Prospect Cards
- Visual card layout
- Key metrics at a glance
- Quick conversion action
- Activity timeline

### 3. Client Table
- Sortable columns
- Team avatars
- Quick navigation to bulk analysis
- Workflow count

### 4. Filters & Views
- Type filter (All/Prospects/Clients)
- Assignment filter (All/Mine)
- Status filter (Active/Inactive)
- Search by name/domain

## Implementation Priority

1. **Phase 1**: Database schema update
2. **Phase 2**: Basic dashboard with type filtering
3. **Phase 3**: Conversion flow
4. **Phase 4**: Advanced features (limits, auto-archive)

## Edge Cases

### 1. Orphaned Data
- Prospects with no activity → Auto-archive after 90 days
- Archived prospects → Can be restored if needed

### 2. Permission Conflicts
- Non-sales creating prospects → Allowed but limited
- Analysts accessing prospects → Read-only by default

### 3. Data Migration
- Existing clients → Set as 'client' type
- No retrospective prospect tracking

## Success Metrics
1. **Conversion Rate**: Prospects → Clients
2. **Time to Conversion**: Average days
3. **Project Velocity**: Projects per client/month
4. **User Adoption**: Active users per week