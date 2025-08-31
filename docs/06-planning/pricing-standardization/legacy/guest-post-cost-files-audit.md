# Complete Audit: Files Using guest_post_cost

**Total Files**: 117 files  
**Migration Strategy**: Convert DECIMAL dollars → INTEGER cents  
**Current**: `guest_post_cost: "150.00"` (string/decimal)  
**Target**: `guest_post_cost: 15000` (integer cents)

## Conversion Patterns

### Pattern 1: API Returns (currently parseFloat)
```typescript
// BEFORE
guestPostCost: w.guest_post_cost ? parseFloat(w.guest_post_cost) : null
// AFTER  
guestPostCost: w.guest_post_cost || null  // Returns cents directly
```

### Pattern 2: Display in UI
```typescript
// BEFORE
<span>${website.guestPostCost}</span>
// AFTER
<span>${(website.guestPostCost / 100).toFixed(2)}</span>
```

### Pattern 3: Calculations
```typescript
// BEFORE
const price = parseFloat(website.guestPostCost) * 100;  // Convert to cents
// AFTER
const price = website.guestPostCost;  // Already in cents
```

### Pattern 4: Filters/Comparisons
```typescript
// BEFORE
WHERE guest_post_cost <= 150  // Comparing dollars
// AFTER  
WHERE guest_post_cost <= 15000  // Comparing cents
```

---

## FILES REQUIRING CHANGES (117 Total)

### 🔴 PRIORITY 1: Database & Core Services (10 files)