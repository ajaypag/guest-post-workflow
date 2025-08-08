# System Architecture

Core system architecture and design documentation.

## Contents

### Core Systems
- **[order-system.md](order-system.md)** - Order management system (⚠️ In Development)
- **[bulk-analysis.md](bulk-analysis.md)** - Domain qualification and analysis
- **[ai-integration.md](ai-integration.md)** - AI/GPT integration architecture
- **[authentication.md](authentication.md)** - Authentication and authorization
- **[pricing-system.md](pricing-system.md)** - Pricing logic and service fees

### Infrastructure
- **[database-schema.md](database-schema.md)** - Database design and schema
- **[security.md](security.md)** - Security implementation details
- **[technical-debt.md](technical-debt.md)** - Known issues and tech debt

## System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Workflow System | ✅ Production | 16 steps, fully functional |
| AI Integration | ✅ Production | O3, O4-mini models |
| Bulk Analysis | ✅ Production | DataForSEO + AI |
| Authentication | ✅ Production | JWT + cookies |
| Order System | ⚠️ Partial | ~60% complete |
| Payments | ❌ Manual | No gateway integration |

## Key Design Decisions

1. **Dual Authentication** - Separate systems for internal vs external users
2. **Service Fee Model** - $79 per link + volume discounts
3. **AI Orchestration** - V2 pattern for natural LLM interaction
4. **JSON Storage** - Workflow steps use JSON columns for flexibility