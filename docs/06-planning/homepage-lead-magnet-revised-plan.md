# Homepage Lead Magnet - Revised Implementation Plan

## Audit Results

### What We Already Have ✅

1. **Account Signup System** (`/api/auth/account-signup/route.ts`)
   - Creates accounts with email, password, name, company
   - Hashes passwords with bcrypt
   - Sends welcome email via EmailService
   - Auto-creates session and sets auth cookie
   - NO email verification required currently (instant activation)

2. **Email Verification System** (`/api/auth/verify-email/route.ts`)
   - Verifies accounts using emailVerificationToken
   - Auto-login after verification
   - Resend verification capability
   - BUT: Not currently used in signup flow (accounts are instantly active)

3. **Vetted Sites Request API** (`/api/vetted-sites/requests/route.ts`)
   - Creates requests with target_urls array
   - Requires authenticated session
   - Links to accountId automatically
   - Supports filters and notes

4. **Email Service** (`lib/services/emailService.ts`)
   - `sendAccountWelcome()` - Welcome email
   - `sendEmailVerification()` - Verification email
   - Using Resend API (already configured)

5. **Components**
   - `QuickVettedSitesRequest.tsx` - Form for creating requests (authenticated users)
   - Marketing homepage already exists

### What We DON'T Have ❌

1. **Combined Signup + Request Creation**
   - Need endpoint that creates both account AND request atomically

2. **Progressive Disclosure Form**
   - Need form that captures URL first, then reveals signup

3. **reCAPTCHA Integration**
   - No reCAPTCHA configured (no env vars, no implementation)

4. **Email Verification Requirement**
   - Current signup doesn't require verification
   - Need to modify flow to require verification before showing results

## Revised Implementation Approach

### Option A: Minimal Changes (Recommended)
Use existing endpoints with slight modifications:

1. **Frontend Form Component**
   - Create progressive disclosure form
   - Step 1: Capture target URL
   - Step 2: Show signup form
   - On submit: Call existing `/api/auth/account-signup` then `/api/vetted-sites/requests`

2. **Small API Modifications**
   - Modify account-signup to optionally require email verification
   - Add flag to store pending request data in account metadata
   - After verification, auto-create the request

3. **Benefits**
   - Reuses ALL existing infrastructure
   - Minimal new code to maintain
   - Less chance of breaking existing flows

### Option B: New Combined Endpoint
Create single endpoint that handles both:

1. **New Endpoint** `/api/auth/signup-with-request`
   - Transaction: Create account + request together
   - Send verification email
   - Store request as pending until verified

2. **Benefits**
   - Cleaner, atomic operation
   - Better error handling

3. **Drawbacks**
   - Duplicates logic from existing endpoints
   - More code to maintain

## Recommended Implementation Steps

### Phase 1: Core Functionality (No reCAPTCHA)

1. **Create Progressive Form Component**
```tsx
// components/VettedSitesLeadForm.tsx
- Step 1: URL input only
- Step 2: Reveal signup form (reuse fields from account-signup)
- Submit: Sequential API calls
```

2. **Modify Account Signup (Minor)**
```typescript
// Add to /api/auth/account-signup
- Add optional `pendingRequest` field to store URL
- Add `requireVerification` flag
- If true: Set account status='pending', generate verification token
```

3. **Handle Post-Verification**
```typescript
// Modify /api/auth/verify-email
- After verification, check for pendingRequest
- If exists: Auto-create vetted sites request
- Redirect to request details page
```

4. **Integration**
```typescript
// Add to marketing homepage
- Replace or supplement existing hero
- Progressive form above the fold
```

### Phase 2: Enhancements

1. **Add reCAPTCHA v3**
   - Add env variables
   - Client-side integration
   - Server-side verification

2. **Rate Limiting**
   - Use existing middleware patterns
   - Limit by IP and email

3. **Analytics**
   - Track conversion funnel
   - A/B testing capability

## File Changes Required

### Minimal New Files
```
components/
  VettedSitesLeadForm.tsx     # NEW - Progressive form

app/api/auth/
  account-signup/route.ts     # MODIFY - Add pendingRequest support
  verify-email/route.ts       # MODIFY - Create request after verify
```

### Optional (if going with Option B)
```
app/api/auth/
  signup-with-request/route.ts  # NEW - Combined endpoint
```

## Key Decisions Needed

1. **Email Verification Required?**
   - Current: No verification needed (instant access)
   - Proposed: Require verification for lead magnet signups
   - Impact: Need flag to differentiate signup sources

2. **Where to Store Pending Request?**
   - Option 1: In accounts table (add jsonb column)
   - Option 2: In vettedSitesRequests with 'pending' status
   - Option 3: Session/cookie (risky, might lose data)

3. **reCAPTCHA Priority**
   - Can launch without it initially
   - Add in Phase 2 if spam becomes issue

## Testing Considerations

1. **Existing Flows Must Not Break**
   - Regular account signup (non-lead-magnet)
   - Existing vetted sites request creation
   - Current login/logout flows

2. **New Flow Testing**
   - Progressive form validation
   - Email verification path
   - Request creation after verification
   - Error handling at each step

## Next Steps

1. **Confirm approach** - Option A (minimal) or Option B (combined)?
2. **Decide on verification** - Required or optional for lead magnets?
3. **Start with form component** - Can test UI without backend changes
4. **Incremental backend changes** - One endpoint at a time
5. **Test thoroughly** - Ensure no regression

## Advantages of This Approach

- **Leverages existing code** - 80% already built
- **Minimal new dependencies** - No new packages needed
- **Low risk** - Can feature flag the homepage change
- **Fast implementation** - Could be done in 1-2 days
- **Easy rollback** - If issues, just hide the form