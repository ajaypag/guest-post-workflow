# Pricing Standardization Documentation

## 📄 Implementation Guides

### Active Documents
- **[PRICING-MIGRATION-FINAL.md](./PRICING-MIGRATION-FINAL.md)** - Complete implementation guide for pricing migration
- **[COMPLETE-CENTS-CONVERSION-PLAN.md](./COMPLETE-CENTS-CONVERSION-PLAN.md)** - Line-by-line file changes (117 files)

### Reference Only
- **[IMPLEMENTATION-NOTES.md](./IMPLEMENTATION-NOTES.md)** - Historical context from pricing fixes

## ⚠️ For AI/Developers

**USE ONLY:**
1. `PRICING-MIGRATION-FINAL.md` - Main implementation guide
2. `COMPLETE-CENTS-CONVERSION-PLAN.md` - Specific file changes

**DO NOT USE:**
- Files in `/legacy` folder - outdated planning documents
- CSV files - raw data exports

## Current Status

- ✅ Phase 0: Publisher data cleanup (COMPLETE)
- 🔄 Phase 1: Data reconciliation (98 mismatches to fix)
- ⏳ Phase 2: Convert guest_post_cost to cents (117 files)
- ⏳ Phase 3: Implement database triggers
- ⏳ Phase 4: Centralize service fee configuration

## Quick Facts

- **Problem**: `guest_post_cost` in dollars, `base_price` in cents
- **Solution**: Standardize everything to cents
- **Impact**: 117 files need updates
- **Service Fee**: $79 hardcoded in 50+ places