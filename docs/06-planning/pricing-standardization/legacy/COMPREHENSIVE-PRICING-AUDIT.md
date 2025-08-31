# Comprehensive Pricing Audit: $79 Service Fee & guest_post_cost Conversions

**Audit Date**: August 31, 2025  
**Status**: Production System Analysis  
**Scope**: Complete codebase analysis for pricing standardization

## Executive Summary

This comprehensive audit reveals two critical pricing issues affecting **118+ files** across the codebase:

1. **$79 Service Fee**: Hardcoded in **50+ locations** with inconsistent implementations
2. **guest_post_cost Conversions**: Mixed dollar/cent handling across **100+ files** creating confusion

**Impact**: These issues create maintenance nightmares, inconsistent pricing displays, and potential billing errors.

## 1. $79 Service Fee Audit Results

### Configuration & Constants

**✅ CENTRALIZED (Recently Added)**
- `/lib/config/pricing.ts` - Main configuration with SERVICE_FEE_CENTS = 7900

**❌ HARDCODED INSTANCES FOUND**

#### Database Schema (6 locations)
```sql
-- Migration files with hardcoded defaults
migrations/0027_add_order_line_items.sql:30    DEFAULT 7900
migrations/0026_add_price_snapshot_columns.sql:7    DEFAULT 7900 
migrations/0055_fix_order_line_items_schema.sql:8    DEFAULT 7900
migrations/0056_production_lineitems_migration.sql:11    DEFAULT 7900
lib/db/orderLineItemSchema.ts:40    default(7900)
lib/db/projectOrderAssociationsSchema.ts:80    default(7900)
```

#### Services (5 major services)
```typescript
// lib/services/enhancedOrderPricingService.ts (5 instances)
const retailInCents = wholesaleInCents + 7900; // Lines 90, 104, 124, 173, 191

// lib/services/workflowGenerationService.ts (2 instances) 
wholesalePrice: lineItem.wholesalePrice || ((lineItem.estimatedPrice || 17900) - 7900)
const retailPrice = wholesalePrice + 7900;

// lib/services/pricingService.ts (1 instance - MIXING UNITS!)
const retailPrice = wholesalePrice + 79; // Adding dollars to dollars!
```

#### API Routes (12+ endpoints)
```typescript
// Examples of hardcoded 7900 in API routes:
app/api/orders/route.ts:14                const SERVICE_FEE_CENTS = 7900;
app/api/orders/[id]/add-domains/route.ts:13    const SERVICE_FEE_CENTS = 7900;
app/api/orders/estimate-pricing/route.ts:7     const SERVICE_FEE_CENTS = 7900;
app/api/orders/quick-create/route.ts:13        const SERVICE_FEE_CENTS = 7900;

// And 8+ more API endpoints with local constants
```

#### Pages & Components (15+ locations)
```typescript
// app/orders/[id]/page.tsx:27
const SERVICE_FEE_CENTS = 7900; // Local definition

// app/orders/[id]/edit/page.tsx - Uses imported version correctly

// Multiple calculation sites:
app/account/orders/[id]/status/page.tsx:275    - 7900 * order.orderGroups...
app/orders/[id]/internal/page.tsx:201          7900 * linkCount;
```

### ⚠️ CRITICAL UNIT MIXING BUG
**File**: `lib/services/pricingService.ts:68`
```typescript
const wholesalePrice = website.guestPostCost ? parseFloat(website.guestPostCost) : 0;
const retailPrice = wholesalePrice + 79; // BUG: Adding $79 to dollars instead of 7900 cents!
```

This will cause **massive undercharging** when this service is used!

## 2. guest_post_cost Conversion Patterns Audit

### Database Field Definition
```sql
-- websiteSchema.ts:15
guestPostCost: decimal('guest_post_cost', { precision: 10, scale: 2 })
-- Stores DOLLARS (e.g., 150.00)
```

### Conversion Patterns Found

#### ✅ CORRECT Conversions (dollars → cents)
```typescript
// components/orders/FilterBar.tsx:180
parseFloat(e.target.value) * 100

// components/orders/PricingEstimator.tsx:179-180  
parseInt(customPriceMin) * 100
parseInt(customPriceMax) * 100

// lib/config/pricing.ts:66 (parseToCents function)
Math.round(parseFloat(cleaned) * 100)
```

#### ❌ PROBLEMATIC Conversions (inconsistent expectations)
```typescript
// lib/services/pricingService.ts:66 - CORRECT parsing
const wholesalePrice = website.guestPostCost ? parseFloat(website.guestPostCost) : 0;
// But then INCORRECT service fee addition (see above)

// Multiple scripts expect dollars:
scripts/simulate-assignment.ts:73    Number(website.guestPostCost) * 100
scripts/find-email-price-mismatches.ts:47    site.guestPostCost  // expects dollars
```

### Display Formatting Audit

#### ✅ CENTRALIZED FORMATTING
```typescript
// lib/utils/formatting.ts:1 - Main formatter
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// lib/config/pricing.ts:59 - Alternative formatter  
formatPrice: (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
}
```

#### ❌ LOCAL FORMATTERS (30+ instances)
Many components define their own formatters instead of using centralized ones:
```typescript
// Examples of duplicate formatting logic:
components/demo/MarketIntelligenceDemo.tsx:62
components/OrdersTableMultiClient.tsx (inline)
components/publisher/PricingRuleBuilder.tsx:236
// ... 27+ more instances
```

