# Pricing Rules Extraction Patterns for ManyReach V3

## Overview
This document analyzes complex pricing patterns found in publisher emails and how to extract them into structured `publisherPricingRules` database records.

## Common Email Pricing Patterns

### 1. Bulk Discount Patterns
**Email Examples:**
- "5+ posts get 10% discount"
- "Order 10 articles and save 15%" 
- "Volume pricing: 3-5 posts: 5% off, 6-10 posts: 10% off, 11+ posts: 20% off"
- "Buy 5 get 1 free"
- "20% discount for orders over $1000"

**Database Structure:**
```json
{
  "ruleType": "bulk_discount",
  "ruleName": "Volume Discount 5+",
  "description": "10% discount for 5 or more posts",
  "conditions": {
    "type": "quantity",
    "operator": "gte", 
    "value": 5
  },
  "actions": {
    "adjustmentType": "percentage_discount",
    "adjustmentValue": 10
  },
  "priority": 10,
  "isCumulative": false,
  "autoApply": true
}
```

**Extraction Patterns:**
- Look for: "X+ posts", "X or more", "orders over $Y", "volume pricing"
- Parse quantities and percentages
- Handle ranges (3-5 posts vs 6-10 posts)
- Convert "buy X get Y free" to percentage discount

### 2. Niche Surcharge Patterns
**Email Examples:**
- "Finance and crypto posts are +$50 additional"
- "Cannabis/CBD content has 25% premium"
- "Tech startup articles: $300 instead of $200"
- "Legal posts require $100 surcharge"
- "YMYL (Your Money Your Life) content: +$75"

**Database Structure:**
```json
{
  "ruleType": "niche_surcharge",
  "ruleName": "Finance Premium",
  "description": "Additional charge for finance/crypto content",
  "conditions": {
    "type": "niche",
    "operator": "contains_any",
    "value": ["Finance", "Crypto", "Cryptocurrency", "Trading"]
  },
  "actions": {
    "adjustmentType": "fixed_markup",
    "adjustmentValue": 5000
  },
  "priority": 20,
  "isCumulative": true,
  "autoApply": true
}
```

**Extraction Patterns:**
- Look for: niche names + price modifiers
- Common niches: Finance, Crypto, CBD, Casino, Tech, Legal, Health, Real Estate
- Price expressions: "+$X", "additional $Y", "premium of Z%", "$A instead of $B"
- Handle synonym detection (crypto = cryptocurrency)

### 3. Position Pricing Patterns (Listicles)
**Email Examples:**
- "Listicle 1st position: $999, 2nd: $899, 3rd: $799"
- "Top 3 positions: $500, other positions: $300"
- "#1 spot premium: $200 extra"
- "Featured position (top of list): $450"

**Database Structure:**
```json
{
  "ruleType": "position_pricing",
  "ruleName": "Listicle 1st Position",
  "description": "Premium pricing for #1 position in listicles",
  "conditions": {
    "type": "position",
    "operator": "equals",
    "value": 1
  },
  "actions": {
    "adjustmentType": "override_price", 
    "finalPrice": 99900
  },
  "priority": 30,
  "isCumulative": false,
  "autoApply": true
}
```

**Extraction Patterns:**
- Look for: "1st position", "#1 spot", "top position", "featured"
- Parse position numbers and associated prices
- Handle ordinals (1st, 2nd, 3rd) vs cardinals (1, 2, 3)
- Detect "top X" ranges

### 4. Express/Rush Service Patterns
**Email Examples:**
- "Rush delivery in 24 hours for +$75"
- "Express service (48hr): +50% of base price"
- "Same-day publishing: $100 surcharge"
- "Priority queue: additional $25"

**Database Structure:**
```json
{
  "ruleType": "express_service",
  "ruleName": "24HR Rush Delivery",
  "description": "Express delivery within 24 hours",
  "conditions": {
    "type": "turnaround",
    "operator": "lte",
    "value": 1
  },
  "actions": {
    "adjustmentType": "fixed_markup",
    "adjustmentValue": 7500
  },
  "priority": 15,
  "isCumulative": true,
  "autoApply": false
}
```

### 5. Seasonal/Time-based Patterns
**Email Examples:**
- "Holiday pricing: +20% Nov-Dec"
- "Black Friday special: 30% off this week"
- "Summer rates apply June-August"
- "Peak season surcharge: $50 extra"

