# Order Assignment System Design

## Overview
Design for implementing a proper assignment system for orders, allowing internal team members to be assigned to and manage specific orders.

## Current State
- Orders have an `assignedTo` field (user ID string)
- No UI for selecting users to assign
- No tracking of assignment history
- No visibility into team member workloads

## Proposed Solution

### 1. Database Enhancements

#### Internal Users Table Extension
Add workload tracking fields to internal users:
```sql
ALTER TABLE internal_users ADD COLUMN 
  active_orders_count INTEGER DEFAULT 0,
  completed_orders_count INTEGER DEFAULT 0,
  last_assignment_at TIMESTAMP;
```

#### Assignment History Table
Track assignment changes:
```sql
CREATE TABLE order_assignments (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  assigned_to UUID,
  assigned_by UUID NOT NULL,
  assignment_type TEXT, -- 'assigned', 'reassigned', 'unassigned'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. API Endpoints

#### GET /api/internal-users/assignable
Returns list of internal users available for assignment:
```json
{
  "users": [
    {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@company.com",
      "activeOrders": 5,
      "completedOrders": 23,
      "lastAssignment": "2025-01-30T10:00:00Z"
    }
  ]
}
```

#### POST /api/orders/:id/assign
Assign or reassign an order:
```json
{
  "assignedTo": "user-id",
  "notes": "Reassigning due to workload"
}
```

#### GET /api/orders/assignments/my
Get orders assigned to current user:
```json
{
  "orders": [...],
  "stats": {
    "active": 5,
    "completed": 23,
    "averageCompletionTime": "5 days"
  }
}
```

### 3. UI Components

#### User Selection Component
```tsx
interface UserSelectorProps {
  value?: string;
  onChange: (userId: string) => void;
  showWorkload?: boolean;
}

function UserSelector({ value, onChange, showWorkload }: UserSelectorProps) {
  // Dropdown with search
  // Shows user name, email, and active order count
  // Sorts by workload (least busy first)
}
```

#### Assignment Dashboard
New page at `/assignments` showing:
- Team member list with current workloads
- Orders by assignment status
- Quick reassignment actions
- Workload balancing suggestions

### 4. Implementation Phases

#### Phase 1: Basic Assignment (Quick Win)
1. Create assignable users API endpoint
2. Replace text input with UserSelector component
3. Add assignment tracking to order confirmation

#### Phase 2: Assignment Dashboard
1. Create assignment history table
2. Build assignment dashboard
3. Add bulk assignment features

#### Phase 3: Smart Assignment
1. Add workload balancing algorithm
2. Implement auto-assignment suggestions
3. Add assignment rules (by client type, order size, etc.)

### 5. Integration Points

#### Order Confirmation Page
Replace current text input:
```tsx
// Before
<input
  type="text"
  value={assignedTo}
  onChange={(e) => setAssignedTo(e.target.value)}
  placeholder="Enter user ID to assign"
/>

// After
<UserSelector
  value={assignedTo}
  onChange={setAssignedTo}
  showWorkload={true}
/>
```

#### Orders Table
Show assigned user with avatar/initials:
```tsx
<div className="flex items-center gap-2">
  <UserAvatar userId={order.assignedTo} />
  <span>{order.assignedToName}</span>
</div>
```

#### Notifications
Send notifications on assignment:
- Email to assigned user
- In-app notification
- Slack integration (future)

### 6. Benefits
- Clear visibility of who owns what
- Workload balancing
- Assignment history for accountability
- Better team collaboration
- Reduced assignment errors

### 7. Migration Strategy
1. Keep existing assignedTo field
2. Backfill assignment history from existing data
3. Gradually introduce new UI components
4. No breaking changes to existing workflows

## Quick Implementation (Minimal MVP)

For immediate improvement with minimal effort:

1. **Create simple users API** (30 min)
   ```typescript
   // /api/internal-users/assignable/route.ts
   export async function GET() {
     const users = await db.select().from(internalUsers);
     return NextResponse.json({ users });
   }
   ```

2. **Add UserSelector component** (1 hour)
   - Simple dropdown with user names
   - Search/filter functionality
   - Show email for clarity

3. **Update confirmation page** (15 min)
   - Replace text input with UserSelector
   - No other changes needed

This gives immediate value with ~2 hours of work, then can be enhanced over time.