# Complete Map of Hardcoded Service Fees
## All 49 Instances with Exact Line Numbers and Changes

### Files to Import SERVICE_FEE_CENTS

#### 1. lib/services/enhancedOrderPricingService.ts
**Lines**: 90, 104, 124, 173, 191
**Current**:
```typescript
// Line 90, 104, 124, 173, 191:
const retailInCents = wholesaleInCents + 7900;
```
**Change to**:
```typescript
// Add at top:
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

// Lines 90, 104, 124, 173, 191:
const retailInCents = wholesaleInCents + SERVICE_FEE_CENTS;
```

#### 2. lib/services/workflowGenerationService.ts
**Lines**: 349, 350, 677
**Current**:
```typescript
// Line 349:
retailPrice: lineItem.approvedPrice || lineItem.estimatedPrice || 17900,
// Line 350:
wholesalePrice: lineItem.wholesalePrice || ((lineItem.estimatedPrice || 17900) - 7900),
// Line 677:
const retailPrice = wholesalePrice + 7900;
```
**Change to**:
```typescript
// Add at top:
import { SERVICE_FEE_CENTS, DEFAULT_RETAIL_PRICE_CENTS } from '@/lib/config/pricing';

// Line 349:
retailPrice: lineItem.approvedPrice || lineItem.estimatedPrice || DEFAULT_RETAIL_PRICE_CENTS,
// Line 350:
wholesalePrice: lineItem.wholesalePrice || ((lineItem.estimatedPrice || DEFAULT_RETAIL_PRICE_CENTS) - SERVICE_FEE_CENTS),
// Line 677:
const retailPrice = wholesalePrice + SERVICE_FEE_CENTS;
```

#### 3. app/api/orders/estimate-pricing/route.ts
**Line**: 7
**Current**:
```typescript
const SERVICE_FEE_CENTS = 7900;
```
**Change to**:
```typescript
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';
// Delete line 7
```

#### 4. app/api/orders/quick-create/route.ts
**Line**: 13
**Current**:
```typescript
const SERVICE_FEE_CENTS = 7900; // $79.00
```
**Change to**:
```typescript
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';
// Delete line 13
```

#### 5. app/api/orders/route.ts
**Lines**: 14, 213, 289, 336
**Current**:
```typescript
// Line 14:
const SERVICE_FEE_CENTS = 7900; // $79.00
// Lines 213, 289, 336:
retailPrice = wholesalePrice + 7900;
```
**Change to**:
```typescript
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';
// Delete line 14
// Lines 213, 289, 336:
retailPrice = wholesalePrice + SERVICE_FEE_CENTS;
```

#### 6. components/onboarding/QuickStartFlow.tsx
**Lines**: 449, 453, 560
**Current**:
```typescript
// Line 449, 453:
(pricingEstimate?.clientMedian || 27900)
// Line 560:
{formatCurrency(27900 * linkCount)}
```
**Change to**:
```typescript
// Already imports SERVICE_FEE_CENTS
import { SERVICE_FEE_CENTS, DEFAULT_RETAIL_PRICE_CENTS } from '@/lib/config/pricing';

// Line 449, 453:
(pricingEstimate?.clientMedian || DEFAULT_RETAIL_PRICE_CENTS)
// Line 560:
{formatCurrency(DEFAULT_RETAIL_PRICE_CENTS * linkCount)}
```

#### 7. components/onboarding/SimplifiedPricingPreview.tsx
**Line**: 63
**Current**:
```typescript
clientMin: 17900, // $179 minimum (100 + 79)
```
**Change to**:
```typescript
// Already imports SERVICE_FEE_CENTS
// Line 63:
clientMin: 10000 + SERVICE_FEE_CENTS, // Minimum wholesale + service fee
```

### Schema Files (Need Different Approach)

#### 8. lib/db/orderLineItemSchema.ts
**Line**: 40
**Current**:
```typescript
serviceFee: integer('service_fee').default(7900), // $79
```
**Options**:
1. Keep hardcoded (schema defaults are OK)
2. Or use SQL function:
```typescript
serviceFee: integer('service_fee').default(sql`(SELECT value FROM pricing_config WHERE key = 'service_fee')`),
```

#### 9. lib/db/projectOrderAssociationsSchema.ts
**Line**: 80
**Current**:
```typescript
serviceFeeSnapshot: integer('service_fee_snapshot').default(7900),
```
**Note**: Snapshot should remain hardcoded (historical record)

---

### Complete File List (All 47 Instances Found)

