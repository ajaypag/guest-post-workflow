# Updating Order Flow - Complete Guide

## Overview
This document provides a comprehensive guide to the order flow system, its current implementation status, and instructions for making updates. The order system supports multi-client orders, bulk analysis integration, client review workflows, and automated workflow generation.

## Current Order Flow Status

### Implemented Pages & Features ✅

1. **Order Creation** (`/orders/new`) - ✅ Complete
   - Three-column interface (Clients → Target Pages → Order Details)
   - Package-based pricing: Good ($230, DR 20-34), Better ($279, DR 35-49), Best ($349, DR 50-80)
   - Multi-client order support with line items
   - Auto-save draft functionality
   - Mobile responsive design

2. **Order Confirmation** (`/orders/[id]/confirm`) - ✅ Complete
   - Review and confirm draft orders
   - Creates bulk analysis projects on confirmation
   - Sends notifications to internal team
   - Transitions: `draft` → `pending_confirmation`

3. **Site Selection** (`/orders/[id]/sites`) - ✅ Complete
   - Internal team selects domains from bulk analysis
   - Integration with bulk analysis projects
   - Add domains to order groups
   - Transitions: `pending_confirmation` → `confirmed` → `sites_ready`

4. **Client Site Review** (`/account/orders/[id]/sites`) - ✅ Complete
   - Clients review and approve/reject domains
   - Three tabs: Pending Review, All Suggestions, Approved
   - Special instructions per domain
   - Transitions: `sites_ready` → `client_reviewing` → `client_approved`

5. **Order Detail** (`/orders/[id]`) - ✅ Complete
   - Full order management for internal team
   - Status tracking and transitions
   - Site submissions overview
   - Different views for internal vs account users

6. **Order Status Transitions** (`/api/orders/[id]/status-transition`) - ✅ Complete
   - Validated state machine for order progression
   - Side effects (workflow creation on payment)
   - Permission-based access control

### Pending Implementation 🚧

1. **Order Share/Preview** (`/orders/share/[token]`)
   - Public preview for clients without authentication
   - "Create Account & Approve" flow
   - Token expiration and tracking

2. **Invoice & Payment Integration**
   - Currently manual process
   - Needs: Invoice generation, payment tracking, notifications

3. **Published URL Tracking**
   - Track final published URLs per workflow
   - Update order site submissions with published data
   - Client notifications on completion

## Order Status Flow

```
draft → pending_confirmation → confirmed → sites_ready → client_reviewing 
  ↓                              ↓           ↓               ↓
cancelled ←←←←←←←←←←←←←←←← cancelled ← cancelled ← cancelled ←┘
                                                              ↓
                                                     client_approved
                                                              ↓
                                                          invoiced
                                                              ↓
                                                            paid
                                                              ↓
                                                         in_progress
                                                              ↓
                                                          completed
```

### Status Transitions Logic
```typescript
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['pending_confirmation'],
  'pending_confirmation': ['confirmed', 'cancelled'],
  'confirmed': ['sites_ready', 'cancelled'],
  'sites_ready': ['client_reviewing', 'cancelled'],
  'client_reviewing': ['client_approved', 'sites_ready', 'cancelled'],
  'client_approved': ['invoiced', 'cancelled'],
  'invoiced': ['paid', 'cancelled'],
  'paid': ['in_progress', 'cancelled'],
  'in_progress': ['completed'],
  'completed': [],
  'cancelled': []
};
```

## Key Database Relationships

### Order Structure
- **orders** - Main order record with status, pricing, account
- **orderGroups** - Client segments within an order
  - Links to clients
  - Has `bulkAnalysisProjectId` for domain selection
  - Tracks link requirements
- **orderSiteSubmissions** - Tracks selected domains and review status
  - Links domains to order groups
  - Tracks client approval/rejection
  - Stores special instructions

### Integration Points
- **Bulk Analysis Projects** - Created during order confirmation
- **Workflows** - Auto-created when order status = 'paid'
- **Email Notifications** - Triggered on status changes

## Making Updates to Order Flow

### 1. Adding New Order Statuses

**Step 1**: Update the schema
```typescript
// lib/db/orderSchema.ts
export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'pending_confirmation',
  'confirmed',
  'sites_ready',
  'client_reviewing',
  'client_approved',
  'invoiced',
  'paid',
  'in_progress',
  'completed',
  'cancelled',
  'your_new_status' // Add here
]);
```

