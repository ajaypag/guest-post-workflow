# Order Tables Clarification - IMPORTANT

## Current Production Tables (As of 2025-08-28)

### ✅ CORRECT: Active Tables Used in Production

1. **`order_line_items`** - The CURRENT production table for order items
   - Located in: `/lib/db/orderLineItemSchema.ts`
   - Used by: `/app/orders/[id]/review/page.tsx` and all order management interfaces
   - Key fields:
     - `id`: UUID primary key
     - `orderId`: References orders table
     - `assignedDomainId`: References bulk_analysis_domains.id
     - `clientId`: References clients table
     - `metadata`: JSONB field with inclusionStatus and other data
   - This is where domains get assigned to actual customer orders

2. **`bulk_analysis_domains`** - Where all domains and their analysis data live
   - Located in: `/lib/db/bulkAnalysisSchema.ts`
   - Stores all domain analysis (DataForSEO, OpenAI, target matching)
   - Referenced by order_line_items via assignedDomainId

### ❌ LEGACY: Tables NOT Used in Current Production

1. **`guest_post_items`** (also exported as `orderItems`)
   - Located in: `/lib/db/orderSchema.ts`
   - **STATUS: LEGACY - DO NOT USE FOR NEW CODE**
   - Still exists in database for backward compatibility
   - Has a confusing alias: `export const orderItems = guestPostItems;` (line 182)
   - Was the original order items table before the line items system redesign

## Why the Confusion Happened

In `/lib/db/orderSchema.ts` line 182:
```typescript
// Legacy export for backward compatibility (will be removed after migration)
export const orderItems = guestPostItems;
```

This creates an alias where importing `orderItems` actually gives you `guestPostItems`, which is NOT what the current production system uses.

## Key Relationships

```
orders (main order table)
  ↓
order_line_items (current production)
  ↓ (via assignedDomainId)
bulk_analysis_domains (domain data & analysis)
```

## For Duplicate Detection Improvements

When working on duplicate detection, focus on:
1. **order_line_items.assignedDomainId** - Links to domains that are already in orders
2. **bulk_analysis_domains** - The source of truth for all domain data
3. The unique constraint: `(clientId, domain)` on bulk_analysis_domains

## Migration Status

- The system has already migrated to order_line_items
- guest_post_items remains for historical data only
- No active code should reference guest_post_items for new functionality

## Developer Notes

- Always use `order_line_items` for any new order-related features
- The `/api/orders/[id]/line-items` endpoints work with order_line_items
- The order review page (`/orders/[id]/review`) uses order_line_items exclusively
- When you see `orderItems` imported from orderSchema, be aware it's actually the legacy guest_post_items

Last Updated: 2025-08-28
Verified By: Reviewing production code at /app/orders/[id]/review/page.tsx