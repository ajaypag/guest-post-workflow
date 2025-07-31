# Order Management System - Product Requirements Document

## Overview
Complete order management system for guest post workflow, including advertiser account creation, order preview/approval, and full lifecycle management.

## Design Standards
All implementations must follow the design patterns established in:
`/clients/0e8aff56-c6f3-4989-8072-3f3e99bc5107/bulk-analysis/projects/3af5ddff-2c0c-4ff9-a849-057baa59c227`

### Key Design Principles:
- **Layout**: Container with `mx-auto px-4 py-8`
- **Cards**: White background with `rounded-lg border border-gray-200 shadow-sm`
- **Tables**: Clean design with hover states and expandable rows
- **Buttons**: Primary actions use `bg-blue-600 hover:bg-blue-700`
- **Status Badges**: Inline-flex with colored backgrounds
- **Icons**: Lucide React icons with consistent sizing
- **Typography**: Clear hierarchy with gray-900 for primary text
- **Spacing**: Consistent use of gap-4, mb-6 for sections

## 📋 Complete Feature Checklist

### 🔴 Phase 1: Foundation (Critical Path)

#### 1. Order Share/Preview System
- [ ] **`/orders/share/[token]/page.tsx`** - Public order preview page
  - [ ] No authentication required
  - [ ] Full order details display
  - [ ] Domain list with pricing
  - [ ] Total cost breakdown
  - [ ] "Approve Order" button
  - [ ] "Request Changes" option
  - [ ] "Create Account & Approve" CTA
  - [ ] Mobile responsive design
  
- [ ] **`/api/orders/share/[token]/route.ts`** - Token validation API
  - [ ] Validate share token
  - [ ] Return order with items
  - [ ] Track token usage
  - [ ] Handle expired tokens

#### 2. Advertiser Account Creation
- [ ] **`/auth/signup/advertiser/page.tsx`** - Advertiser signup
  - [ ] Email pre-filled from order
  - [ ] Password requirements
  - [ ] Company information
  - [ ] Terms acceptance
  
- [ ] **`/api/auth/advertiser-signup/route.ts`** - Registration endpoint
  - [ ] Create advertiser account
  - [ ] Auto-link orders by email
  - [ ] Send welcome email
  - [ ] Auto-login after signup

#### 3. Order Detail Pages (Authenticated)
- [ ] **`/orders/[id]/page.tsx`** - Full order detail
  - [ ] Different views for internal/advertiser
  - [ ] Order timeline/status history
  - [ ] Complete domain list with details
  - [ ] Add/remove items (internal only)
  - [ ] Status update actions
  - [ ] Notes section
  - [ ] Share link generation

### 🟡 Phase 2: Core Workflows

#### 4. Order Creation/Edit
- [ ] **`/orders/new/page.tsx`** - Create order
  - [ ] Advertiser search/create
  - [ ] Client selection
  - [ ] Domain selection interface
  - [ ] Pricing calculator
  - [ ] Optional services (review, rush)
  - [ ] Save as draft
  
- [ ] **`/orders/[id]/edit/page.tsx`** - Edit order
  - [ ] Modify order details
  - [ ] Add/remove domains
  - [ ] Update pricing
  - [ ] Change status

#### 5. Advertiser Dashboard
- [ ] **`/advertiser/dashboard/page.tsx`** - Main view
  - [ ] Order statistics cards
  - [ ] Recent orders list
  - [ ] Active campaigns
  - [ ] Quick actions
  
- [ ] **`/advertiser/orders/page.tsx`** - Orders list
  - [ ] Filterable order table
  - [ ] Status badges
  - [ ] Search functionality
  - [ ] Pagination
  
- [ ] **`/advertiser/orders/[id]/page.tsx`** - Order detail
  - [ ] Read-only view
  - [ ] Download invoice
  - [ ] Campaign progress
  - [ ] Published URLs

#### 6. Bulk Analysis Integration
- [ ] **Add to Order button** in BulkAnalysisTable
- [ ] **Order selection modal**
  - [ ] List existing draft orders
  - [ ] Create new order option
  - [ ] Add selected domains
- [ ] **Bulk add API endpoint**
- [ ] **Success notifications**

### 🟢 Phase 3: Business Logic & Polish

#### 7. Order Status Workflows
- [ ] Status transition validations
- [ ] Automated workflow creation on payment
- [ ] Email notifications per status change
- [ ] Invoice generation (PDF)
- [ ] Payment tracking
- [ ] Completion certificates

#### 8. Email Notifications
- [ ] Order created (internal)
- [ ] Order ready for review (advertiser)
- [ ] Order approved (internal)
- [ ] Order paid (both)
- [ ] Workflow completed (advertiser)
- [ ] Published URL notifications

#### 9. Advanced Features
- [ ] Order templates/presets
- [ ] Bulk order upload (CSV)
- [ ] Order duplication
- [ ] Advanced search/filters
- [ ] Export orders to CSV
- [ ] Order analytics dashboard

---

## 🏗️ Implementation Plan

### Week 1: Foundation
1. **Day 1-2**: Order Share/Preview Page
2. **Day 3-4**: Advertiser Signup Flow  
3. **Day 5**: Order Detail Page

### Week 2: Core Features
4. **Day 6-7**: Order Creation/Edit
5. **Day 8-9**: Advertiser Dashboard
6. **Day 10**: Bulk Analysis Integration

### Week 3: Workflows
7. **Day 11-12**: Status Workflows
8. **Day 13**: Email Integration
9. **Day 14-15**: Testing & Bug Fixes

### Week 4: Polish
10. **Day 16-17**: Advanced Features
11. **Day 18-19**: Performance & Mobile
12. **Day 20**: Documentation

---

## 🎨 UI Component Standards

### Layouts
```tsx
// Page wrapper
<div className="container mx-auto px-4 py-8">
  <Header />
  <Content />
</div>
```

### Cards
```tsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### Tables
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      {/* Headers */}
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {/* Rows with hover:bg-gray-50 */}
    </tbody>
  </table>
</div>
```

### Buttons
```tsx
// Primary
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">

// Secondary  
<button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md">

// Ghost
<button className="text-blue-600 hover:text-blue-900">
```

### Status Badges
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color]-100 text-[color]-800">
  {status}
</span>
```

### Form Inputs
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

---

## 🔐 Security Considerations
- Share tokens expire after use or time limit
- Advertiser emails must be verified
- Orders can only be edited by internal users
- Advertisers can only view their own orders
- API endpoints must validate user permissions

## 📊 Success Metrics
- Time from share link to account creation
- Order approval rate
- Average time to order completion
- Advertiser account activation rate
- Support ticket reduction

## 🚀 Next Steps
1. Begin with Order Share/Preview Page implementation
2. Test token validation and security
3. Build advertiser signup flow
4. Continue through phases sequentially