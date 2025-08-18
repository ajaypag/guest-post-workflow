# Manual Testing Checklist - Publisher Workflow System

This checklist covers manual testing steps for production deployment verification.

## Pre-Deployment Requirements

### ✅ Database Migration Status
- [ ] All migrations completed successfully
- [ ] Run `/admin/publisher-migrations` to verify system setup
- [ ] Domain normalization applied
- [ ] Publisher payment system tables created
- [ ] No migration warnings or errors

### ✅ Environment Configuration
- [ ] `DATABASE_URL` points to production database
- [ ] `NEXTAUTH_SECRET` is set with secure random value
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] `RESEND_API_KEY` configured for email notifications
- [ ] SSL certificates installed and working

## 1. Admin Migration Interface Testing

### Test URL: `/admin/publisher-migrations`

**Pre-requisites:** Admin user access

#### ✅ Interface Functionality
- [ ] Page loads without errors
- [ ] All 12 migrations listed with descriptions
- [ ] "Check Migration Status" button works
- [ ] Migration status indicators (green checkmarks) display correctly
- [ ] "Run All Publisher Migrations" button available
- [ ] Critical warnings display properly
- [ ] SQL file paths shown correctly

#### ✅ Migration Execution
- [ ] Confirmation dialogs appear before running migrations
- [ ] Success messages display after completion
- [ ] Error handling works for failed migrations
- [ ] Database changes applied correctly
- [ ] No console errors during execution

#### ✅ Security & Access Control
- [ ] Only admin users can access the page
- [ ] Non-admin users redirected to login
- [ ] Session timeout handled gracefully

## 2. Internal Order Assignment Testing

### Test URL: `/orders/[id]/internal`

**Pre-requisites:** 
- Internal team user access
- Test order: `d2dfa51b-ae73-4603-b021-d24a9d2ed490`
- Test line item: `8cf33331-a4f3-41b5-8aeb-210e70bd60a7`

#### ✅ Order Assignment Interface
- [ ] Order details display correctly
- [ ] Line items show with proper status
- [ ] Publisher assignment dropdown populates
- [ ] Domain selection works
- [ ] Publisher filtering by domain works
- [ ] Publisher performance metrics visible

#### ✅ Assignment Process
- [ ] Single publisher assignment completes successfully
- [ ] Bulk assignment works for multiple line items
- [ ] Assignment notes can be added
- [ ] Email notifications sent to publishers
- [ ] Database updates correctly (status, publisher_id, assigned_domain)
- [ ] Real-time status updates work

#### ✅ Error Handling
- [ ] Assignment conflicts detected and handled
- [ ] Network errors display user-friendly messages
- [ ] Form validation prevents invalid assignments
- [ ] Alternative publisher suggestions work

## 3. Publisher Dashboard Testing

### Test URL: `/publisher`

**Pre-requisites:** Publisher user account

#### ✅ Authentication Flow
- [ ] Login page displays correctly
- [ ] Form validation works (email format, required fields)
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to dashboard
- [ ] Session management works correctly
- [ ] Logout functionality works

#### ✅ Dashboard Content
- [ ] Earnings summary displays correctly
- [ ] Active orders count accurate
- [ ] Recent activity shows latest updates
- [ ] Navigation menu works on all devices
- [ ] User profile information correct

#### ✅ Responsive Design
- [ ] Mobile layout stacks content properly
- [ ] Tablet view shows appropriate navigation
- [ ] Desktop shows full sidebar
- [ ] Touch targets are 44px+ on mobile
- [ ] No horizontal scrolling on any device

## 4. Publisher Order Management

### Test URL: `/publisher/orders`

#### ✅ Order List Interface
- [ ] Orders display in table/card format
- [ ] Status filtering works correctly
- [ ] Date range filtering functions
- [ ] Search functionality works (if implemented)
- [ ] Pagination works for large order lists
- [ ] Sort options function properly

#### ✅ Order Details & Actions
- [ ] Order detail page loads correctly
- [ ] All order information displayed (anchor text, target URL, price)
- [ ] Accept order button works
- [ ] Reject order with reason works
- [ ] Start work button updates status
- [ ] Work submission form validation works
- [ ] File upload works (if applicable)

#### ✅ Order Status Flow
- [ ] Pending → Accepted transition works
- [ ] Accepted → In Progress transition works
- [ ] In Progress → Submitted transition works
- [ ] Submitted → Completed (admin approval) works
- [ ] Rejection flow works with reason capture
- [ ] Status timeline shows complete history

## 5. Publisher Invoice Management

### Test URL: `/publisher/invoices`

#### ✅ Invoice List & Creation
- [ ] Invoice list displays correctly
- [ ] Status filtering works (pending, paid, cancelled)
- [ ] "Create Invoice" button navigates properly
- [ ] Invoice creation form loads correctly
- [ ] Available earnings calculation accurate

#### ✅ Invoice Form Validation
- [ ] Amount validation (positive, within available earnings)
- [ ] Description minimum length validation
- [ ] Payment method selection required
- [ ] Date field validation
- [ ] Error messages display clearly

#### ✅ Invoice Submission & Management
- [ ] Invoice submission works successfully
- [ ] Invoice appears in list after creation
- [ ] Invoice details page shows all information
- [ ] PDF download works correctly
- [ ] Invoice cancellation works (if pending)
- [ ] Status updates reflect correctly

## 6. Publisher Payment Profile