**Step 2**: Update status transitions
```typescript
// app/api/orders/[id]/status-transition/route.ts
const STATUS_TRANSITIONS: Record<string, string[]> = {
  // ... existing transitions
  'your_new_status': ['next_allowed_status'],
};
```

**Step 3**: Add side effects if needed
```typescript
// In the same route file
switch (newStatus) {
  case 'your_new_status':
    // Add any side effects here
    await YourService.handleNewStatus(orderId);
    break;
}
```

### 2. Modifying Order Creation Flow

The order creation is being redesigned. Key files:
- `/app/orders/new/page.tsx` - Main creation page
- `/lib/services/orderService.ts` - Business logic
- `docs/architecture/ORDER_INTERFACE_REDESIGN.md` - Design specs

**Important**: Maintain backward compatibility with existing orders!

### 3. Adding Features to Client Review

**File**: `/app/account/orders/[id]/sites/page.tsx`

Common additions:
- Bulk approve/reject buttons
- Export to CSV
- Filter by domain metrics
- Alternative suggestion system

### 4. Integrating New Services

Example: Adding invoice generation

```typescript
// lib/services/invoiceService.ts
export class InvoiceService {
  static async generateInvoice(orderId: string) {
    const order = await OrderService.getOrderWithDetails(orderId);
    // Generate PDF, store reference
    return invoiceUrl;
  }
}

// Hook into status transition
case 'client_approved':
  const invoiceUrl = await InvoiceService.generateInvoice(orderId);
  // Store invoice reference, send notification
  break;
```

## Security Considerations

1. **Permission Checks**
   - Internal users: Full access to all orders
   - Account users: Only their own orders
   - Check: `session.userType` and `order.accountId`

2. **Status Transition Validation**
   - Always validate transitions server-side
   - Check user permissions for each transition
   - Log all status changes for audit trail

3. **Share Tokens**
   - Time-limited (7 days recommended)
   - Single-use or limited views
   - No authentication required but track usage

## Testing Order Flow

### Manual Testing Checklist
- [ ] Create multi-client order
- [ ] Confirm order (creates bulk analysis)
- [ ] Select sites from bulk analysis
- [ ] Client reviews and approves sites
- [ ] Process payment (manual)
- [ ] Verify workflow creation
- [ ] Check email notifications

### Key Test Scenarios
1. **Multi-client orders** - Different requirements per client
2. **Partial approvals** - Some sites approved, some rejected
3. **Status rollbacks** - Moving back to previous states
4. **Permission boundaries** - Account vs internal access

## Common Issues & Solutions

### Issue: "Add to Order" not showing associated order
**Solution**: Ensure `orderGroups.bulkAnalysisProjectId` is set during confirmation

### Issue: Client can't see suggested sites
**Solution**: Check `orderSiteSubmissions` has entries with status='submitted'

### Issue: Workflows not created on payment
**Solution**: Verify `OrderService.createWorkflowsForOrder()` is called in status transition

## Future Enhancements

1. **Automated Invoice Generation**
   - PDF generation with line items
   - Stripe/PayPal integration
   - Payment tracking dashboard

2. **Enhanced Client Portal**
   - Real-time workflow progress
   - Content preview before publication
   - Revision requests

3. **Bulk Operations**
   - Bulk order creation from CSV
   - Batch status updates
   - Mass domain selection

4. **Analytics & Reporting**
   - Order completion rates
   - Average time per status
   - Client satisfaction metrics

## Related Documentation

- `ORDER_SYSTEM_IMPLEMENTATION.md` - Initial implementation details
- `ORDER_INTERFACE_REDESIGN.md` - Current UI redesign work
- `ORDER_SCHEMA_DESIGN.md` - Database schema details
- `CLIENT_SECURITY_IMPLEMENTATION.md` - Security patterns
- `TECH_DEBT_AND_SHORTCUTS.md` - Known issues and shortcuts

## Quick Command Reference

```bash
# Check order status distribution
SELECT status, COUNT(*) FROM orders GROUP BY status;

# Find orders stuck in a status
SELECT * FROM orders WHERE status = 'client_reviewing' 
AND updated_at < NOW() - INTERVAL '7 days';

# Reset order to draft (dev only)
UPDATE orders SET status = 'draft' WHERE id = 'order_id';

# Check order groups with bulk analysis
SELECT og.*, ba.name as project_name 
FROM order_groups og 
LEFT JOIN bulk_analysis ba ON og.bulk_analysis_project_id = ba.id;
```