# Payment System Deployment Guide

This document outlines the critical environment variables and deployment steps required for the Stripe payment integration to work properly.

## 🚨 Critical Environment Variables

The following environment variables are **REQUIRED** for the payment system to function:

### Database Configuration
```bash
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=disable
```

### Authentication
```bash
NEXTAUTH_SECRET=your-secret-key-32-chars-minimum
NEXTAUTH_URL=https://your-domain.com
```

### Stripe Configuration
```bash
# For Test Environment
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For Production Environment  
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Email Configuration
```bash
RESEND_API_KEY=re_...
```

## 🔧 Deployment Steps

1. **Environment Validation**
   ```bash
   npm run validate:env
   ```
   This must pass before deployment. Fix any missing variables.

2. **Database Migration**
   Ensure payment tables are created:
   ```bash
   npm run db:migrate-apply
   ```

3. **Stripe Webhook Setup**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.requires_action`
     - `payment_intent.processing`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

4. **Test Payment Flow**
   - Use Stripe test cards: https://stripe.com/docs/testing
   - Test card: `4242 4242 4242 4242`
   - Test 3D Secure: `4000 0027 6000 3184`
   - Test declined: `4000 0000 0000 0002`

## 🛡️ Security Features

### Environment Validation
- Startup validation prevents server from starting with invalid config
- Stripe key validation ensures test/live consistency
- Payment environment validation prevents configuration errors

### Webhook Security
- Signature verification using STRIPE_WEBHOOK_SECRET
- Rate limiting: 100 requests/minute per IP
- Payload size limits: 1MB maximum
- Idempotency protection against duplicate events

### API Security
- Authentication required for payment creation
- Order ownership validation
- Proper error handling without exposing sensitive data
- Stripe error codes mapped to user-friendly messages

## 📋 Testing Checklist

Before going live, test these scenarios:

- [ ] Payment success with regular card
- [ ] Payment with 3D Secure authentication
- [ ] Payment decline (insufficient funds)
- [ ] Payment decline (card expired)
- [ ] Network timeout during payment
- [ ] Webhook delivery and processing
- [ ] Order state updates after payment
- [ ] Email notifications for payment events
- [ ] Environment validation on startup

## 🚫 Common Issues & Solutions

### "Payment system not properly configured"
- Check all Stripe environment variables are set
- Ensure test/live keys match (both test or both live)
- Verify STRIPE_WEBHOOK_SECRET starts with `whsec_`

### "Invalid Stripe API version"
- The system uses API version `2024-12-18`
- Ensure your Stripe account supports this version

### "Webhook signature verification failed"
- Verify STRIPE_WEBHOOK_SECRET in environment
- Check webhook URL is correct: `/api/stripe/webhook`
- Ensure webhook is configured in correct Stripe account (test/live)

### "Rate limit exceeded"
- Webhook rate limit: 100 requests/minute per IP
- This protects against webhook spam
- Check Stripe logs for excessive webhook deliveries

## 📊 Monitoring & Alerts

### Database Queries to Monitor
```sql
-- Check payment failures
SELECT * FROM payments WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Check webhook processing errors
SELECT * FROM stripe_webhooks WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Check orders stuck in payment_pending
SELECT * FROM orders WHERE state = 'payment_pending' AND created_at < NOW() - INTERVAL '1 hour';
```

### Key Metrics to Track
- Payment success rate
- Average payment processing time
- Webhook processing failures
- Orders stuck in payment_pending state

## 🔄 Environment Switching

### Test → Production
1. Update Stripe keys from test to live
2. Update webhook URL to production domain
3. Run environment validation
4. Test with small amount first

### Production → Test
1. Update Stripe keys from live to test
2. Update webhook URL to test domain
3. Run environment validation

## 📞 Support Contacts

- **Stripe Issues**: Check Stripe Dashboard logs
- **Database Issues**: Check PostgreSQL connection
- **Email Issues**: Check Resend dashboard
- **Environment Issues**: Run `npm run validate:env`

---

**⚠️ Important**: Never commit environment variables to git. Use environment-specific configuration in your deployment platform.