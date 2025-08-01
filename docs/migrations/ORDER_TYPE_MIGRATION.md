# Order Type Migration

## Overview
This migration refactors the order system to support multiple order types (guest posts, link insertions, etc.) by:
1. Adding an `orderType` field to the orders table
2. Renaming `orderItems` to `guestPostItems` to be specific about what type of items they are

## Migration Date
2025-02-01

## Changes Made

### Database Schema
1. **orders table**
   - Added `orderType` column (VARCHAR 50, default: 'guest_post')
   - Added index on `orderType` for query performance

2. **Table Rename**
   - `order_items` → `guest_post_items`
   - All indexes renamed accordingly
   - Foreign key constraints updated

### Code Changes
1. **orderSchema.ts**
   - Added `orderType` field to orders table definition
   - Renamed `orderItems` to `guestPostItems`
   - Added legacy exports for backward compatibility
   - Updated all relations

2. **Migration Tool**
   - Created `/admin/order-type-migration` page
   - Created API endpoint for running the migration
   - Migration is idempotent (safe to run multiple times)

## Running the Migration

1. Go to `/admin/order-type-migration` in your browser
2. Click "Run Migration"
3. The migration will:
   - Add the orderType column if it doesn't exist
   - Rename the table if needed
   - Update all constraints and indexes

## Future Order Types

When adding new order types (e.g., link insertions):

1. Create a new table:
```typescript
export const linkInsertionItems = pgTable('link_insertion_items', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').references(() => orders.id),
  targetArticleUrl: text('target_article_url'),
  anchorText: varchar('anchor_text', { length: 255 }),
  insertionLocation: varchar('insertion_location', { length: 100 }),
  price: integer('price'),
  // ... other fields specific to link insertions
});
```

2. When creating an order, set the appropriate `orderType`:
```typescript
const newOrder = {
  orderType: 'link_insertion', // or 'guest_post'
  // ... other order fields
};
```

## Backward Compatibility

- Legacy exports are maintained in `orderSchema.ts`
- Existing code using `orderItems` will continue to work
- These can be removed after all code is updated to use `guestPostItems`

## Benefits

1. **Clear Separation**: Each order type has its own items table with relevant fields
2. **Type Safety**: TypeScript knows exactly what fields are available for each order type
3. **Performance**: No wasted columns or complex queries
4. **Maintainability**: Changes to one order type don't affect others
5. **Scalability**: Easy to add new order types without modifying existing tables