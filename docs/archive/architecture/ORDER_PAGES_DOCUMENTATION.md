# Order System Pages Documentation
*Last Updated: 2025-01-08*

## Overview
This document maps all order-related pages, their user types (internal/external), and their current status (active/legacy).

## Page Directory

### 🟢 ACTIVE PAGES (Currently in Use)

#### `/orders/page.tsx`
- **Purpose**: Order list/dashboard
- **User Type**: BOTH (internal and external)
- **Status**: ✅ ACTIVE
- **Features**: 
  - Shows different orders based on userType
  - Internal users see all orders
  - External (account) users see only their orders
- **Uses**: AuthWrapper

---

#### `/orders/new/page.tsx`
- **Purpose**: Create new order
- **User Type**: BOTH
- **Status**: ✅ ACTIVE
- **Features**:
  - Redirects to `/orders/[id]/edit` after creation
  - Account users get their account auto-assigned
  - Internal users must select account
- **Uses**: AuthWrapper

---

#### `/orders/[id]/page.tsx`
- **Purpose**: Main order detail page
- **User Type**: BOTH
- **Status**: ✅ ACTIVE
- **Features**:
  - Primary order viewing page
  - Shows OrderSiteReviewTableV2 for site states
  - Shows OrderDetailsTable for other states
  - Different actions based on userType
  - Internal users see admin controls
  - External users see limited actions
- **Uses**: AuthWrapper

---

#### `/orders/[id]/edit/page.tsx`
- **Purpose**: Edit order (add/modify line items)
- **User Type**: BOTH
- **Status**: ✅ ACTIVE
- **Features**:
  - Primary order creation/editing interface
  - Uses LineItems system
  - Account users: auto-assigned account
  - Internal users: must select account
  - Three-column interface design
- **Uses**: AuthWrapper

---

#### `/orders/[id]/review/page.tsx`
- **Purpose**: External user site review
- **User Type**: EXTERNAL (account users)
- **Status**: ✅ ACTIVE
- **Features**:
  - Site selection and approval interface
  - Called "ExternalOrderReviewPage"
  - Users can include/exclude/save for later
  - Generate invoice after review
- **Note**: No AuthWrapper (public review page?)

---

#### `/orders/[id]/internal/page.tsx`
- **Purpose**: Internal order management
- **User Type**: INTERNAL ONLY
- **Status**: ✅ ACTIVE
- **Features**:
  - Advanced order management for internal team
  - Keyword generation for target pages
  - Bulk analysis project controls
  - Site finding and qualification tools
  - Workflow generation
- **Security**: Checks `userType === 'internal'`
- **Uses**: AuthWrapper

---

#### `/orders/[id]/invoice/page.tsx`
- **Purpose**: View invoice
- **User Type**: BOTH
- **Status**: ✅ ACTIVE
- **Features**:
  - Display generated invoice
  - Shows line items and pricing
  - Payment status indicator
- **Note**: No auth wrapper (relies on order permissions)

---

#### `/orders/[id]/confirm/page.tsx`
- **Purpose**: Confirm order (internal approval)
- **User Type**: INTERNAL
- **Status**: ✅ ACTIVE
- **Features**:
  - Internal team confirms pending orders
  - Creates bulk analysis projects
  - Assigns to team member
  - Moves order to analyzing state
- **Uses**: AuthWrapper

---

### 🟡 SPECIAL PURPOSE PAGES

#### `/orders/claim/[token]/page.tsx`
- **Purpose**: Claim order via share link
- **User Type**: PUBLIC (no auth required)
- **Status**: ✅ ACTIVE
- **Features**:
  - Allows signup + order claim in one flow
  - Used for share links
  - Creates new account if needed
- **Special**: Token-based authentication

---

#### `/orders/share/[token]/page.tsx` 
- **Purpose**: View shared order
- **User Type**: PUBLIC (no auth required)
- **Status**: ❓ UNCLEAR - Possibly legacy?
- **Features**:
  - Public view of order via share token
  - Read-only order display
