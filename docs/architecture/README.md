# PostFlow Architecture Documentation

## Overview
This directory contains the architectural design for PostFlow's account system and order flows.

## Key Documents

### 1. [ACCOUNT_PLATFORM_ARCHITECTURE.md](ACCOUNT_PLATFORM_ARCHITECTURE.md)
High-level architecture defining PostFlow as an order fulfillment platform with two user types:
- **Internal Team**: Full operational access
- **Accounts**: Order management with selective transparency

### 2. [ORDER_FLOW_VISIBILITY.md](ORDER_FLOW_VISIBILITY.md) 
Detailed breakdown of the complete order lifecycle and what accounts can see at each stage:
- Order initiation → Configuration → Site Analysis → Review → Fulfillment → Delivery
- Three use cases: Agency self-service, Managed service, Sales lead generation

### 3. [ORDER_SCHEMA_DESIGN.md](ORDER_SCHEMA_DESIGN.md)
Database schema changes needed to support order-centric architecture:
- New tables: `order_site_selections`, `order_share_tokens`
- Order state machine
- Relationships between orders, bulk analysis, and workflows

### 4. [ACCOUNT_MIGRATION_PLAN.md](ACCOUNT_MIGRATION_PLAN.md)
Step-by-step migration plan from current `advertisers` to new `accounts` system:
- Database migration scripts
- Code changes required
- Testing and rollback procedures

## Key Architectural Decisions

1. **Order-Centric Design**: Everything accessed through orders, not standalone components
2. **Selective Transparency**: Accounts see curated "behind the curtain" view as selling point
3. **No Multi-Tenancy**: Simple account/internal separation, no complex switching
4. **Share Links**: Enable sales process without requiring account creation

## Quick Start

For implementation, follow this sequence:
1. Review the architecture and order flow documents
2. Implement database changes from ORDER_SCHEMA_DESIGN.md
3. Follow ACCOUNT_MIGRATION_PLAN.md for the migration
4. Test all three use cases before deployment

## Questions?
See CLAUDE.md in the project root for AI development guidelines and patterns.