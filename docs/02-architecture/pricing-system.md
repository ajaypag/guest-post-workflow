# Pricing System Documentation

> **Last Updated**: 2025-08-08  
> **Status**: ✅ Functional  
> **Model**: Service Fee + Volume Discounts

## Overview

The system uses a service fee model where clients pay wholesale cost plus a $79 service fee per link. Volume discounts are applied automatically based on quantity, with support for both global and client-specific pricing rules.

## Pricing Model

### Core Formula
```
Client Price = Wholesale Price + Service Fee ($79)
Wholesale Price = Retail Price × 0.6 (40% margin)
```

### Service Fee
- **Fixed**: $79 per link (7900 cents)
- **Applied**: To every guest post link
- **Non-discountable**: Service fee remains constant regardless of volume

## Pricing Components

### 1. Domain Pricing
**Source**: Airtable-synced `websites` table  
**Fields**:
- `guestPostCost`: Retail price from Airtable
- `domainRating`: DR metric for filtering
- `totalTraffic`: Traffic metric for filtering

**Price Calculation**:
```typescript
// From pricingService.ts
const retailPrice = website.guestPostCost;
const wholesalePrice = Math.floor(retailPrice * 0.6); // 40% margin
const clientPrice = wholesalePrice + SERVICE_FEE;
```

### 2. Volume Discounts
**Table**: `pricing_rules`  
**Structure**:
```sql
pricing_rules {
  id: UUID
  name: string
  clientId: UUID (null for global)
  minQuantity: integer
  maxQuantity: integer (null for unlimited)
  discountPercent: decimal
  active: boolean
}
```

**Standard Tiers**:
- 5-9 links: 5% discount
- 10-19 links: 10% discount  
- 20+ links: 15% discount

**Application**:
1. Check for client-specific rules first
2. Fall back to global rules if none found
3. Apply discount to subtotal (before service fees)

### 3. Pricing Estimator
**Component**: `PricingEstimator.tsx`  
**Purpose**: Real-time pricing estimates based on filters

**Filter Options**:
- **Price Range**: <$50, <$100, <$200, <$300, $300+
- **Domain Rating**: 20+, 30+, 40+, 50+, 60+, 70+
- **Traffic**: 100+, 500+, 1K+, 5K+, 10K+, 25K+
- **Categories**: Dynamic from database
- **Niches**: Technology, Health, Finance, etc.

**API Response**:
```json
{
  "count": 125,
  "wholesaleMedian": 15000,
  "wholesaleAverage": 18500,
  "wholesaleMin": 5000,
  "wholesaleMax": 45000,
  "clientMedian": 22900,  // wholesale + service fee
  "clientAverage": 26400,
  "clientMin": 12900,
  "clientMax": 52900,
  "examples": [
    {
      "domain": "example.com",
      "dr": 45,
      "traffic": 5000,
      "wholesalePrice": 15000,
      "clientPrice": 22900
    }
  ]
}
```

## Pricing Packages

### Pre-configured Options
From order interface redesign:

1. **Bronze Package**
   - 5-10 links
   - Lower DR sites (20-40)
   - Budget-friendly option

2. **Silver Package**
   - 10-20 links
   - Medium DR sites (30-50)
   - Balanced approach

3. **Gold Package**
   - 20+ links
   - High DR sites (40+)
   - Premium placement

4. **Custom Package**
   - Flexible quantity
   - Custom requirements
   - Negotiated pricing

## API Endpoints

### Price Calculation
```typescript
// Get single domain price
GET /api/domains/[domain]/price
Response: {
  retailPrice: 25000,
  wholesalePrice: 15000,
  clientPrice: 22900,
  domainRating: 45,
  traffic: 5000
}

// Bulk pricing
POST /api/orders/calculate-pricing
Body: {
  domains: ["site1.com", "site2.com"],
  quantity: 10,
  clientId?: "uuid"
}
Response: {
  subtotal: 150000,
  serviceFees: 79000,
  discount: { percent: 10, amount: 15000 },
  total: 214000
}
```

### Pricing Estimation
```typescript
POST /api/orders/estimate-pricing
Body: {
  drRange: [30, 70],
  minTraffic: 1000,
  categories: ["Technology"],
  linkCount: 15
}
Response: {
  count: 250,
  wholesaleAverage: 18500,
  clientAverage: 26400,
  estimatedTotal: 396000
}
```

## Database Schema

### Websites Table (Pricing Source)
```sql
websites {
  id: UUID
  domain: string
  guestPostCost: decimal  -- Retail price from Airtable
  domainRating: integer
  totalTraffic: integer
  category: string
  websiteType: string
  niche: string
}
```

### Orders Table (Pricing Storage)
```sql
orders {
  -- Pricing snapshot at order time
  totalPrice: integer (cents)
  wholesalePrice: integer
  discountAmount: integer
  serviceFees: integer
  
  -- Applied rules
  pricingRuleId: UUID
  discountPercent: decimal
  
  -- Price components (JSON)
  priceSnapshot: {
    items: [{ domain, wholesale, retail, service }],
    discount: { percent, amount, ruleName },
    totals: { subtotal, discount, serviceFees, total }
  }
}
```

