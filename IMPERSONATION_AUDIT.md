# User Impersonation Implementation Audit

## Executive Summary
Implementing user impersonation in the Guest Post Workflow application is **moderately complex** but achievable with the current architecture. The system already has a robust JWT-based authentication system that can be extended to support impersonation with proper security safeguards.

**Estimated Complexity: 6/10**
**Estimated Implementation Time: 3-5 days**

## Current Authentication Architecture

### User Types & Sessions
The application has three distinct user types:
1. **Internal Users** (`userType: 'internal'`) - Team members
2. **Account Users** (`userType: 'account'`) - External clients  
3. **Publisher Users** (`userType: 'publisher'`) - Content publishers

### Authentication Flow
```typescript
AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole; // 'admin' | 'user' | 'viewer' | 'editor'
  userType: UserType; // 'internal' | 'account' | 'publisher'
  accountId?: string;
  clientId?: string;
  companyName?: string;
  publisherId?: string;
  status?: string;
}
```

### Current Session Management
- **JWT Tokens**: Stored in HTTP-only cookies (`auth-token`, `auth-token-account`, `auth-token-publisher`)
- **Token Verification**: Server-side via `AuthServiceServer.getSession()`
- **Cookie Priority**: Publisher → Account → Internal (checks in order)
- **Expiration**: 7 days

## Impersonation Design Proposal

### Architecture Overview
```
Admin User → Impersonate → Target User
    ↓                          ↓
Original JWT              Modified JWT
(admin session)          (target + admin tracking)
```

### Implementation Approach

#### 1. Enhanced JWT Structure
Add impersonation fields to the JWT payload:
```typescript
interface ImpersonationSession extends AuthSession {
  // Original admin who initiated impersonation
  impersonatedBy?: {
    userId: string;
    email: string;
    name: string;
    startedAt: string;
  };
  isImpersonating?: boolean;
}
```

#### 2. Database Schema Addition
```sql
CREATE TABLE impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL,
  target_user_type VARCHAR(20) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

#### 3. New API Endpoints
```
POST /api/admin/impersonate/start
  - Body: { targetUserId, targetUserType, reason }
  - Returns: New session with impersonation data

POST /api/admin/impersonate/end
  - Ends impersonation, restores admin session
  
GET /api/admin/impersonate/status
  - Returns current impersonation status
```

#### 4. UI Components

##### Admin Impersonation Interface
```
/admin/users → [Impersonate Button] → Modal:
  - Select User Type (Account/Publisher)
  - Search/Select User
  - Enter Reason (required)
  - Confirm with 2FA (optional but recommended)