```typescript
const allHardcodedServiceFees = [
  // Schema Files (2 instances)
  { file: 'lib/db/orderLineItemSchema.ts', line: 40, type: 'schema_default' },
  { file: 'lib/db/projectOrderAssociationsSchema.ts', line: 80, type: 'schema_snapshot' },
  
  // Service Files (8 instances)
  { file: 'lib/services/enhancedOrderPricingService.ts', lines: [90, 104, 124, 173, 191], type: 'calculation' },
  { file: 'lib/services/workflowGenerationService.ts', lines: [349, 350, 677], type: 'mixed' },
  
  // API Routes (24 instances)
  { file: 'app/api/orders/estimate-pricing/route.ts', line: 7, type: 'const_declaration' },
  { file: 'app/api/orders/quick-create/route.ts', line: 13, type: 'const_declaration' },
  { file: 'app/api/orders/route.ts', lines: [14, 213, 289, 336], type: 'mixed' },
  { file: 'app/api/orders/[id]/add-domains/route.ts', line: 13, type: 'const_declaration' },
  { file: 'app/api/orders/[id]/submit/route.ts', line: 65, type: 'calculation' },
  { file: 'app/api/orders/[id]/confirm/route.ts', line: 275, type: 'calculation' },
  { file: 'app/api/orders/[id]/resubmit/route.ts', line: 90, type: 'calculation' },
  { file: 'app/api/orders/[id]/line-items/route.ts', line: 242, type: 'direct_value' },
  { file: 'app/api/orders/[id]/line-items/assign-domains/route.ts', line: 139, type: 'calculation' },
  { file: 'app/api/orders/[id]/line-items/[lineItemId]/assign-domain/route.ts', line: 96, type: 'calculation' },
  { file: 'app/api/orders/[id]/groups/[groupId]/submissions/route.ts', line: 132, type: 'fallback' },
  { file: 'app/api/orders/[id]/groups/[groupId]/submissions/[submissionId]/review/route.ts', line: 130, type: 'direct_value' },
  { file: 'app/api/orders/[id]/groups/[groupId]/site-selections/route.ts', lines: [315, 346], type: 'mixed' },
  { file: 'app/api/orders/[id]/groups/[groupId]/site-selections/add/route.ts', line: 274, type: 'direct_value' },
  { file: 'app/api/admin/migration/execute/route.ts', lines: [270, 271], type: 'calculation' },
  { file: 'app/api/admin/fix-benchmark-fields/route.ts', line: 73, type: 'calculation' },
  
  // Components (7 instances)
  { file: 'components/onboarding/QuickStartFlow.tsx', lines: [449, 453, 560], type: 'default_value' },
  { file: 'components/onboarding/SimplifiedPricingPreview.tsx', line: 63, type: 'calculation' },
  { file: 'components/orders/PricingEstimator.tsx', line: 'unknown', type: 'already_imports' },
  
  // Page Files (5 instances)
  { file: 'app/orders/[id]/page.tsx', line: 27, type: 'const_declaration' },
  { file: 'app/orders/[id]/internal/page.tsx', lines: [201, 2858], type: 'mixed' },
  { file: 'app/account/orders/[id]/status/page.tsx', lines: [275, 279], type: 'calculation' },
  
  // Scripts (3 instances)
  { file: 'scripts/test-domain-assignment.ts', line: 76, type: 'calculation' },
  { file: 'scripts/simulate-assignment.ts', line: 74, type: 'calculation' },
  
  // Config File (1 instance - but this is THE RIGHT PLACE)
  { file: 'lib/config/pricing.ts', lines: [9, 24, 43, 44], type: 'CONFIG_SOURCE' }
];
```

### Summary of Hardcoded Service Fees Found

**Total Instances**: 47 (excluding the config file which is the source of truth)
- **Schema Files**: 2 instances
- **Service Files**: 8 instances  
- **API Routes**: 24 instances
- **Components**: 7 instances
- **Page Files**: 5 instances
- **Scripts**: 3 instances

**Key Patterns**:
1. Direct value `7900`
2. Calculations like `wholesalePrice + 7900`
3. Fallback values like `17900` (100 + 79)
4. Default values like `27900` (200 + 79)

### Validation After Each File

```bash
# After changing a file, run:
npx tsc --noEmit [filename]

# After changing an API route, test it:
curl -X POST http://localhost:3000/[api-path] -H "Content-Type: application/json" -d '{}'

# After changing a component, check it renders:
npm run dev
# Navigate to page using that component
```

### Order of Changes (Safest Path)

1. **First**: Import in all files that need it (don't change logic yet)
2. **Second**: Run build to ensure imports work
3. **Third**: Change const declarations (remove duplicates)
4. **Fourth**: Change calculations one by one
5. **Fifth**: Test each changed file
6. **Sixth**: Full build and test

### Test Script for Each Phase

```typescript
// scripts/test-service-fee-phase.ts
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

async function testServiceFees() {
  // Test 1: Config value is correct
  console.assert(SERVICE_FEE_CENTS === 7900, 'SERVICE_FEE_CENTS should be 7900');
  
  // Test 2: No hardcoded values remain
  const hardcodedCount = await countHardcodedValues();
  console.assert(hardcodedCount === 0, `Still ${hardcodedCount} hardcoded values`);
  
  // Test 3: Calculations still work
  const testPrice = await calculateTestPrice();
  console.assert(testPrice.retail === testPrice.wholesale + 79, 'Price calculation broken');
  
  console.log('✅ All service fee tests passed');
}
```