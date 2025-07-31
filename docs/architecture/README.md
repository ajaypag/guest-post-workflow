# PostFlow Architecture Documentation

## Core Documents (Current Vision)

### 🎯 Primary Architecture
- **[ACCOUNT_PLATFORM_ARCHITECTURE.md](./ACCOUNT_PLATFORM_ARCHITECTURE.md)** - Complete platform vision and user experience design
- **[ORDER_SCHEMA_DESIGN.md](./ORDER_SCHEMA_DESIGN.md)** - Database schema and API design for order-centric system
- **[ORDER_SYSTEM_IMPLEMENTATION.md](./ORDER_SYSTEM_IMPLEMENTATION.md)** - Complete implementation guide with data flow, UI components, and critical details

### 📋 Implementation Plan
- **[../PRD_ORDER_MANAGEMENT.md](../PRD_ORDER_MANAGEMENT.md)** - Feature requirements, UI standards, and implementation checklist

## Supporting Documents

### 🔒 Security & Authentication
- **[CLIENT_SECURITY_IMPLEMENTATION.md](./CLIENT_SECURITY_IMPLEMENTATION.md)** - Security pattern for client management and shared interfaces
- **[USER_TYPES.md](./USER_TYPES.md)** - User type definitions and permissions

### 🚀 Implementation Reference
- **[ORDER_SYSTEM_REPLACEMENT_PLAN.md](./ORDER_SYSTEM_REPLACEMENT_PLAN.md)** - Initial planning document (see ORDER_SYSTEM_IMPLEMENTATION.md for current approach)

### 🔄 Migration History  
- **[ACCOUNT_MIGRATION_PLAN.md](./ACCOUNT_MIGRATION_PLAN.md)** - Advertiser→account renaming (Phase 1 completed)

## Key Principles

1. **Order-Centric Experience** - Accounts access everything through their orders
2. **One Flexible System** - Handles 1 client or 10 clients naturally via order groups  
3. **Full Transparency** - Accounts see ALL analyzed sites, can browse and select alternatives
4. **Behind-the-Curtain Visibility** - Competitive advantage, not operational complexity
5. **Clean Separation** - Internal operations vs account-facing features

## Current Status

- ✅ Phase 1: Database migration (advertiser→account) completed
- ✅ Phase 2: Order-centric schema implemented (order_groups, order_site_selections, share_tokens)
- 🔄 Phase 3: Building account experience UI - See ORDER_SYSTEM_IMPLEMENTATION.md
- ⏳ Phase 4: Launch and testing

## Next Steps

1. **Immediate Priority**: Build order creation UI with multi-client support
2. **Critical Path**: Site selection interface with full transparency
3. **Integration**: Connect bulk analysis to order groups
4. **Polish**: Share token system for sales process

See ORDER_SYSTEM_IMPLEMENTATION.md for detailed implementation guide.