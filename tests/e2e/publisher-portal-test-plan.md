# Publisher Portal E2E Test Plan

## Objective
Comprehensive end-to-end testing of the publisher portal to identify:
- Broken functionality
- Missing features
- Incomplete implementations
- Navigation issues
- API failures
- UI/UX problems

## Test Environment Setup
- Local development server (localhost:3001)
- Test database with seed data
- Playwright for automated testing
- Test publisher accounts

## Test Scenarios

### 1. Authentication & Access Control
#### 1.1 Publisher Registration
- [ ] Navigate to `/publisher/signup`
- [ ] Fill registration form with valid data
- [ ] Submit and verify account creation
- [ ] Check email verification flow
- [ ] Verify redirect to dashboard after verification

#### 1.2 Publisher Login
- [ ] Navigate to `/publisher/login`
- [ ] Login with valid credentials
- [ ] Verify JWT token is set (auth-token-publisher cookie)
- [ ] Check redirect to dashboard
- [ ] Verify session persistence on page refresh

#### 1.3 Logout
- [ ] Click logout from user menu
- [ ] Verify redirect to login page
- [ ] Confirm session is cleared
- [ ] Try accessing protected pages (should redirect to login)

#### 1.4 Password Reset
- [ ] Click "Forgot Password" on login
- [ ] Enter email and submit
- [ ] Verify reset email is sent
- [ ] Follow reset link and set new password
- [ ] Login with new password

### 2. Navigation & Page Accessibility
#### 2.1 Header Navigation
- [ ] Verify PublisherHeader appears on all pages
- [ ] Test all menu items:
  - [ ] Dashboard link works
  - [ ] My Websites link works
  - [ ] Offerings link works
  - [ ] Orders link works
  - [ ] Invoices link works
  - [ ] Analytics link works
- [ ] Test user dropdown:
  - [ ] Payment Profile link works
  - [ ] Settings link works
  - [ ] Help & Support link works
  - [ ] Logout works

#### 2.2 Mobile Navigation
- [ ] Test mobile menu toggle
- [ ] Verify all links work on mobile
- [ ] Check responsive design breakpoints

### 3. Dashboard
#### 3.1 Stats Display
- [ ] Verify dashboard loads at `/publisher`
- [ ] Check if stats are displayed:
  - [ ] Total orders count
  - [ ] Pending orders count
  - [ ] Total earnings
  - [ ] Website count
- [ ] Test recent orders list
- [ ] Verify quick action buttons work

### 4. Website Management
#### 4.1 Website List
- [ ] Navigate to `/publisher/websites`
- [ ] Verify list displays owned websites
- [ ] Check pagination if many websites
- [ ] Test search/filter functionality

#### 4.2 Add New Website
- [ ] Click "Add Website" button
- [ ] Navigate to `/publisher/websites/new`
- [ ] Fill website details form
- [ ] Submit and verify website is created
- [ ] Check domain validation
- [ ] Test duplicate domain prevention

#### 4.3 Edit Website
- [ ] Click edit on existing website
- [ ] Navigate to `/publisher/websites/[id]/edit`
- [ ] Modify website details
- [ ] Save changes
- [ ] Verify updates are persisted

#### 4.4 Website Claiming
- [ ] Test claim website flow
- [ ] Verify email domain verification
- [ ] Check DNS verification option
- [ ] Test claim approval/rejection

#### 4.5 Website Verification
- [ ] Check verification status display
- [ ] Test verification methods
- [ ] Verify status updates

### 5. Offerings Management
#### 5.1 Offerings List
- [ ] Navigate to `/publisher/offerings`
- [ ] Verify offerings are displayed
- [ ] Test filter (all/active/inactive)
- [ ] Check offering cards show correct info

#### 5.2 Create Offering
- [ ] Click "New Offering" button
- [ ] Navigate to `/publisher/offerings/new` (CHECK IF PAGE EXISTS)
- [ ] Fill offering details:
  - [ ] Offering type
  - [ ] Base price
  - [ ] Turnaround days
  - [ ] Content requirements
  - [ ] Express service options