## 3. API Response Analysis

### Guest Post Cost in API Responses

#### Database Queries (expect dollars)
```typescript
// lib/services/vettedSitesEmailService.ts:81
guestPostCost: websites.guestPostCost,  // Returns NUMERIC as string

// components/internal/InternalWebsitesList.tsx:36
guestPostCost: string | null; // DECIMAL field comes as string
```

#### Conversion Handling
```typescript
// lib/services/vettedSitesEmailService.ts:109
cost: d.guestPostCost ? Number(d.guestPostCost) : undefined,
// Correctly converts string to number (dollars)

// lib/services/publisherClaimingService.ts:330  
$${claim.website.guestPostCost || 'N/A'} // Direct display (assumes dollars)
```

## 4. Migration Impact Assessment

### Files Requiring Updates for SERVICE_FEE Centralization

#### High Priority (Business Logic - 15 files)
1. **Services** (5 files):
   - `lib/services/enhancedOrderPricingService.ts` - 5 instances
   - `lib/services/workflowGenerationService.ts` - 2 instances  
   - `lib/services/pricingService.ts` - 1 instance ⚠️ UNIT BUG
   - Plus 2 others

2. **API Routes** (12 files):
   - All define local `SERVICE_FEE_CENTS = 7900`
   - Should import from central config

3. **Pages/Components** (8 files):
   - Mix of local definitions and calculations
   - Some use imports correctly, others don't

#### Medium Priority (Database Defaults - 6 files)
- Migration files: Could stay as-is (historical)
- Schema files: Update defaults to use imported constant

### Files Requiring Updates for guest_post_cost Standardization

#### Database Interaction Layer (33 files)
Files that read `guest_post_cost` from database:
- All expect DECIMAL field (dollars)
- All need to handle string→number conversion
- Many need cents conversion for display

#### TypeScript Interfaces (10+ files)
```typescript
// Current inconsistency:
guestPostCost: string | null;      // Database field (string)
guestPostCost?: number;            // API interfaces (number)  
guestPostCost: Float?              // Prisma schema (float)
```

## 5. Centralization Assessment

### What IS Centralized ✅
- `formatCurrency()` function in `lib/utils/formatting.ts`
- `SERVICE_FEE_CENTS` export from `lib/config/pricing.ts`
- Main pricing config in `PRICING_CONFIG` object

### What Is NOT Centralized ❌
- **50+ hardcoded 7900 values** throughout codebase
- **30+ local currency formatting functions**
- **Mixed unit handling** (dollars vs cents)
- **Inconsistent conversion patterns**

## 6. Recommendations

### Phase 1: Fix Critical Bugs (Immediate)
1. **Fix pricingService.ts unit bug**:
   ```typescript
   // Change line 68 from:
   const retailPrice = wholesalePrice + 79;
   // To:  
   const retailPrice = wholesalePrice + (SERVICE_FEE_CENTS / 100);
   ```

### Phase 2: Centralize Service Fee (1-2 weeks)
1. **Update all services**: Replace hardcoded 7900 with `SERVICE_FEE_CENTS` import
2. **Update all API routes**: Remove local constants, use imports
3. **Update components**: Remove local definitions
4. **Database schemas**: Use imported constant for defaults

### Phase 3: Standardize guest_post_cost Handling (2-3 weeks)  
1. **Create conversion utilities**:
   ```typescript
   // New utility functions needed:
   export const dollarsTocents = (dollars: number) => Math.round(dollars * 100);
   export const guestPostCostToWholesaleCents = (gpcString: string) => 
     dollarsTocents(parseFloat(gpcString || '0'));
   ```

2. **Update database interaction layer**: Standardize all `guest_post_cost` reads
3. **Consolidate formatting**: Remove duplicate formatters, use centralized ones
4. **Fix TypeScript interfaces**: Make types consistent

### Phase 4: Cents Migration (Future)
- Migrate `guest_post_cost` to cents in database
- Update all affected queries and interfaces
- Requires coordination with Airtable sync

## 7. Test Strategy

### Critical Test Cases
1. **Pricing calculations** with various guest_post_cost values
2. **Service fee application** across different order types  
3. **Display formatting** consistency across all interfaces
4. **API responses** maintain correct pricing data
5. **Database queries** handle DECIMAL→string→number conversions

### Regression Testing Required
- All order creation flows
- Pricing estimation APIs
- Invoice generation
- Publisher payment calculations
- Display components across the app

---

## Files Inventory

### SERVICE_FEE Related (50+ files total)
**Centralized Config**: 1 file  
**Hardcoded Services**: 5 files  
**Hardcoded APIs**: 12 files  
**Hardcoded Components**: 8+ files  
**Database Schemas**: 6 files  
**Migration Files**: 6 files (historical)

### guest_post_cost Related (100+ files total)
**Database Queries**: 33 files  
**Display Components**: 30+ files  
**API Responses**: 15+ files  
**TypeScript Interfaces**: 10+ files  
**Conversion Logic**: 15+ files

### Total Impact
**118+ unique files** require attention for complete pricing standardization.

---

*This audit reveals the pricing system is functional but scattered. Centralizing these patterns will improve maintainability, reduce bugs, and enable advanced pricing features.*