```

##### Impersonation Banner
Persistent banner when impersonating:
```
[!] Impersonating: John Doe (account user) | Started: 2:34 PM | [End Impersonation]
```

## Security Considerations

### Required Safeguards

1. **Permission Control**
   - Only `role: 'admin'` AND `userType: 'internal'` can impersonate
   - Cannot impersonate other admins
   - Cannot perform destructive actions while impersonating

2. **Audit Trail**
   - Log all impersonation starts/ends
   - Track all actions during impersonation
   - Include IP address and user agent

3. **Visual Indicators**
   - Persistent banner during impersonation
   - Different color scheme or border
   - Watermark on sensitive pages

4. **Restrictions During Impersonation**
   - Cannot change passwords
   - Cannot delete accounts
   - Cannot access billing/payment methods
   - Cannot impersonate another user (no chaining)

5. **Automatic Termination**
   - End after 2 hours (configurable)
   - End on browser close
   - End on logout

## Implementation Complexity Analysis

### Easy Parts (Already Exist)
✅ JWT infrastructure  
✅ Cookie management  
✅ Session verification  
✅ User type system  
✅ Role-based permissions  

### Moderate Complexity
⚡ Modifying JWT structure  
⚡ Creating impersonation UI  
⚡ Adding audit logging  
⚡ Session switching logic  

### Complex Parts
⚠️ Maintaining dual session state  
⚠️ Handling edge cases (timeouts, concurrent sessions)  
⚠️ Testing all user type combinations  
⚠️ Ensuring security across all endpoints  

## Implementation Steps

### Phase 1: Backend Foundation (Day 1-2)
1. Extend JWT token structure
2. Create impersonation service
3. Add database tables for logging
4. Implement start/end endpoints
5. Add middleware for impersonation checks

### Phase 2: Security Layer (Day 2-3)
1. Add permission checks
2. Implement audit logging
3. Add action restrictions
4. Create automatic termination logic
5. Add rate limiting

### Phase 3: Frontend Implementation (Day 3-4)
1. Create admin impersonation UI
2. Add impersonation banner component
3. Modify header to show impersonation status
4. Add visual indicators
5. Handle session switching

### Phase 4: Testing & Edge Cases (Day 4-5)
1. Test all user type combinations
2. Test permission boundaries
3. Test automatic termination
4. Test concurrent sessions
5. Security audit

## Code Examples

### Starting Impersonation
```typescript
// /api/admin/impersonate/start
export async function POST(request: NextRequest) {
  const session = await AuthServiceServer.getSession();
  
  // Verify admin permissions
  if (!session || session.userType !== 'internal' || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { targetUserId, targetUserType, reason } = await request.json();
  
  // Get target user details
  const targetUser = await getTargetUser(targetUserId, targetUserType);
  
  // Create impersonation session
  const impersonationToken = await AuthServiceServer.createImpersonationSession({
    ...targetUser,
    impersonatedBy: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      startedAt: new Date().toISOString()
    },
    isImpersonating: true
  });
  
  // Log impersonation
  await logImpersonation(session.userId, targetUserId, targetUserType, reason);
  
  // Set new cookie
  response.cookies.set('auth-token-impersonation', impersonationToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7200 // 2 hours max
  });
  
  return response;
}
```

### Impersonation Banner Component
```tsx
export function ImpersonationBanner() {
  const session = useSession();
  
  if (!session?.isImpersonating) return null;
  
  return (
    <div className="bg-yellow-500 text-black px-4 py-2 fixed top-0 w-full z-50">
      <div className="flex justify-between items-center">
        <div>
          ⚠️ Impersonating: {session.name} ({session.userType})
          | Started: {formatTime(session.impersonatedBy.startedAt)}
        </div>
        <button onClick={endImpersonation} className="btn-danger">
          End Impersonation
        </button>
      </div>
    </div>
  );
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unauthorized access | High | Strict role checking, 2FA for impersonation |
| Action attribution | Medium | Comprehensive audit logs with impersonation flag |
| Session confusion | Medium | Clear visual indicators, automatic termination |
| Data modification | High | Restrict destructive actions during impersonation |
| Privacy concerns | High | Log access, require reason, time limits |

## Alternatives Considered

1. **Read-Only Shadow Mode**: View as user without actual impersonation
   - Pros: Safer, no session switching
   - Cons: Can't test actual workflows

2. **Separate Test Accounts**: Create test versions of user accounts
   - Pros: No production data risk
   - Cons: Doesn't reflect real user state

3. **Screen Sharing/Support Mode**: Request user permission for support
   - Pros: Explicit consent, transparent
   - Cons: Requires user availability

## Recommendation

**Proceed with implementation** using the proposed architecture with these priorities:

1. **Start with Account Users Only**: Begin with impersonating external account users (most common support case)
2. **Require 2FA**: Add two-factor authentication for admins before allowing impersonation
3. **Implement Strict Logging**: Every action during impersonation must be logged
4. **Add Time Limits**: 2-hour maximum impersonation session
5. **Create Admin Dashboard**: Dedicated page showing all active impersonations

## Success Metrics

- Zero security breaches from impersonation
- < 5 second impersonation start time
- 100% audit trail coverage
- Clear UI indicators (user feedback)
- Support ticket resolution time reduced by 30%

## Conclusion

Impersonation is a powerful feature that can significantly improve support capabilities. The current architecture supports it well, requiring mainly additive changes rather than fundamental restructuring. With proper security safeguards and clear UI indicators, this can be implemented safely within a week.

**Recommended Next Steps:**
1. Review and approve design with security team
2. Create detailed technical specification
3. Implement Phase 1 (backend) as proof of concept
4. Security audit before frontend implementation
5. Gradual rollout to admin team