- [ ] Submit and verify creation

#### 5.3 Edit Offering
- [ ] Click edit on existing offering
- [ ] Navigate to `/publisher/offerings/[id]/edit` (CHECK IF PAGE EXISTS)
- [ ] Modify offering details
- [ ] Save changes
- [ ] Verify updates

#### 5.4 Pricing Rules
- [ ] Click pricing rules for offering
- [ ] Navigate to `/publisher/offerings/[id]/pricing-rules` (CHECK IF PAGE EXISTS)
- [ ] Add pricing rule
- [ ] Test rule conditions
- [ ] Verify price calculations

#### 5.5 Activate/Deactivate
- [ ] Test activate button
- [ ] Test deactivate button
- [ ] Verify status changes

#### 5.6 Delete Offering
- [ ] Test delete button
- [ ] Confirm deletion dialog
- [ ] Verify offering is removed

### 6. Order Management
#### 6.1 Orders List
- [ ] Navigate to `/publisher/orders`
- [ ] Check if orders are displayed
- [ ] Test order status filters
- [ ] Verify order details shown

#### 6.2 Order Details
- [ ] Click on order to view details
- [ ] Navigate to `/publisher/orders/[id]` (CHECK IF PAGE EXISTS)
- [ ] Verify order information displayed
- [ ] Check client details
- [ ] Review requirements

#### 6.3 Accept Order
- [ ] Test accept order button
- [ ] Navigate to `/publisher/orders/[id]/accept`
- [ ] Confirm acceptance
- [ ] Verify status update

#### 6.4 Reject Order
- [ ] Test reject order button
- [ ] Provide rejection reason
- [ ] Verify order is rejected
- [ ] Check notification sent

#### 6.5 Content Delivery
- [ ] Test content submission form (CHECK IF EXISTS)
- [ ] Upload/paste content
- [ ] Submit for review
- [ ] Verify delivery status

### 7. Invoice Management
#### 7.1 Invoice List
- [ ] Navigate to `/publisher/invoices`
- [ ] Verify invoices displayed
- [ ] Test status filters
- [ ] Check pagination

#### 7.2 Create Invoice
- [ ] Click "New Invoice"
- [ ] Navigate to `/publisher/invoices/new`
- [ ] Add line items
- [ ] Set payment terms
- [ ] Submit invoice
- [ ] Verify creation

#### 7.3 View Invoice
- [ ] Click to view invoice details
- [ ] Check PDF generation (if available)
- [ ] Verify all information correct

### 8. Analytics
#### 8.1 Analytics Dashboard
- [ ] Navigate to `/publisher/analytics`
- [ ] Check if page loads (currently placeholder)
- [ ] Verify any stats shown
- [ ] Test date range filters (if exist)

### 9. Payment Profile
#### 9.1 Payment Setup
- [ ] Navigate to `/publisher/payment-profile`
- [ ] Fill payment details:
  - [ ] Bank account
  - [ ] PayPal
  - [ ] Other methods
- [ ] Save payment profile
- [ ] Verify data persisted

#### 9.2 Billing Address
- [ ] Add/edit billing address
- [ ] Verify address validation
- [ ] Save changes

### 10. Settings
#### 10.1 Profile Settings
- [ ] Navigate to `/publisher/settings`
- [ ] Test Profile tab:
  - [ ] Update name
  - [ ] Update company
  - [ ] Update phone
  - [ ] Save changes

#### 10.2 Business Info
- [ ] Test Business Info tab:
  - [ ] Update business type
  - [ ] Add tax ID
  - [ ] Update address
  - [ ] Save changes

#### 10.3 Notifications
- [ ] Test Notifications tab:
  - [ ] Toggle email notifications
  - [ ] Toggle order alerts
  - [ ] Save preferences

#### 10.4 Security
- [ ] Test Security tab:
  - [ ] Change password
  - [ ] Enable/disable 2FA (if implemented)

