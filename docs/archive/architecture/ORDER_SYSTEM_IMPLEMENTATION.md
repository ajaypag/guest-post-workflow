# Order System Implementation Guide

## Implementation Status Summary

| Phase | Status | Completion Date | Notes |
|-------|--------|-----------------|-------|
| **Phase 1: Order Builder** | ✅ COMPLETED | 2025-01-30 | Multi-client order creation with all fixes |
| **Phase 2: Bulk Analysis** | ✅ COMPLETED | 2025-01-30 | Human-driven projects with notification system |
| **Phase 3: Site Selection** | ✅ COMPLETED | 2025-08-04 | Internal order management with site submissions |
| **Phase 3.5: Flexible Associations** | ✅ COMPLETED | 2025-08-02 | Projects reusable across orders |
| **Phase 4: Account Dashboard** | ✅ COMPLETED | 2025-08-02 | Full auth system with dashboard and order views |
| **Phase 5: Workflow Gen** | ✅ COMPLETED | 2025-01-30 | Payment-aware workflow generation |
| **Phase 6: Share Tokens** | ❌ NOT STARTED | - | Public preview and conversion flow |
| **Payment System** | ✅ COMPLETED | 2025-01-31 | Manual payment recording with invoices |
| **Email Integration** | ✅ COMPLETED | 2025-01-31 | Resend integration for all notifications |
| **Archive System** | ✅ COMPLETED | 2025-01-31 | Soft delete with consistent UI/API behavior |
| **AI Permissions** | ✅ COMPLETED | 2025-01-31 | Granular AI feature access control |
| **Order Confirmation** | ✅ COMPLETED | 2025-08-02 | Dedicated page with keyword generation |
| **Site Review Interface** | ✅ COMPLETED | 2025-08-04 | Account users can review and approve sites |

### Latest Updates (2025-08-04)

**Major Accomplishments**:
1. **Site Suggestions Display**: Fixed to show domains from bulk analysis in order internal page
2. **Order State Management**: Added missing `/api/orders/[id]/update-state` endpoint
3. **Orphaned Domain Handling**: Created UI for domains without target URLs with assignment capability
4. **React Render Fix**: Fixed domain object rendering issues throughout the system

**Current State**:
- Order creation to site selection flow fully functional
- Internal users can manage orders through dedicated `/orders/[id]/internal` page
- Account users can review sites via `/account/orders/[id]/sites`
- Bulk analysis integration working with proper domain selection
- Payment system operational with invoice generation

## 🔐 User Architecture

**Three User Systems**:

### 1. Internal Users (`users` table)
- **Purpose**: Staff, admins, workflow managers
- **Authentication**: JWT via AuthServiceServer 
- **Access**: All orders, admin features, bulk analysis
- **Fields**: email, passwordHash, role, name

### 2. Account Users (`accounts` table)  
- **Purpose**: Customers who order guest posts
- **Authentication**: Separate auth with HTTP-only cookies
- **Access**: Only their orders and site selections
- **Fields**: email, password, contactName, companyName, billing info
- **Relations**: `orders.accountId → accounts.id`

### 3. Publisher Users (`publishers` table)
- **Purpose**: Website owners providing guest post opportunities  
- **Authentication**: Separate auth system
- **Access**: Their websites, payment info, content guidelines
- **Relations**: `publisherWebsites` links to websites

## Current Implementation Architecture

### Order Flow Overview
```
1. Order Creation (/orders/new)
   ↓
2. Order Confirmation (/orders/[id]/confirm)
   → Generates bulk analysis projects
   ↓
3. Bulk Analysis (Internal users analyze domains)
   → Results stored in bulk_analysis_domains
   ↓
4. Site Selection (/orders/[id]/internal)
   → Internal users push domains to order
   → Creates order_site_submissions entries
   ↓
5. Site Review (/account/orders/[id]/sites)
   → Account users review and approve sites
   ↓
6. Payment Recording (Manual via modal)
   → Updates order.paidAt
   ↓
7. Workflow Generation
   → Creates workflows from approved sites
```

### Key Database Tables

#### Orders System
- `orders` - Main order records
- `order_groups` - Client groupings within orders
- `order_site_submissions` - Sites selected for orders
- `project_order_associations` - Links bulk analysis to orders

#### Bulk Analysis System  
- `bulk_analysis_projects` - Analysis projects
- `bulk_analysis_domains` - Analyzed domain data
- `bulk_analysis_keywords` - Keywords for analysis

#### Support Tables
- `clients` - Customer brands/websites
- `target_pages` - Client target URLs
- `accounts` - Customer user accounts
- `invoices` - Payment invoices
- `payments` - Payment records

## Phase Implementation Details

### Phase 1: Order Builder ✅ COMPLETED

**Path**: `/app/orders/new/page.tsx`

**Features**:
- Account selection with search
- Multi-client support  
- Target page selection per client
- Real-time pricing calculation
- User assignment dropdown
- Draft saving capability

**Key APIs**:
- `POST /api/orders/new` - Create order
- `GET /api/orders/calculate-pricing` - Get pricing

