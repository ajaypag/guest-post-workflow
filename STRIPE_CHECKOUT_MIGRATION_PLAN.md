# Stripe Checkout Migration Plan
## From Stripe Elements to Stripe Checkout Sessions

**Date:** 2025-01-24  
**Status:** Implementation Ready  
**Priority:** High - Current Elements implementation not working

---

## 📋 Executive Summary

This document outlines the complete migration from the current Stripe Elements (Payment Intents API) implementation to Stripe Checkout Sessions. The current implementation has issues preventing payments from working, necessitating this migration.

### Migration Goals
- ✅ Fix broken payment processing
- ✅ Simplify implementation with hosted checkout
- ✅ Maintain all existing business logic and database tracking
- ✅ Preserve webhook processing and audit trails
- ✅ Ensure seamless user experience

---

## 🔍 Current Implementation Audit

### Files Requiring Changes

#### 1. Core Payment Components (CRITICAL)
- **`components/orders/StripePaymentForm.tsx`** - Complete replacement needed
- **`app/api/orders/[id]/create-payment-intent/route.ts`** - Convert to checkout session endpoint
- **`lib/services/stripeService.ts`** - Add Checkout Session methods
- **`app/api/stripe/webhook/route.ts`** - Add Checkout Session event handling

#### 2. Supporting Infrastructure
- **Order detail pages** - Add success/cancel handling  
- **`lib/db/paymentSchema.ts`** - Add Checkout Session tracking table
- **Email templates** - Update payment URLs for redirects
- **Navigation/routing** - Add payment success/cancel routes

#### 3. Database Schema Changes
```sql
-- New table for Checkout Sessions
CREATE TABLE stripe_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL, -- open, complete, expired
  mode VARCHAR(20) NOT NULL DEFAULT 'payment', -- payment, subscription, setup
  success_url TEXT NOT NULL,
  cancel_url TEXT NOT NULL,
  customer_email VARCHAR(255),
  payment_intent_id VARCHAR(255), -- Links to existing payment intent when completed
  amount_total INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  metadata JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_checkout_sessions_order_id ON stripe_checkout_sessions(order_id);
CREATE INDEX idx_checkout_sessions_stripe_id ON stripe_checkout_sessions(stripe_session_id);
CREATE INDEX idx_checkout_sessions_status ON stripe_checkout_sessions(status);
```

---

## 🏗️ Implementation Plan

### Phase 1: Infrastructure Setup (Day 1)
1. **Database Schema Updates**
   - Add `stripe_checkout_sessions` table
   - Add migration script
   - Update connection.ts to include new schema

2. **Service Layer Updates** 
   - Extend `StripeService` with Checkout Session methods:
     - `createCheckoutSession()`
     - `retrieveCheckoutSession()`
     - `expireCheckoutSession()`

### Phase 2: API Endpoint Migration (Day 1-2)
1. **Create Checkout Session Endpoint**
   - New route: `app/api/orders/[id]/create-checkout-session/route.ts`
   - Replace Payment Intent creation logic
   - Handle authentication and validation
   - Return session URL for redirect

2. **Success/Cancel Pages**
   - `app/orders/[id]/payment/success/page.tsx`
   - `app/orders/[id]/payment/cancel/page.tsx`
   - Handle session completion and order updates

### Phase 3: Webhook Updates (Day 2)
1. **Checkout Session Event Handlers**
   - `checkout.session.completed` - Payment successful
   - `checkout.session.expired` - Session timeout
   - `checkout.session.async_payment_succeeded` - Delayed payment completion
   - `checkout.session.async_payment_failed` - Delayed payment failure

### Phase 4: Frontend Migration (Day 2-3)
1. **Payment Form Replacement**
   - Replace complex `StripePaymentForm` with simple redirect button
   - Add loading states and error handling
   - Maintain existing UI/UX patterns where possible

### Phase 5: Testing & Validation (Day 3-4)
1. **Integration Testing**
   - Test successful payment flow
   - Test canceled payment flow
   - Test expired session handling
   - Test webhook processing
   - Test email notifications

---

## 🔄 New Payment Flow

### Current Broken Flow
```
1. User clicks pay
2. Frontend creates Payment Intent via API
3. StripePaymentForm initializes with client secret
4. User fills payment details in embedded form
5. ❌ BROKEN: Form submission fails
```