### 11. Help & Support
#### 11.1 Help Page
- [ ] Navigate to `/publisher/help`
- [ ] Search FAQs
- [ ] Expand/collapse FAQ items
- [ ] Test category filters

#### 11.2 Contact Form
- [ ] Fill contact form
- [ ] Submit message
- [ ] Verify submission

### 12. API Endpoints Testing
#### 12.1 Authentication APIs
- [ ] POST `/api/publisher/auth/login`
- [ ] POST `/api/publisher/auth/logout`
- [ ] POST `/api/publisher/auth/register`
- [ ] GET `/api/publisher/auth/verify`
- [ ] POST `/api/publisher/auth/refresh`

#### 12.2 Website APIs
- [ ] GET `/api/publisher/websites`
- [ ] POST `/api/publisher/websites`
- [ ] GET `/api/publisher/websites/[id]`
- [ ] PUT `/api/publisher/websites/[id]`
- [ ] DELETE `/api/publisher/websites/[id]`
- [ ] POST `/api/publisher/websites/claim`

#### 12.3 Offering APIs
- [ ] GET `/api/publisher/offerings`
- [ ] POST `/api/publisher/offerings`
- [ ] GET `/api/publisher/offerings/[id]`
- [ ] PUT `/api/publisher/offerings/[id]`
- [ ] DELETE `/api/publisher/offerings/[id]`
- [ ] GET `/api/publisher/offerings/[id]/pricing-rules`

#### 12.4 Order APIs
- [ ] GET `/api/publisher/orders`
- [ ] GET `/api/publisher/orders/[id]`
- [ ] POST `/api/publisher/orders/[id]/accept`
- [ ] POST `/api/publisher/orders/[id]/reject`
- [ ] POST `/api/publisher/orders/[id]/deliver`

#### 12.5 Dashboard Stats API
- [ ] GET `/api/publisher/dashboard/stats`

### 13. Integration Points
#### 13.1 Order System Integration
- [ ] Test order assignment to publishers
- [ ] Verify domain matching logic
- [ ] Check order routing

#### 13.2 Payment Integration
- [ ] Test payment processing (if implemented)
- [ ] Verify invoice payments
- [ ] Check earnings calculations

### 14. Edge Cases & Error Handling
#### 14.1 Invalid Data
- [ ] Test forms with invalid data
- [ ] Verify validation messages
- [ ] Check API error responses

#### 14.2 Authorization
- [ ] Try accessing other publisher's data
- [ ] Test permission boundaries
- [ ] Verify 403 responses

#### 14.3 Network Errors
- [ ] Test offline behavior
- [ ] Check loading states
- [ ] Verify error messages

## Expected Issues to Find

### Critical Issues
- Missing pages (offerings create/edit, order details)
- Broken API endpoints
- Authentication failures
- Data not persisting

### High Priority Issues
- Navigation broken on certain pages
- Forms not submitting
- Missing validation
- Incorrect data display

### Medium Priority Issues
- UI inconsistencies
- Missing loading states
- Poor error messages
- Incomplete features

### Low Priority Issues
- Styling issues
- Missing tooltips
- Suboptimal UX
- Performance issues

## Test Execution Plan

1. **Phase 1**: Core functionality (Auth, Navigation, Dashboard)
2. **Phase 2**: CRUD operations (Websites, Offerings)
3. **Phase 3**: Business logic (Orders, Invoices, Payments)
4. **Phase 4**: Secondary features (Analytics, Settings, Help)
5. **Phase 5**: Edge cases and error scenarios

## Success Criteria
- All critical paths work end-to-end
- No 404 errors on expected pages
- All forms submit successfully
- Data persists correctly
- Navigation works throughout
- APIs return expected responses
- Error handling is graceful

## Deliverables
1. Test results for each scenario
2. List of broken features
3. List of missing pages/features
4. Priority-ordered bug list
5. Recommendations for fixes