### Test URL: `/publisher/payment-profile`

#### ✅ Payment Profile Setup
- [ ] Form loads with all required fields
- [ ] Bank account validation works
- [ ] Routing number validation functions
- [ ] Address fields validate properly
- [ ] Tax ID format validation works
- [ ] Profile saves successfully

#### ✅ Security & Data Handling
- [ ] Sensitive data masked in UI
- [ ] Profile data encrypted in database
- [ ] Update functionality works
- [ ] Profile preview shows masked data
- [ ] No sensitive data in client-side code

## 7. Email Notification System

#### ✅ Email Delivery
- [ ] Order assignment emails sent to publishers
- [ ] Invoice submission notifications sent
- [ ] Payment confirmation emails work
- [ ] Email templates render correctly
- [ ] Unsubscribe links work
- [ ] Email deliverability good (not marked as spam)

#### ✅ Email Content
- [ ] Subject lines clear and relevant
- [ ] Body content includes all necessary information
- [ ] Links in emails work correctly
- [ ] Sender address correct (`info@linkio.com`)
- [ ] Reply-to address configured

## 8. Accessibility Testing

#### ✅ WCAG 2.1 Compliance
- [ ] All images have alt text
- [ ] Form fields have proper labels
- [ ] Heading structure is logical (h1 → h2 → h3)
- [ ] Color contrast meets AA standards
- [ ] Keyboard navigation works throughout site
- [ ] Screen reader compatibility verified
- [ ] Focus indicators visible and clear

#### ✅ Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements reachable
- [ ] Skip links work properly
- [ ] Modal dialogs trap focus correctly
- [ ] Escape key closes modals
- [ ] Enter/Space activate buttons

## 9. Performance Testing

#### ✅ Page Load Times
- [ ] Dashboard loads in < 3 seconds
- [ ] Order list loads in < 2 seconds
- [ ] Form submissions respond in < 1 second
- [ ] File uploads complete successfully
- [ ] No memory leaks in long sessions

#### ✅ Database Performance
- [ ] Order queries execute quickly (< 500ms)
- [ ] Publisher lookup efficient
- [ ] Earnings calculations fast
- [ ] No N+1 query problems
- [ ] Proper database indexing

## 10. Security Testing

#### ✅ Authentication & Authorization
- [ ] Session timeouts work correctly
- [ ] CSRF protection enabled
- [ ] SQL injection prevention verified
- [ ] XSS protection in place
- [ ] Publisher data isolation enforced
- [ ] Admin functions protected

#### ✅ Data Validation
- [ ] All user inputs validated server-side
- [ ] File upload restrictions enforced
- [ ] Rate limiting on forms
- [ ] Sensitive data properly encrypted
- [ ] API endpoints secured

## 11. Error Handling & Edge Cases

#### ✅ Network Issues
- [ ] Graceful handling of connection failures
- [ ] Retry mechanisms work
- [ ] Offline detection (if implemented)
- [ ] Progress indicators for slow operations
- [ ] Timeout handling

#### ✅ Data Edge Cases
- [ ] Empty states display properly
- [ ] Large datasets paginate correctly
- [ ] Invalid data handled gracefully
- [ ] Concurrent user actions work
- [ ] Data synchronization issues resolved

## 12. Browser Compatibility

#### ✅ Modern Browsers
- [ ] Chrome (latest) - full functionality
- [ ] Firefox (latest) - full functionality  
- [ ] Safari (latest) - full functionality
- [ ] Edge (latest) - full functionality

#### ✅ Mobile Browsers
- [ ] Safari iOS - responsive design works
- [ ] Chrome Android - touch interactions work
- [ ] Mobile form inputs work correctly
- [ ] Virtual keyboard doesn't break layout

## Production Deployment Checklist

### ✅ Final Verification
- [ ] All manual tests pass
- [ ] Automated E2E tests pass
- [ ] Database backup created
- [ ] Monitoring alerts configured
- [ ] SSL certificates valid
- [ ] DNS settings correct
- [ ] CDN configured (if applicable)

### ✅ Post-Deployment
- [ ] Health check endpoints respond
- [ ] Test transactions complete successfully
- [ ] Email notifications working
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User acceptance testing completed

## Test Data Requirements

### Users
- Admin user: `admin@test.com` / `admin123`
- Internal user: `internal@test.com` / `internal123`  
- Publisher user: `test.publisher@example.com` / `testpublisher123`

### Test Orders
- Order ID: `d2dfa51b-ae73-4603-b021-d24a9d2ed490`
- Line Item ID: `8cf33331-a4f3-41b5-8aeb-210e70bd60a7`

### Test Data Setup
```sql
-- Verify test data exists
SELECT * FROM orders WHERE id = 'd2dfa51b-ae73-4603-b021-d24a9d2ed490';
SELECT * FROM order_line_items WHERE id = '8cf33331-a4f3-41b5-8aeb-210e70bd60a7';
SELECT * FROM publishers WHERE email = 'test.publisher@example.com';
```

## Notes

- Run tests in order (migrations first, then workflow tests)
- Use Chrome DevTools to verify no console errors
- Test with realistic data volumes
- Verify all email notifications in test environment first
- Document any issues found with screenshots
- Get stakeholder sign-off before production deployment

---

**Last Updated:** $(date)
**Test Environment:** Production candidate build
**Tester:** [Name]
**Status:** [ ] In Progress [ ] Complete [ ] Issues Found