# Spam Prevention Implementation

## Overview
Multiple layers of protection to prevent spam signups:

## 1. Rate Limiting
- **IP-based**: 2 signups per hour per IP address
- **Email-based**: 1 signup per email per 24 hours
- Configured in `/lib/utils/rateLimiter.ts`

## 2. Email Validation
- Blocks disposable email domains (mailinator, guerrillamail, etc.)
- Detects suspicious patterns (test@, spam@, very short usernames)
- Configured in `/lib/utils/emailValidation.ts`

## 3. Honeypot Fields
- Hidden form fields that bots fill but humans don't see
- If filled, signup is silently rejected
- Fields: `website`, `url`, `company_website`

## 4. Google reCAPTCHA v3 (Optional)
- Invisible bot detection
- Score-based (0.0-1.0, threshold at 0.5)
- Setup:
  1. Get keys from https://www.google.com/recaptcha/admin
  2. Add to `.env`:
     ```
     NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
     RECAPTCHA_SECRET_KEY=your_secret_key
     ```

## 5. Monitoring Dashboard
- View signup attempts at `/admin/signup-monitoring`
- Shows blocked attempts, suspicious emails, unique IPs
- Real-time updates every 30 seconds

## Adjusting Settings

### Make Rate Limiting Stricter
Edit `/lib/utils/rateLimiter.ts`:
```typescript
// Change from 2 signups per hour to 1 signup per 2 hours
export const signupRateLimiter = new RateLimiter(1, 2 * 60 * 60 * 1000);
```

### Add More Disposable Domains
Edit `/lib/utils/emailValidation.ts` and add domains to `DISPOSABLE_EMAIL_DOMAINS` set.

### Adjust reCAPTCHA Threshold
Edit `/lib/utils/recaptcha.ts`:
```typescript
// Make stricter (0.7 instead of 0.5)
return data.success && data.score >= 0.7;
```

## Testing
1. Try signup with disposable email → Should be blocked
2. Try multiple signups from same IP → Should hit rate limit after 2
3. Use browser dev tools to fill honeypot fields → Should be silently rejected
4. Check `/admin/signup-monitoring` to see blocked attempts