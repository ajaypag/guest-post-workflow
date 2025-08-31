# Pricing Migration Plan Requirements

## The Challenge

Moving from `guest_post_cost` (NUMERIC) to `publisher_offerings.base_price` (INTEGER) as the single source of truth, with no dual architecture fallback.

## Type of Plan Needed

### 1. Data Reconciliation Plan
**Purpose**: Fix all data issues BEFORE touching any code

Requirements:
- Script to create missing offerings for 107 websites
- Script to fix price mismatches for 96 websites  
- Decision matrix for conflicts (which price wins?)
- Validation that all 940 websites have correct offerings
- Backup strategy for rollback if needed

### 2. Abstraction Layer Plan
**Purpose**: Centralize pricing logic before migration

Requirements:
- Single pricing service that all code calls
- Handle format conversion (dollars ↔ cents) in ONE place
- Replace scattered conversion logic throughout 118+ files
- Ensure consistent rounding/precision rules

### 3. Incremental Migration Plan
**Purpose**: Switch from guest_post_cost to offerings gradually without breaking production

Requirements:
- Feature flag system to control which pricing source is used
- Ability to test with specific accounts/orders first
- Component-by-component migration strategy
- Parallel validation (compare both prices, alert on mismatch)

### 4. Testing Strategy Plan
**Purpose**: Ensure no pricing errors in production

Requirements:
- Unit tests for pricing conversions
- Integration tests for order flow
- Price comparison reports (old vs new)
- Test scenarios for edge cases:
  - Websites with no offerings
  - Mismatched prices
  - Null values
  - Extreme values (very high/low prices)

### 5. Rollout Plan
**Purpose**: Safe production deployment

Requirements:
- Phased rollout by component:
  - Phase 1: Read-only displays (website listings)
  - Phase 2: Pricing estimates
  - Phase 3: Order creation
  - Phase 4: Invoicing and payments
- Monitoring and alerting for price discrepancies
- Rollback procedure for each phase
- Customer communication if prices change

### 6. Code Migration Plan
**Purpose**: Update all 118+ files systematically

Requirements:
- Dependency graph (which files depend on which)
- Migration order (least risky → most critical)
- Code review checklist for each file
- Automated refactoring tools/scripts where possible

### 7. Database Migration Plan
**Purpose**: Eventually deprecate guest_post_cost field

Requirements:
- Timeline for deprecation (not immediate)
- Archive strategy for historical data
- Update all database views/functions
- Migration script with safety checks

## Critical Decisions Needed

### Format Standardization
- **Question**: Should we standardize everything to cents (INTEGER) or add decimal support to offerings?
- **Impact**: Affects every price display and calculation

### Service Fee Architecture  
- **Question**: How to make the $79 fee configurable without hardcoding?
- **Options**:
  - Pricing rules table
  - Configuration in offerings
  - Separate fee structure table

### Source of Truth During Conflicts
- **Question**: When prices don't match, which wins?
- **Options**:
  - Always use offering (might change customer prices)
  - Always use guest_post_cost (defeats migration purpose)
  - Manual review for each conflict

### Historical Data
- **Question**: What happens to existing orders using guest_post_cost?
- **Options**:
  - Keep for historical records only
  - Migrate to point to offerings
  - Create immutable price snapshots

## Risk Mitigation Requirements

### Data Risks
- Price changes affecting existing quotes
- Lost pricing history
- Currency conversion errors

### Code Risks  
- Missed conversions causing 100x pricing errors
- Display inconsistencies (showing cents as dollars)
- Calculation differences from rounding

### Business Risks
- Customer confusion from price changes
- Publisher payment mismatches
- Lost revenue from pricing errors

## Success Criteria

The plan must ensure:
1. Zero pricing errors in production
2. No customer-visible price changes (unless intentional)
3. All 940 websites correctly priced via offerings
4. No remaining dependencies on guest_post_cost
5. Clean, maintainable code without conversion hacks
6. Ability to fully remove guest_post_cost field

## Recommended Approach

### Phase 0: Data Cleanup (Week 1)
- Fix all 206 problem websites
- Validate all prices match
- Create comprehensive backup

### Phase 1: Abstraction Layer (Week 2)
- Build centralized pricing service
- Route all pricing through it
- Maintain guest_post_cost as source

### Phase 2: Shadow Mode (Week 3)
- Read from offerings in parallel
- Compare results, log discrepancies
- Fix any issues found

### Phase 3: Gradual Switch (Week 4-5)
- Component by component migration
- Start with low-risk areas
- Monitor each component for issues

### Phase 4: Cleanup (Week 6)
- Remove guest_post_cost references
- Delete conversion hacks
- Archive old field

## Next Steps

1. Get stakeholder approval on approach
2. Decide on critical questions above
3. Create detailed technical design
4. Build data cleanup scripts
5. Start Phase 0 execution

## Estimation

- **Total effort**: 6-8 weeks
- **Developer resources**: 1-2 full-time
- **Risk level**: High (pricing is critical)
- **Rollback capability**: Required at each phase