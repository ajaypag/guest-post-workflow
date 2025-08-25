# Homepage Lead Magnet Implementation Plan

## Executive Summary
Transform the vetted sites insights request into a lead magnet on the homepage that seamlessly integrates user signup/login with the request submission flow.

## Current State Analysis

### Existing Infrastructure
1. **Authentication System**
   - Account-based authentication with JWT tokens
   - Email verification required for new accounts
   - Separate flows for internal team vs account users
   - Password reset via email functionality

2. **reCAPTCHA Integration**
   - Already implemented in signup flow
   - Using Google reCAPTCHA v3 (invisible)
   - Site key configured via environment variables
   - Token verification on backend

3. **Missing Components**
   - Vetted sites request form components were removed during rebase
   - Need to rebuild the request submission functionality
   - No current integration between homepage and signup flow

## Proposed User Flow

### For New Users
1. User lands on homepage → sees lead magnet form in hero section
2. User enters target URL → clicks "Get Free Insights"
3. Form expands inline to reveal signup fields:
   - Email
   - Password 
   - Contact Name
   - Company (optional)
4. reCAPTCHA executes invisibly in background
5. On submit:
   - Account created with email verification requirement
   - Insights request saved to database
   - User redirected to confirmation page with message: "Check your email to verify and see your insights"
6. After email verification:
   - User auto-logged in
   - Redirected to insights results page
   - Can explore rest of the app

### For Existing Users (Not Logged In)
1. User enters target URL
2. System detects existing account by email
3. Shows password field only (not full signup)
4. On successful login:
   - Request submitted
   - Redirect to insights results

### For Logged-In Users
1. Simple form with just target URL field
2. Instant submission
3. Redirect to results

## Technical Requirements

### 1. Database Schema
```sql
-- Need to create insights_requests table
CREATE TABLE insights_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id),
  target_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  insights_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  INDEX idx_insights_account (account_id),
  INDEX idx_insights_status (status)
);
```

### 2. API Endpoints
```typescript
// POST /api/insights/request
// - Creates insights request
// - Handles signup if new user
// - Returns request ID and status

// GET /api/insights/[id]
// - Retrieves insights results
// - Requires authentication

// POST /api/insights/check-email
// - Checks if email exists for login vs signup flow
```

### 3. Components to Build
```typescript
// components/homepage/InsightsLeadForm.tsx
// - Progressive disclosure form
// - Target URL → Email → Password/Signup fields
// - reCAPTCHA integration
// - Loading states and validation

// app/insights/[id]/page.tsx  
// - Results display page
// - Shows insights data when processed
// - Pending state while processing

// components/insights/InsightsResults.tsx
// - Displays the actual insights data
// - Charts, metrics, recommendations
```

### 4. Authentication Flow Integration
```typescript
// Modified signup flow to handle insights context
interface SignupWithInsights {
  email: string;
  password: string;
  contactName: string;
  targetUrl?: string; // Optional insights request
  source: 'homepage' | 'signup_page';
}
```

## Implementation Steps

### Phase 1: Backend Foundation (Day 1)
1. Create insights_requests database table
2. Build API endpoint for insights submission
3. Modify signup endpoint to accept optional insights data
4. Add email check endpoint for existing users

### Phase 2: Frontend Components (Day 2)
1. Build progressive disclosure form component
2. Integrate reCAPTCHA into new form
3. Add form validation and error handling
4. Create loading and success states

### Phase 3: Results Pages (Day 3)
1. Build insights results page
2. Create pending/processing state UI
3. Add mock insights data for testing
4. Implement actual insights generation (if not existing)

### Phase 4: Integration & Polish (Day 4)
1. Integrate form into marketing homepage
2. Test full flow end-to-end
3. Add analytics tracking
4. Mobile responsiveness optimization

## Potential Blockers & Solutions

### Blocker 1: Missing Vetted Sites Infrastructure
**Issue**: Original vetted sites request functionality was removed during rebase
**Solution**: Rebuild simplified version focused on insights delivery rather than full vetted sites workflow

### Blocker 2: Email Verification Friction
**Issue**: Requiring email verification before showing results may lose users
**Solution**: 
- Option A: Show partial results immediately, full results after verification
- Option B: Save results and send teaser via email to encourage verification

### Blocker 3: Spam/Abuse Prevention
**Issue**: Free insights could be abused by bots or competitors
**Solution**:
- reCAPTCHA v3 scoring (already available)
- Rate limiting by IP and email
- Require business email domains (no gmail, yahoo, etc.)
- Manual review queue for suspicious requests

### Blocker 4: Insights Generation
**Issue**: Need actual insights/analysis logic
**Solution**:
- Start with mock data for MVP
- Can integrate with existing bulk analysis infrastructure
- Or build simplified analysis using existing website data

## Security Considerations

1. **Rate Limiting**
   - Max 3 requests per email per day
   - Max 10 requests per IP per day

2. **Data Privacy**
   - Don't show competitive insights to non-verified users
   - Sanitize target URLs to prevent XSS
   - Store minimal data until email verified

3. **Authentication**
   - Use existing JWT infrastructure
   - Session management for form state
   - CSRF protection on form submission

## Success Metrics

1. **Conversion Metrics**
   - Form start rate (% who enter URL)
   - Form completion rate (% who submit)
   - Email verification rate (% who verify)
   - Account activation rate (% who explore app)

2. **Technical Metrics**
   - Page load time with form
   - Time to insights generation
   - API response times
   - reCAPTCHA pass rate

## Alternative Approaches

### Option A: Separate Landing Page
Instead of homepage integration, create dedicated landing page at `/get-insights`
- Pros: Simpler implementation, better for A/B testing
- Cons: Additional page to maintain, may reduce conversions

### Option B: Modal/Overlay Approach  
Show form in modal overlay instead of inline expansion
- Pros: Cleaner homepage, reusable component
- Cons: Modals can reduce conversions, mobile UX challenges

### Option C: Two-Step Process
Collect email first, send insights via email
- Pros: Simpler flow, no password required initially
- Cons: Lower engagement, users may not return

## Recommendation

Proceed with the inline progressive disclosure approach on the homepage with these priorities:
1. Start with mock insights data to validate the flow
2. Implement basic version without all security features initially
3. Launch as A/B test to measure conversion impact
4. Iterate based on user behavior data

## Next Steps

1. Review and approve this plan
2. Create database migration for insights_requests table
3. Begin Phase 1 implementation
4. Set up analytics tracking for conversion funnel