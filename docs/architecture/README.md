# PostFlow Architecture Documentation

## Core Documents (Current Vision)

### 🎯 Primary Architecture
- **[ACCOUNT_PLATFORM_ARCHITECTURE.md](./ACCOUNT_PLATFORM_ARCHITECTURE.md)** - Complete platform vision and user experience design
- **[ORDER_SCHEMA_DESIGN.md](./ORDER_SCHEMA_DESIGN.md)** - Database schema and API design for order-centric system

### 📋 Implementation Plan
- **[../PRD_ORDER_MANAGEMENT.md](../PRD_ORDER_MANAGEMENT.md)** - Feature requirements, UI standards, and implementation checklist

## Supporting Documents

### 🚀 Implementation Plans
- **[ORDER_SYSTEM_REPLACEMENT_PLAN.md](./ORDER_SYSTEM_REPLACEMENT_PLAN.md)** - Step-by-step plan for replacing current order system

### 🔄 Migration Reference  
- **[ACCOUNT_MIGRATION_PLAN.md](./ACCOUNT_MIGRATION_PLAN.md)** - Simple advertiser→account renaming (Phase 1 only)

## Key Principles

1. **Order-Centric Experience** - Accounts access everything through their orders
2. **One Flexible System** - Handles 1 client or 10 clients naturally via order groups  
3. **Full Transparency** - Accounts see ALL analyzed sites, can browse and select alternatives
4. **Behind-the-Curtain Visibility** - Competitive advantage, not operational complexity
5. **Clean Separation** - Internal operations vs account-facing features

## Current Status

- ✅ Phase 1: Database migration (advertiser→account) completed
- 🔄 Phase 2: Need to implement order-centric schema (order_groups, order_site_selections)
- ⏳ Phase 3: Build account experience UI
- ⏳ Phase 4: Launch and testing

## Next Steps

Focus on ORDER_SCHEMA_DESIGN.md implementation - this is the foundation for the entire account platform experience.