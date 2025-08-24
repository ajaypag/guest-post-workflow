# Stripe Payment Integration - Phase 1 Implementation

This document outlines the Stripe payment integration that has been implemented for the order flow system.

## 🏗️ Architecture Overview

The integration follows a secure, production-ready pattern with proper separation of concerns:

- **Backend**: Stripe service layer with secure API key handling
- **Database**: Comprehensive payment tracking with audit trails  
- **Frontend**: Secure payment forms using Stripe Elements
- **Webhooks**: Automated payment processing and order updates

## 📋 Components Implemented

### 1. Database Schema (`/lib/db/paymentSchema.ts`)
- **`stripe_payment_intents`**: Track Stripe Payment Intents with full lifecycle
- **`stripe_customers`**: Store Stripe customer data linked to accounts
- **`stripe_webhooks`**: Webhook event tracking with duplicate prevention

### 2. Core Service (`/lib/services/stripeService.ts`)
- Payment Intent creation with idempotency
- Customer management (create/retrieve)
- Webhook event processing
- Automatic order status updates

### 3. API Endpoints
- **`/api/orders/[id]/create-payment-intent`**: Create payment intents
- **`/api/stripe/webhook`**: Process Stripe webhook events
- **`/api/stripe/test-config`**: Configuration validation

### 4. UI Components
- **`StripePaymentForm`**: Full payment form with Stripe Elements
- **`PaymentSuccessModal`**: Success confirmation with order details
- **`OrderPaymentPage`**: Complete payment page integration

### 5. Database Migration
- **`0029_add_stripe_payment_tables.sql`**: Creates all required tables and indexes

## 🚀 Installation Steps

### Step 1: Install Dependencies
```bash
npm install
```

The following packages have been added to package.json:
- `stripe` (server-side SDK)
- `@stripe/stripe-js` (client-side SDK)  
- `@stripe/react-stripe-js` (React components)

### Step 2: Environment Configuration

Add to your `.env` file:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**⚠️ Important**: 
- Start with TEST keys (pk_test_... and sk_test_...)
- Never commit real API keys to version control
- Use production keys only in production environment

### Step 3: Database Migration

Run the migration to create Stripe tables:
```bash
npm run db:migrate
```

Or manually execute the SQL in `migrations/0029_add_stripe_payment_tables.sql`

### Step 4: Stripe Dashboard Configuration

1. **Create Stripe Account**: Sign up at https://stripe.com
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Setup Webhooks**: Dashboard → Developers → Webhooks
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to send:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.requires_action`
     - `payment_intent.processing`

### Step 5: Test Configuration

Visit `/api/stripe/test-config` to verify your setup:
```bash
curl http://localhost:3000/api/stripe/test-config
```

## 🔧 Usage Examples

### Creating a Payment Intent (API)
```typescript
const response = await fetch(`/api/orders/${orderId}/create-payment-intent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currency: 'USD',
    description: 'Guest post order payment'
  })
});
```

### Using the Payment Form (React)
```tsx
import StripePaymentForm from '@/components/orders/StripePaymentForm';

function OrderPage({ order }) {
  return (
    <StripePaymentForm
      orderId={order.id}
      onSuccess={(paymentIntentId) => {
        console.log('Payment succeeded:', paymentIntentId);
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
    />
  );
}
```

### Complete Payment Page
```tsx
import OrderPaymentPage from '@/components/orders/OrderPaymentPage';

function PaymentPage({ order }) {
  return <OrderPaymentPage order={order} />;
}
```

## 🔄 Order Flow Integration

The payment system integrates with your existing order states:

1. **`reviewing`** → User can pay during review
2. **`payment_pending`** → User must pay to proceed  
3. **`payment_received`** → Payment completed, order proceeds

### Automatic State Transitions
- Payment successful → Order state: `payment_received`
- Payment failed → Order remains in current state
- Webhook processing → Real-time status updates

## 🛡️ Security Features

### Payment Security
- PCI DSS compliant via Stripe
- No sensitive payment data stored locally
- Tokenized payment methods
- 3D Secure (SCA) support

### API Security
- Authentication required for all payment endpoints
- Order ownership verification
- Idempotency key support
- Webhook signature validation

### Data Protection
- Client secrets expire automatically
- Comprehensive audit trails
- Error logging without sensitive data
- Rate limiting ready

## 🧪 Testing

### Test Cards (Stripe Test Mode)
```
Successful payment: 4242424242424242
Requires 3D Secure: 4000002500003155
Declined card: 4000000000000002
```

### Testing Webhooks Locally
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### API Testing
```bash
# Test configuration
curl http://localhost:3000/api/stripe/test-config

# Create payment intent (requires auth)
curl -X POST http://localhost:3000/api/orders/ORDER_ID/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'
```

## 📊 Monitoring & Analytics

### Database Queries for Monitoring
```sql
-- Payment success rate
SELECT 
  COUNT(*) as total_attempts,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(CASE WHEN status = 'succeeded' THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate
FROM stripe_payment_intents;

-- Revenue by day
SELECT 
  DATE(succeeded_at) as date,
  SUM(amount) / 100.0 as revenue_dollars,
  COUNT(*) as transactions
FROM stripe_payment_intents 
WHERE status = 'succeeded' 
GROUP BY DATE(succeeded_at)
ORDER BY date DESC;

-- Webhook processing health
SELECT 
  event_type,
  status,
  COUNT(*) as count
FROM stripe_webhooks 
GROUP BY event_type, status;
```

### Key Metrics to Monitor
- Payment success rate
- Failed payment reasons
- Webhook processing delays
- Average payment processing time

## 🚨 Error Handling

### Common Issues & Solutions

1. **"Authentication required"**
   - Ensure user is logged in
   - Check session configuration

2. **"Order not ready for payment"**
   - Verify order is in `reviewing` or `payment_pending` state
   - Check order has totalRetail > 0

3. **"Invalid signature" (webhooks)**
   - Verify STRIPE_WEBHOOK_SECRET is correct
   - Check webhook endpoint URL in Stripe dashboard

4. **Payment form not loading**
   - Verify NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set
   - Check browser console for JavaScript errors

## 🔄 Future Enhancements (Phase 2+)

### Payment Features
- **Saved payment methods** for repeat customers
- **Subscription billing** for recurring services
- **Multi-currency support** for international clients
- **Payment plans** (deposits, installments, net terms)

### Integration Features  
- **Automatic invoicing** with PDF generation
- **Refund processing** through admin interface
- **Dispute management** with Stripe's tools
- **Advanced reporting** and analytics

### Credit System Integration
- **Account credits** that apply before card charges
- **Credit expiration** and usage tracking
- **Promotional credits** and discount codes

## 📞 Support

For technical questions about this integration:
- Check `/api/stripe/test-config` for configuration issues
- Review Stripe dashboard logs for payment failures
- Check database logs in `stripe_webhooks` table for processing errors

For Stripe-specific issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: Available in your Stripe dashboard

---

**Status**: ✅ Phase 1 Complete - Ready for Testing
**Next**: Configure environment variables and run initial tests