**Database Structure:**
```json
{
  "ruleType": "seasonal",
  "ruleName": "Holiday Surcharge", 
  "description": "20% increase during holiday season",
  "conditions": {
    "type": "date_range",
    "operator": "between",
    "value": {"start": "11-01", "end": "12-31"}
  },
  "actions": {
    "adjustmentType": "percentage_markup",
    "adjustmentValue": 20
  },
  "validFrom": "2024-11-01T00:00:00Z",
  "validUntil": "2024-12-31T23:59:59Z"
}
```

### 6. Package Deal Patterns
**Email Examples:**
- "Guest post + social shares: $250 (normally $300)"
- "Article + email promotion bundle: $200"
- "Content + backlinks package: 15% savings"
- "Full service package (post + social + email): $500"

**Database Structure:**
```json
{
  "ruleType": "package_deal",
  "ruleName": "Guest Post + Social Bundle",
  "description": "Combined guest post with social media promotion",
  "conditions": {
    "type": "services",
    "operator": "includes_all",
    "value": ["guest_post", "social_shares"]
  },
  "actions": {
    "adjustmentType": "fixed_discount",
    "adjustmentValue": 5000
  }
}
```

## Complex Pattern Recognition

### Multi-Condition Rules
**Email Example:**
"Finance posts over 1000 words get $100 surcharge, but 5+ finance posts get 10% volume discount"

**Extraction Logic:**
1. Create niche surcharge rule for Finance
2. Create bulk discount rule for 5+ posts  
3. Set `isCumulative: true` on both
4. Set priorities to ensure proper application order

### Tiered Pricing Structures
**Email Example:**
"Pricing tiers: 1-2 posts: $200 each, 3-5 posts: $180 each, 6+ posts: $160 each"

**Extraction Strategy:**
- Create multiple bulk discount rules
- Use quantity ranges in conditions
- Each tier becomes separate rule with appropriate priority

### Conditional Modifiers
**Email Example:** 
"Standard rate $150, but finance posts $200, unless ordering 10+ then finance is $175"

**Rule Hierarchy:**
1. Base price: $150
2. Finance surcharge: +$50 (priority 20)
3. Bulk discount for finance: override to $175 for 10+ (priority 10, higher priority = applied first)

## Extraction Algorithm

### Step 1: Text Pattern Recognition
```regex
Bulk Patterns: /(\d+)[\+\s]*(posts?|articles?).*?(\d+)%?\s*(off|discount|savings?)/i
Niche Patterns: /(finance|crypto|cbd|casino|tech|legal).*?[\+\$](\d+)/i  
Position Patterns: /(\d+)(st|nd|rd|th)\s*position.*?\$(\d+)/i
Express Patterns: /(rush|express|priority|same.day).*?[\+\$](\d+)/i
```

### Step 2: Price Parsing
- Extract dollar amounts: `$150`, `$1,200`, `€200`
- Convert to cents: `$150` → `15000`
- Handle percentages: `15% off`, `+20%`
- Parse ranges: `$200-300` → base: 200, max: 300

### Step 3: Condition Building
- Map text to structured conditions
- Handle operators: gte, lte, equals, contains, between
- Normalize values (quantities, dates, categories)

### Step 4: Action Generation  
- Determine adjustment type based on pattern
- Calculate adjustment values in cents
- Set appropriate cumulative/priority flags

## Edge Cases & Validation

### Ambiguous Patterns
- "Volume pricing available" (no specific amounts)
- "Bulk discounts apply" (vague)
- "Special rates for partners" (conditional)

**Handling:** Flag as low confidence, store raw text for manual review

### Conflicting Rules
- Multiple discount structures mentioned
- Contradictory pricing information  
- Unclear precedence

**Handling:** Create multiple rules, let admin choose during review

### Currency Conversion
- Handle EUR, GBP, CAD in addition to USD
- Store original currency, convert to cents appropriately
- Flag for manual review if unsupported currency

## Prompt Engineering Strategy

### Context Provision
- Provide comprehensive examples of each rule type
- Show proper condition/action structure
- Emphasize cents conversion and priority setting

### Instruction Clarity
- Be explicit about rule hierarchy  
- Explain cumulative vs non-cumulative rules
- Define when to create multiple rules vs single complex rule

### Validation Requirements
- Always include raw text that generated the rule
- Provide confidence scores for each rule
- Flag rules that need manual review

## Next Steps
1. Integrate these patterns into comprehensive V3 parser prompt
2. Build rule validation logic in draft UI
3. Create admin interface for rule review and editing
4. Test against sample publisher emails with complex pricing