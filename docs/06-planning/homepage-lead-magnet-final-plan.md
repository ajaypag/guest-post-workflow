# Homepage Lead Magnet - Final Implementation Plan

## Current State Summary

### ✅ We Have:
1. **reCAPTCHA v3** - Fully configured and working in `/signup` form
   - `lib/utils/recaptcha.ts` - Server verification
   - `components/RecaptchaProvider.tsx` - Client integration
   - ENV vars in production: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`

2. **Two Signup Endpoints**:
   - `/api/accounts/signup` - Has reCAPTCHA, rate limiting, email validation
   - `/api/auth/account-signup` - NO reCAPTCHA, NO email verification requirement

3. **Email Verification System**:
   - `/api/auth/verify-email` - Works but NOT required
   - Accounts created with `status: 'active'` immediately
   - No `emailVerificationToken` generated during signup

4. **Vetted Sites Request API**:
   - Requires authenticated session
   - Creates requests linked to accountId

## Implementation Plan (Option A - Minimal Changes)

### Step 1: Update Account Signup Endpoint
**File**: `/api/auth/account-signup/route.ts`

```typescript
// Add these imports
import { verifyRecaptcha } from '@/lib/utils/recaptcha';
import { v4 as uuidv4 } from 'uuid';

// Modify POST handler to:
1. Accept recaptchaToken
2. Verify reCAPTCHA (copy from /api/accounts/signup)
3. Generate emailVerificationToken
4. Set status='pending' if requireVerification flag
5. Store pendingRequest in account metadata
6. Send verification email instead of welcome email
```

### Step 2: Add Pending Request Storage
**Database**: Add column to accounts table

```sql
ALTER TABLE accounts 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Store pendingRequest like:
{
  "pendingRequest": {
    "targetUrls": ["https://example.com"],
    "filters": {},
    "notes": "Lead magnet signup"
  }
}
```

### Step 3: Update Email Verification Handler
**File**: `/api/auth/verify-email/route.ts`

```typescript
// After successful verification:
1. Check if account.metadata.pendingRequest exists
2. If yes, create vetted sites request
3. Clear pendingRequest from metadata
4. Redirect to /vetted-sites/requests or dashboard
```

### Step 4: Create Progressive Form Component
**File**: `components/VettedSitesLeadForm.tsx`

```typescript
// Features:
1. Step 1: URL input only
2. Step 2: Expand to show signup fields
3. Use executeRecaptcha from RecaptchaProvider
4. Call /api/auth/account-signup with:
   - requireVerification: true
   - pendingRequest data
   - recaptchaToken
```

### Step 5: Integrate into Homepage
**File**: `app/marketing/page.tsx`

```typescript
// Add RecaptchaProvider to layout
// Replace or supplement hero with VettedSitesLeadForm
// A/B test option: Feature flag to show old vs new
```

## Changes Required Summary

### Modified Files:
```
app/api/auth/
  account-signup/route.ts      # Add reCAPTCHA, email verification, pending request
  verify-email/route.ts        # Create request after verification

lib/services/
  emailService.ts              # Already has sendEmailVerification()
```

### New Files:
```
components/
  VettedSitesLeadForm.tsx      # Progressive disclosure form

migrations/
  add-account-metadata.sql     # Add metadata column to accounts
```

### Minimal Risk Points:
- Existing signups still work (non-lead-magnet)
- Only affects new signups with requireVerification flag
- Can feature flag the homepage change

## Implementation Order

### Phase 1: Backend (Day 1)
1. ✅ Add metadata column to accounts table
2. ✅ Update account-signup endpoint:
   - Add reCAPTCHA verification
   - Add email verification requirement option
   - Store pending request in metadata
3. ✅ Update verify-email endpoint:
   - Create vetted sites request after verification
   - Clear pending request

### Phase 2: Frontend (Day 1-2)
1. ✅ Create VettedSitesLeadForm component
2. ✅ Add RecaptchaProvider to marketing layout
3. ✅ Integrate form into homepage
4. ✅ Test complete flow

### Phase 3: Polish (Day 2)
1. ✅ Error handling improvements
2. ✅ Loading states
3. ✅ Success messaging
4. ✅ Mobile responsiveness
5. ✅ Analytics tracking

## Key Decisions Made

1. **USE existing `/api/auth/account-signup`** - Don't create new endpoint
2. **REQUIRE email verification** for lead magnet signups
3. **USE existing reCAPTCHA** infrastructure
4. **STORE pending request** in account metadata (JSONB)
5. **PROGRESSIVE form** - URL first, then signup fields

## Testing Checklist

- [ ] reCAPTCHA validates properly
- [ ] Email verification sent
- [ ] Account created with pending status
- [ ] Pending request stored in metadata
- [ ] Verification link works
- [ ] Request created after verification
- [ ] User auto-logged in after verification
- [ ] Redirect to request details works
- [ ] Existing signup flows unaffected
- [ ] Mobile responsive
- [ ] Error states handled

## Environment Variables Needed
```env
# Already in production:
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx
RESEND_API_KEY=xxx
```

## Next Immediate Steps

1. Create migration for accounts.metadata column
2. Start with backend changes to account-signup
3. Test with Postman/curl before frontend
4. Build progressive form component
5. Integrate and test end-to-end