### Phase 2: Bulk Analysis Integration ✅ COMPLETED

**Implementation**: Creates projects on order confirmation

**Flow**:
1. Order confirmed → Bulk analysis projects created
2. Projects assigned to internal users
3. Internal users analyze domains
4. Results available for site selection

**Key Components**:
- `/app/orders/[id]/confirm/page.tsx` - Confirmation interface
- `/app/bulk-analysis/assigned/page.tsx` - Assigned projects view

### Phase 3: Site Selection & Review ✅ COMPLETED

**Internal Interface**: `/orders/[id]/internal`

**Features**:
- View bulk analysis results
- Select domains for order
- Assign domains to target pages
- Handle orphaned domains
- Update order state

**Account Interface**: `/account/orders/[id]/sites`

**Features**:
- Review suggested sites
- Approve/reject selections
- Submit order for processing

**Key APIs**:
- `GET /api/orders/[id]/groups/[groupId]/submissions` - Get site submissions
- `POST /api/orders/[id]/groups/[groupId]/site-selections` - Add sites to order

### Phase 4: Account Dashboard ✅ COMPLETED

**Path**: `/app/account/dashboard/page.tsx`

**Features**:
- Order overview and status tracking
- Client management
- Quick actions
- Onboarding checklist for new users

**Authentication**:
- HTTP-only cookie sessions
- JWT with refresh tokens
- Password reset flow
- Invite-only registration

### Phase 5: Workflow Generation ✅ COMPLETED

**Trigger**: After payment recorded

**Process**:
1. Payment recorded via modal
2. Generate workflows button enabled
3. Creates workflow for each approved site
4. Assigns to users based on workload

**Key API**: `POST /api/orders/[id]/generate-workflows`

## Security Implementation

### Authentication Patterns
```typescript
// Internal users
if (session.userType === 'internal') {
  // Full access to all orders
}

// Account users  
if (session.userType === 'account') {
  // Only access own orders
  if (order.accountId !== session.accountId) {
    return 403 Forbidden
  }
}
```

### API Security
- All order APIs require authentication
- Account users restricted to own data
- Internal users have full access
- Target page access verified through client ownership

## Current Technical Debt

### High Priority
1. **Real Domain Metrics**: Still hardcoded (DR:70, traffic:10000)
2. **Dynamic Pricing**: Fixed at $100 per site
3. **Order Editing Rules**: Undefined post-confirmation behavior
4. **Share Token System**: Phase 6 not implemented

### Medium Priority  
1. **Type Safety**: Many `any` types in API responses
2. **Error Handling**: Basic try/catch without retry logic
3. **Performance**: No caching between tab switches
4. **Bulk Operations**: No bulk approve/reject

### Low Priority
1. **Email Templates**: Basic formatting
2. **Activity Logs**: Console only, no audit table
3. **Export Features**: No CSV/PDF exports
4. **Webhooks**: No external integrations

## Recent Bug Fixes (2025-08-04)

### Site Suggestions Display
- Fixed: Domains from bulk analysis now properly display in order internal page
- Added: Orphaned domains section for domains without target URLs
- Improved: Real-time updates when adding domains from bulk analysis

### Order State Management  
- Fixed: Missing `/api/orders/[id]/update-state` endpoint
- Added: Proper state validation and transitions
- Improved: Permission checks for state updates

### React Render Errors
- Fixed: Domain objects being rendered as React children
- Updated: All interfaces to handle domain as object structure
- Improved: Consistent domain data handling across components

## Migration Requirements

### Required Migrations
- ✅ Order groups migration: `/admin/order-groups-migration`
- ✅ Site selections migration: `/admin/site-selections-migration`  
- ✅ AI permissions: `/admin/migrate-ai-permissions`
- ✅ Archive fields: `/admin/client-archive-migration`

## Success Metrics

### Technical
- Order creation < 2 minutes ✅
- Site selection load < 1 second ✅
- Bulk analysis success > 99% ✅
- Workflow creation = 100% ✅

### Business
- Multi-client adoption ✅
- Account self-service ✅
- Payment tracking ✅
- Order completion rate (tracking)

## Next Steps

### Immediate Priorities
1. **Implement Real Metrics**: Replace hardcoded DR/traffic values
2. **Dynamic Pricing**: Implement tier-based pricing logic
3. **Share Tokens**: Build Phase 6 for public previews
4. **Order Editing**: Define and implement modification rules

### Future Enhancements
1. **Automated Payments**: Stripe/PayPal integration
2. **Bulk Operations**: Multi-select actions
3. **Advanced Reporting**: Analytics dashboard
4. **API Documentation**: OpenAPI specs
5. **Webhook System**: External integrations

## Related Documentation

- [Database Schema](./DATABASE.md)
- [User Types](./USER_TYPES.md)
- [Client Security](./CLIENT_SECURITY_IMPLEMENTATION.md)
- [Tech Debt](./TECH_DEBT_AND_SHORTCUTS.md)
- [Order Interface Redesign](./ORDER_INTERFACE_REDESIGN.md)