- **Question**: Is this still used or replaced by claim?

---

### 🔵 ACCOUNT-SPECIFIC PAGES

#### `/account/orders/[id]/confirm/page.tsx`
- **Purpose**: Account user confirms their order
- **User Type**: EXTERNAL (account)
- **Status**: ✅ ACTIVE
- **Features**:
  - Account users submit order for internal review
  - Moves order to pending_confirmation
- **Note**: Different from internal confirm

---

#### `/account/orders/[id]/status/page.tsx`
- **Purpose**: Order status tracking
- **User Type**: EXTERNAL (account)
- **Status**: ✅ ACTIVE
- **Features**:
  - Simple status display for account users
  - Shows order progress
  - Limited information display

---

### 🔴 LEGACY/REDIRECT PAGES

#### `/orders/[id]/detail/page.tsx`
- **Purpose**: Legacy redirect
- **User Type**: N/A
- **Status**: ❌ LEGACY
- **Function**: Redirects to `/orders/[id]`
- **Note**: Kept for backward compatibility

---

## Page Flow Diagram

```mermaid
graph TD
    A[/orders - List] --> B[/orders/new - Create]
    B --> C[/orders/[id]/edit - Add Items]
    
    C --> D{User Type}
    D -->|External| E[/account/orders/[id]/confirm - Submit]
    D -->|Internal| F[Direct Submit]
    
    E --> G[/orders/[id]/confirm - Internal Approval]
    F --> G
    
    G --> H[/orders/[id]/internal - Management]
    H --> I[Site Discovery]
    
    I --> J[/orders/[id]/review - External Review]
    J --> K[/orders/[id]/invoice - Invoice]
    
    L[/orders/claim/[token]] --> M[Account Creation + Order]
    N[/orders/share/[token]] -.-> O[Public View]
```

## User Type Summary

### Internal Users Can Access:
- ✅ All `/orders/*` pages
- ✅ `/orders/[id]/internal` (exclusive)
- ✅ `/orders/[id]/confirm` (exclusive)
- ✅ Full controls in shared pages

### External Users Can Access:
- ✅ `/orders` (filtered view)
- ✅ `/orders/new`
- ✅ `/orders/[id]` (limited view)
- ✅ `/orders/[id]/edit`
- ✅ `/orders/[id]/review`
- ✅ `/orders/[id]/invoice`
- ✅ `/account/orders/*` pages
- ❌ `/orders/[id]/internal`
- ❌ `/orders/[id]/confirm`

### Public Access (No Auth):
- ✅ `/orders/claim/[token]`
- ✅ `/orders/share/[token]`

## Questions for Clarification

1. **`/orders/share/[token]`** - Is this still active or replaced by the claim flow?
   - Both exist but seem to overlap in functionality
   - Share shows order, claim allows signup + claim

2. **`/orders/[id]/review`** - Why no AuthWrapper?
   - Page is called "ExternalOrderReviewPage"
   - But doesn't use AuthWrapper like other pages
   - Security concern or intentional?

3. **Account vs Orders paths** - Why split?
   - `/account/orders/[id]/confirm` vs `/orders/[id]/confirm`
   - Different purposes but confusing naming

## Recommendations

1. **Consolidate share/claim pages** - They seem to overlap
2. **Add AuthWrapper to review page** - Security concern
3. **Consider renaming** - `/orders/[id]/confirm` → `/orders/[id]/admin-confirm`
4. **Remove legacy redirect** - `/orders/[id]/detail`

## Tech Debt Notes

- Multiple table components (OrderSiteReviewTable, V2, OrderDetailsTable)
- Inconsistent auth patterns (some use AuthWrapper, some don't)
- Mixed authentication checks (session.userType vs AuthWrapper)
- Duplicate functionality between pages