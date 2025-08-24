# Stripe Payment Setup Guide

## Quick Setup (5 minutes)

The payment system is encountering an error because it needs valid Stripe test API keys. The current keys in `.env` are placeholders.

### How to Get Your Stripe Test Keys:

1. **Sign up for Stripe (free)**
   - Go to https://stripe.com and click "Start now" 
   - Create a free account (no credit card required for testing)

2. **Get your test API keys**
   - After signing in, go to https://dashboard.stripe.com/test/apikeys
   - You'll see two keys:
     - **Publishable key**: Starts with `pk_test_`
     - **Secret key**: Starts with `sk_test_` (click "Reveal test key" to see it)

3. **Update your `.env` file**
   ```bash
   # Replace the placeholder keys with your actual test keys:
   STRIPE_SECRET_KEY=sk_test_[your_actual_secret_key_here]
   STRIPE_PUBLISHABLE_KEY=pk_test_[your_actual_publishable_key_here]
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[same_publishable_key_here]
   ```

4. **Restart the development server**
   ```bash
   # Stop the server (Ctrl+C) and restart:
   npm run dev
   ```

5. **Test with Stripe's test cards**
   - Use card number: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)

## Common Test Cards

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 0002 | Declined (generic) |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |

## Troubleshooting

### "Invalid API Key" Error
- Make sure you're using the **secret key** (starts with `sk_test_`) in `STRIPE_SECRET_KEY`
- Make sure you're using the **publishable key** (starts with `pk_test_`) in the public key variables
- Ensure there are no extra spaces or quotes around the keys

### "Payment system is temporarily unavailable"
- This means the Stripe keys are not configured properly
- Follow the steps above to get valid test keys

### Testing in Production
- Never use test keys in production
- For production, use live keys from https://dashboard.stripe.com/apikeys (without `/test`)
- Live keys start with `sk_live_` and `pk_live_`

## Need Help?

- Stripe test mode documentation: https://stripe.com/docs/testing
- Test card numbers: https://stripe.com/docs/testing#cards
- API keys guide: https://stripe.com/docs/keys

## Security Notes

- **Never commit real secret keys to git**
- Use environment variables for all sensitive keys
- The `.env` file should be in `.gitignore`
- For production, use a secure secrets management system