### Order Groups (Item-level Pricing)
```sql
order_groups {
  linkCount: integer
  pricePerLink: integer
  totalPrice: integer
  wholesalePrice: integer
}
```

## Implementation Details

### Service Layer
**File**: `lib/services/pricingService.ts`

**Key Methods**:
```typescript
class PricingService {
  // Get price for single domain
  static async getDomainPrice(domain: string): Promise<PriceInfo>
  
  // Bulk pricing for multiple domains
  static async getBulkDomainPrices(domains: string[]): Promise<Map<string, PriceInfo>>
  
  // Calculate volume discount
  static async calculateDiscount(
    quantity: number,
    subtotal: number,
    clientId?: string
  ): Promise<DiscountInfo>
  
  // Format price for display
  static formatPrice(cents: number): string
  
  // Calculate margin percentage
  static calculateMarginPercent(retail: number, wholesale: number): number
}
```

### React Component
**File**: `components/orders/PricingEstimator.tsx`

**Features**:
- Real-time filtering and estimation
- Smart filter presets
- Dynamic category/niche loading
- Responsive design
- Loading states and error handling

**Usage**:
```tsx
<PricingEstimator
  onEstimateChange={(estimate, preferences) => {
    // Handle estimate update
  }}
  initialPreferences={{
    drRange: [30, 70],
    minTraffic: 1000,
    categories: ["Technology"],
    linkCount: 15
  }}
/>
```

## Common Issues & Solutions

### 1. Domain Not Found
**Issue**: Price returns 0 for known domain  
**Cause**: Domain format mismatch  
**Solution**: Service automatically tries variations:
- Base domain: `example.com`
- With www: `www.example.com`
- Without www: `example.com`

### 2. Discount Not Applied
**Issue**: Volume discount not calculating  
**Check**:
```sql
-- Verify pricing rules exist
SELECT * FROM pricing_rules 
WHERE client_id IS NULL 
ORDER BY min_quantity;

-- Check specific client rules
SELECT * FROM pricing_rules 
WHERE client_id = 'client-uuid';
```

### 3. Price Sync Issues
**Issue**: Prices outdated from Airtable  
**Solution**: Run Airtable sync
```bash
POST /api/airtable/sync
```

## Configuration

### Environment Variables
```env
# No specific pricing env vars needed
# Pricing rules configured in database
```

### Default Configuration
```typescript
// constants.ts
export const PRICING_CONFIG = {
  SERVICE_FEE_CENTS: 7900,  // $79
  WHOLESALE_MARGIN: 0.6,     // 40% margin
  DEFAULT_DISCOUNTS: {
    5: 5,   // 5+ links = 5% off
    10: 10, // 10+ links = 10% off
    20: 15  // 20+ links = 15% off
  }
};
```

## Testing Pricing

### Manual Testing
```bash
# Test single domain pricing
curl /api/domains/techcrunch.com/price

# Test bulk calculation
curl -X POST /api/orders/calculate-pricing \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["site1.com", "site2.com"],
    "quantity": 10
  }'

# Test estimation
curl -X POST /api/orders/estimate-pricing \
  -H "Content-Type: application/json" \
  -d '{
    "drRange": [30, 70],
    "minTraffic": 1000,
    "linkCount": 15
  }'
```

### Common Scenarios
1. **Small Order (3 links)**
   - No volume discount
   - Each link = wholesale + $79

2. **Medium Order (10 links)**
   - 10% discount on wholesale
   - Service fees not discounted

3. **Large Order (25 links)**
   - 15% discount on wholesale
   - Significant savings vs individual

4. **Client-Specific (Custom)**
   - Check `pricing_rules` for client
   - May have special rates

## Future Improvements

### Planned
1. Dynamic service fee configuration
2. Tiered service fees for volume
3. Package deal automation
4. Real-time competitor pricing
5. Margin optimization algorithms

### Under Consideration
1. Currency conversion support
2. Tax calculation integration
3. Payment plan options
4. Seasonal pricing adjustments
5. A/B testing for pricing

## Monitoring & Analytics

### Key Metrics
- Average order value
- Discount utilization rate
- Margin by domain/category
- Price elasticity analysis
- Conversion by price point

### Queries
```sql
-- Average order value
SELECT AVG(total_price) / 100 as avg_order_value
FROM orders
WHERE status = 'completed';

-- Discount effectiveness
SELECT 
  discount_percent,
  COUNT(*) as orders,
  AVG(total_price) / 100 as avg_value
FROM orders
GROUP BY discount_percent;

-- Margin analysis
SELECT 
  AVG((total_price - wholesale_price) / total_price) as avg_margin
FROM orders
WHERE status = 'completed';
```

---

**Note**: Pricing system is functional but uses hardcoded service fee. Future updates should make this configurable via admin interface.