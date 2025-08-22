# Line Items Differential Update System

## Problem Solved
Previously, when editing an order, the system would:
1. Delete ALL existing line items/order groups
2. Recreate everything from scratch

This caused issues where adding 1 item would cancel and recreate the other existing items, losing history and causing confusion.

## Solution Implemented

### 1. Backend Changes

#### Updated PUT /api/orders/[id]/route.ts
- No longer deletes line items when updating an order
- Line items are now excluded from the order update payload
- OrderGroups system marked as deprecated (legacy support only)

#### Added DELETE endpoint for line items
- `/api/orders/[id]/line-items/[lineItemId]`
- Soft delete (marks as 'cancelled') to preserve history
- Updates order totals after deletion

### 2. Frontend Component

#### New LineItemsEditor Component
Location: `/components/orders/LineItemsEditor.tsx`

Features:
- Tracks original vs current state
- Visual indicators for new/modified/deleted items
- Differential updates only send changes
- Batch operations for efficiency

Usage:
```tsx
import { LineItemsEditor } from '@/components/orders/LineItemsEditor';

<LineItemsEditor
  orderId={orderId}
  initialLineItems={lineItems}
  clients={clients}
  onSave={handleSave}
  editable={true}
/>
```

### 3. How It Works

#### Change Tracking
```typescript
// Items are marked with flags:
item._isNew      // New item, not yet saved
item._isModified // Existing item that changed
item._isDeleted  // Item marked for deletion
```

#### Differential Save Process
1. **New Items**: POST to `/api/orders/[id]/line-items`
2. **Modified Items**: PATCH to `/api/orders/[id]/line-items`
3. **Deleted Items**: DELETE to `/api/orders/[id]/line-items/[itemId]`

Only changed items are sent to the server, preserving unchanged items.

## Integration Guide

### For Order Edit Page

Replace the current order groups logic with:

1. **Import the new component**:
```tsx
import { LineItemsEditor } from '@/components/orders/LineItemsEditor';
```

2. **Load line items instead of order groups**:
```tsx
// In your data fetching
const lineItemsResponse = await fetch(`/api/orders/${orderId}/line-items`);
const { lineItems } = await lineItemsResponse.json();
```

3. **Use the editor component**:
```tsx
<LineItemsEditor
  orderId={orderId}
  initialLineItems={lineItems}
  clients={clients}
  editable={order.status === 'draft'}
/>
```

4. **Remove orderGroups from save logic**:
```tsx
// Don't include line items in order update
const orderData = {
  // ... other fields
  // NO lineItems or orderGroups here
};

await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  body: JSON.stringify(orderData)
});
// Line items are saved separately by the LineItemsEditor
```

## Benefits

1. **Preserves History**: Items aren't recreated, maintaining audit trail
2. **Better Performance**: Only updates what changed
3. **Clearer UX**: Visual indicators show what will change
4. **Concurrent Editing**: Less chance of conflicts
5. **Undo Support**: Can restore deleted items before saving

## Migration Notes

- Existing code using orderGroups will continue to work (legacy support)
- New code should use the line items API endpoints directly
- The LineItemsEditor component handles all the complexity

## API Reference

### Line Items Endpoints

```bash
# Get all line items for an order
GET /api/orders/[orderId]/line-items

# Add new line items
POST /api/orders/[orderId]/line-items
Body: { items: [...], reason: "..." }

# Update multiple line items
PATCH /api/orders/[orderId]/line-items
Body: { updates: [...], reason: "..." }

# Delete a line item (soft delete)
DELETE /api/orders/[orderId]/line-items/[itemId]
```

## Example: Before vs After

### Before (Problematic)
```typescript
// Save would delete ALL and recreate
await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  body: JSON.stringify({
    orderGroups: allGroups // Causes delete + recreate
  })
});
```

### After (Fixed)
```typescript
// Only send what changed
if (newItems.length > 0) {
  await fetch(`/api/orders/${orderId}/line-items`, {
    method: 'POST',
    body: JSON.stringify({ items: newItems })
  });
}

if (modifiedItems.length > 0) {
  await fetch(`/api/orders/${orderId}/line-items`, {
    method: 'PATCH',
    body: JSON.stringify({ updates: modifiedItems })
  });
}

// Existing unchanged items are preserved!
```