### New Checkout Flow
```
1. User clicks pay
2. Frontend calls create-checkout-session API
3. API creates Checkout Session with success/cancel URLs
4. User redirects to Stripe-hosted payment page
5. User completes payment on Stripe's secure page
6. User redirects back to success page
7. Webhook confirms payment completion
8. Order status updated to paid
```

---

## 🔧 Technical Implementation Details

### 1. Checkout Session Configuration
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer_email: account.email,
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `Guest Post Order #${orderId.substring(0, 8)}`,
        description: `${orderData.orderType} - ${orderData.subtotalRetail/100} websites`,
      },
      unit_amount: orderData.totalRetail,
    },
    quantity: 1,
  }],
  metadata: {
    orderId,
    accountId: account.id,
    orderType: orderData.orderType,
  },
  success_url: `${process.env.NEXTAUTH_URL}/orders/${orderId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXTAUTH_URL}/orders/${orderId}/payment/cancel`,
  expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
});
```

### 2. Webhook Event Mapping
| Current Event | New Event | Action |
|--------------|-----------|--------|
| `payment_intent.succeeded` | `checkout.session.completed` | Mark order as paid |
| `payment_intent.payment_failed` | `checkout.session.expired` | Mark order as failed |
| `payment_intent.canceled` | User cancels checkout | Mark order as canceled |

### 3. Database Tracking
- Maintain existing `stripe_payment_intents` table for webhook compatibility
- Add `stripe_checkout_sessions` table for session tracking  
- Link sessions to payment intents when payment completes

---

## 🚨 Critical Considerations

### Security & Validation
- ✅ Validate order ownership before creating sessions
- ✅ Verify session completion on success page
- ✅ Handle expired/invalid sessions gracefully
- ✅ Maintain audit logging for all payment events

### User Experience
- ✅ Clear loading states during redirect
- ✅ Helpful error messages for failures
- ✅ Email notifications for payment status
- ✅ Order status updates in real-time

### Business Logic Preservation
- ✅ Keep existing order state transitions
- ✅ Maintain payment tracking and reconciliation
- ✅ Preserve refund and dispute handling
- ✅ Keep customer and payment method management

---

## 📝 Migration Checklist

### Pre-Migration
- [ ] Backup current payment-related tables
- [ ] Test current webhook endpoint with Stripe CLI
- [ ] Verify environment variables are set correctly
- [ ] Document current payment flow for rollback reference

### Implementation Phase
- [ ] Add new database schema
- [ ] Implement StripeService checkout methods
- [ ] Create checkout session API endpoint  
- [ ] Build success/cancel pages
- [ ] Update webhook handlers
- [ ] Replace payment form component
- [ ] Update email templates with new URLs

### Testing Phase  
- [ ] Test successful payment end-to-end
- [ ] Test canceled payment flow
- [ ] Test expired session handling
- [ ] Test webhook event processing
- [ ] Test order state transitions
- [ ] Test email notifications
- [ ] Test with different payment methods
- [ ] Test with different browsers/devices

### Deployment Phase
- [ ] Deploy database migrations
- [ ] Deploy backend changes
- [ ] Deploy frontend changes  
- [ ] Update Stripe webhook endpoint URL
- [ ] Monitor payment success rates
- [ ] Monitor error logs for issues

---

## 🔧 Environment Setup Required

### Stripe Configuration
```env
# Existing
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Verify these URLs are correct for redirects
NEXTAUTH_URL=https://your-domain.com
```

### Webhook Endpoint
- Current: `https://your-domain.com/api/stripe/webhook`
- Events to add: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`

---

## 📊 Success Metrics

### Technical Metrics
- Payment success rate > 95%
- Session completion time < 5 minutes average
- Webhook processing success rate > 99%
- Zero payment data consistency errors

### Business Metrics  
- Customer payment abandonment rate < 20%
- Time to payment completion < 3 minutes average
- Customer support tickets related to payments < 5% of orders

---

## 🚀 Next Steps

1. **Review and approve this plan**
2. **Start with Phase 1: Database schema updates**  
3. **Implement in order: Database → API → Webhooks → Frontend**
4. **Test thoroughly in development environment**
5. **Deploy with careful monitoring**

---

**Ready to begin implementation? Let's start with the database schema and service layer updates!**