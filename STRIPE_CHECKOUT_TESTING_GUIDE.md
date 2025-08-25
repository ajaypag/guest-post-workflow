# Stripe Checkout Migration - Testing & Deployment Guide

**Status:** 🚀 **IMPLEMENTATION COMPLETE**  
**Date:** 2025-01-24  
**Migration:** From Stripe Elements to Stripe Checkout Sessions

---

## ✅ Implementation Summary

### What Was Built
✅ **Database Schema** - Added `stripe_checkout_sessions` table  
✅ **Service Layer** - Extended `StripeService` with Checkout Session methods  
✅ **API Endpoints** - Created checkout session creation and verification endpoints  
✅ **Success/Cancel Pages** - Built redirect handling pages  
✅ **Webhook Handlers** - Added Checkout Session event processing  
✅ **Payment Component** - Created simple checkout redirect button  

### New Files Created
- `migrations/0059_stripe_checkout_sessions.sql` - Database migration
- `app/api/orders/[id]/create-checkout-session/route.ts` - Session creation API
- `app/api/orders/[id]/verify-payment-session/route.ts` - Payment verification API  
- `app/orders/[id]/payment/success/page.tsx` - Success page
- `app/orders/[id]/payment/cancel/page.tsx` - Cancel page
- `components/orders/StripeCheckoutButton.tsx` - Simple payment button
- `components/orders/StripePaymentFormNew.tsx` - Simplified payment form

### Files Modified
- `lib/db/paymentSchema.ts` - Added checkout sessions schema
- `lib/services/stripeService.ts` - Added checkout session methods
- `app/api/stripe/webhook/route.ts` - Added checkout session event handlers

---

## 🧪 Testing Guide

### Prerequisites
1. **Stripe Account** - Test mode enabled
2. **Environment Variables** - All Stripe keys configured
3. **Database** - Migration applied successfully
4. **Webhook Endpoint** - Configured for checkout session events

### Phase 1: Component Testing

#### Test 1: Database Schema
```sql
-- Verify table was created
\d stripe_checkout_sessions

-- Test data insertion
INSERT INTO stripe_checkout_sessions (
  order_id, stripe_session_id, status, mode, success_url, cancel_url,
  customer_email, amount_total, currency
) VALUES (
  'test-order-id', 'cs_test_session_123', 'open', 'payment',
  'http://localhost:3000/success', 'http://localhost:3000/cancel',
  'test@example.com', 5000, 'USD'
);
```

#### Test 2: StripeService Methods
```bash
# Test in development console
cd your-project
node -e "
const { StripeService } = require('./lib/services/stripeService');
// Test methods are available
console.log(typeof StripeService.createCheckoutSession);
console.log(typeof StripeService.retrieveCheckoutSession);
"
```

#### Test 3: API Endpoints
```bash
# Test checkout session creation (requires valid order and auth)
curl -X POST http://localhost:3000/api/orders/ORDER_ID/create-checkout-session \
  -H "Content-Type: application/json" \
  -b "cookies" \
  -d '{}'
```

### Phase 2: Integration Testing

#### Test 4: End-to-End Payment Flow
1. **Create Test Order**
   - Log in to the application
   - Create a new order with valid amount
   - Navigate to payment page

2. **Initiate Checkout**
   - Click payment button
   - Should redirect to Stripe Checkout
   - Verify session URL format: `https://checkout.stripe.com/c/pay/cs_test_...`

3. **Complete Test Payment**
   ```
   Test Card Numbers:
   - Success: 4242 4242 4242 4242
   - Declined: 4000 0000 0000 0002
   - 3D Secure: 4000 0025 0000 3155
   
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

4. **Verify Success Flow**
   - Should redirect to `/orders/ORDER_ID/payment/success?session_id=cs_test_...`
   - Success page should display payment confirmation
   - Order status should update to "payment_received"
   - Email notification should be sent

#### Test 5: Failure Scenarios
1. **Cancel Payment**
   - Start checkout process
   - Click back/cancel on Stripe page
   - Should redirect to `/orders/ORDER_ID/payment/cancel`
   - Order should remain in "payment_pending" state

2. **Expired Session**
   - Create checkout session
   - Wait 30+ minutes (or modify expires_at in DB)
   - Attempt to complete payment
   - Should show expired session message

3. **Invalid/Missing Session**
   - Navigate directly to success page without session_id
   - Should show error message
   - Try with invalid session_id
   - Should handle gracefully

### Phase 3: Webhook Testing

#### Test 6: Webhook Events
```bash
# Install Stripe CLI for local testing
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger events
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
stripe trigger checkout.session.async_payment_succeeded
stripe trigger checkout.session.async_payment_failed
```

#### Verify Webhook Handling
1. **Check Logs** - Server should log webhook events
2. **Database Updates** - Session status should update
3. **Order Status** - Order state should change appropriately
4. **Email Notifications** - Success/failure emails should send

### Phase 4: Browser Testing

#### Test 7: Cross-Browser Compatibility
- **Chrome** - Full functionality
- **Firefox** - Payment flow
- **Safari** - Mobile experience
- **Edge** - Redirect handling

#### Test 8: Mobile Responsiveness
- **iPhone** - Touch interactions
- **Android** - Payment experience
- **Tablet** - Layout adaptation

---

## 🚀 Deployment Guide

### Step 1: Environment Verification
```bash
# Verify environment variables
echo $STRIPE_SECRET_KEY | grep -q "sk_" && echo "Secret key OK"
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | grep -q "pk_" && echo "Publishable key OK"  
echo $STRIPE_WEBHOOK_SECRET | grep -q "whsec_" && echo "Webhook secret OK"
echo $NEXTAUTH_URL
```

### Step 2: Database Migration
```bash
# Apply migration to production database
psql $DATABASE_URL -f migrations/0059_stripe_checkout_sessions.sql

# Verify migration
psql $DATABASE_URL -c "\d stripe_checkout_sessions"
```

### Step 3: Code Deployment
```bash
# Build and test
npm run build
npm test

# Deploy to production
git add .
git commit -m "feat: migrate from Stripe Elements to Checkout Sessions

- Add stripe_checkout_sessions table and schema
- Implement StripeService checkout session methods  
- Create checkout session API endpoints
- Build success/cancel redirect pages
- Add comprehensive webhook handling
- Replace complex payment form with simple redirect
- Maintain all existing business logic and audit trails

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### Step 4: Stripe Dashboard Configuration
1. **Navigate to Stripe Dashboard** → Webhooks
2. **Update Webhook Endpoint** - Add events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
3. **Test Webhook** - Send test events to verify handler

### Step 5: Feature Flag Rollout (Recommended)
```typescript
// Optional: Gradual rollout with feature flag
const useCheckoutSessions = process.env.FEATURE_STRIPE_CHECKOUT === 'true';

// In payment component
return useCheckoutSessions ? 
  <StripePaymentFormNew {...props} /> : 
  <StripePaymentForm {...props} />
```

---

## 📊 Monitoring & Success Metrics

### Key Metrics to Track
- **Payment Success Rate** - Should be ≥95%
- **Session Completion Time** - Average <3 minutes
- **Abandonment Rate** - Should be <20%
- **Error Rate** - <1% of payment attempts
- **Webhook Success Rate** - ≥99%

### Monitoring Setup
```typescript
// Add to your analytics/monitoring
{
  event: 'checkout_session_created',
  orderId,
  sessionId,
  amount,
  timestamp: new Date().toISOString()
}

{
  event: 'payment_completed', 
  orderId,
  sessionId,
  amount,
  duration_ms: completionTime,
  timestamp: new Date().toISOString()
}
```

### Error Tracking
- **Failed Session Creation** - API endpoint errors
- **Webhook Processing Failures** - Event handling issues
- **Redirect Failures** - Success/cancel page errors
- **Database Inconsistencies** - Order/payment state mismatches

---

## 🔄 Rollback Plan

### If Issues Occur
1. **Quick Rollback** - Revert to backup component:
   ```bash
   mv components/orders/StripePaymentForm.backup.tsx components/orders/StripePaymentForm.tsx
   ```

2. **Database Rollback** - Checkout sessions table can remain (no impact)

3. **Stripe Configuration** - Remove new webhook events if needed

### Rollback Verification
- Verify old payment form loads correctly
- Test Elements-based payment flow  
- Check existing webhook handling still works
- Monitor payment success rates return to baseline

---

## 🎯 Next Steps

### Immediate (Post-Deployment)
- [ ] Monitor payment success rates for 48 hours
- [ ] Verify webhook processing working correctly
- [ ] Check email notifications sending properly
- [ ] Test mobile payment experience

### Short Term (1 week)
- [ ] Remove old StripePaymentForm backup if stable
- [ ] Update documentation with new flow
- [ ] Optimize checkout session expiry times if needed
- [ ] Add analytics tracking for conversion rates

### Long Term (1 month)
- [ ] Evaluate payment method usage (cards vs wallets)
- [ ] Consider enabling advanced Checkout features
- [ ] Review and optimize webhook retry logic
- [ ] Add multi-currency support if needed

---

## 🆘 Troubleshooting Guide

### Common Issues

#### Issue 1: "Session not found" errors
```typescript
// Check session expiry and database consistency
const session = await StripeService.retrieveCheckoutSession(sessionId);
console.log('Session status:', session.session.status);
console.log('DB record:', session.dbSession);
```

#### Issue 2: Webhook events not processing
```bash
# Check webhook endpoint and events
curl -X POST your-domain.com/api/stripe/webhook \
  -H "stripe-signature: test" \
  -d '{"type": "checkout.session.completed"}'
```

#### Issue 3: Redirects failing
- Verify `NEXTAUTH_URL` environment variable
- Check success/cancel URL construction
- Test both success and cancel flows

#### Issue 4: Order status not updating
- Check webhook processing logs
- Verify database connections
- Test manual session verification API

---

**🚀 Migration Complete! The new Stripe Checkout integration is ready for production use.**

---

*For additional support, refer to:*
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- Internal troubleshooting logs at `/api/stripe/webhook`