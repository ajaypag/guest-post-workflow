# Impersonation System - Proper Architecture Design

**Status**: 📋 Planning Phase  
**Created**: 2025-08-24  
**Version**: 2.0 (Redesigned after first iteration learnings)

## 🎯 **Executive Summary**

This document outlines the proper architecture for implementing admin user impersonation, incorporating lessons learned from the first iteration that suffered from cookie proliferation and architectural shortcuts.

## 🚨 **Problems Identified from First Iteration**

### Cookie Proliferation Issues
- **Problem**: Created separate cookies for impersonation and admin backup
- **Impact**: Browser cookie limits, session confusion, development pain
- **User Experience**: "Jumbled mess of nonsense" during testing workflows

### Authentication Complexity
- **Problem**: Extended existing JWT structure instead of proper session management
- **Impact**: Token bloat, security surface expansion, restoration complexity

### Missing Security Implementation
- **Problem**: Mentioned action restrictions but didn't implement enforcement
- **Critical Gap**: Billing, passwords, deletions not actually blocked during impersonation

### Development Experience
- **Problem**: No proper testing strategy, manual cookie clearing required
- **Impact**: Frustrating development workflow, unpredictable session states

## 🏗️ **Proper Architecture Design**

### Core Principle: Single Session Store
Instead of multiple cookies, use a **single session identifier** with server-side session state management.

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   Browser       │    │   Session Store   │    │   Database      │
│                 │    │                   │    │                 │
│ auth-session:   │◄──►│ sessionId: {      │◄──►│ impersonation_  │
│ "abc123"        │    │   currentUser,    │    │ logs            │
│ (single cookie) │    │   impersonation,  │    │                 │
│                 │    │   permissions     │    │ user tables     │
└─────────────────┘    │ }                 │    │                 │
                       └───────────────────┘    └─────────────────┘
```

### Session State Structure
```typescript
interface SessionState {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  
  // Current active user (could be admin or impersonated user)
  currentUser: {
    userId: string;
    email: string;
    name: string;
    userType: 'internal' | 'account' | 'publisher';
    role: string;
    accountId?: string;
    publisherId?: string;
  };
  
  // Impersonation metadata (only present when impersonating)
  impersonation?: {
    isActive: true;
    adminUser: {
      userId: string;
      email: string;
      name: string;
    };
    targetUser: {
      userId: string;
      email: string;
      name: string;
      userType: 'account' | 'publisher';
    };
    startedAt: Date;
    reason: string;
    logId: string;
    restrictedActions: string[];
  };
  
  // Security and tracking
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
}
```

## 🛡️ **Security Architecture**

### Action Restriction Middleware
```typescript
// Middleware that runs on every API request during impersonation
class ImpersonationMiddleware {
  static async checkRestrictedAction(
    sessionState: SessionState, 
    request: NextRequest
  ): Promise<boolean> {
    if (!sessionState.impersonation?.isActive) return true;
    
    const restrictedPaths = [
      '/api/billing/*',
      '/api/auth/change-password',
      '/api/users/delete',
      '/api/payments/process',
      '/api/account/delete'
    ];
    
    return !restrictedPaths.some(path => 
      request.url.match(pathToRegex(path))
    );
  }
}
```

### Permission Validation
- **Admin Verification**: Only internal users with admin role can initiate
- **Target Validation**: Can only impersonate account and publisher users
- **Chain Prevention**: Impersonating users cannot impersonate others
- **Time Limits**: Configurable session timeout (default 2 hours)

## 📊 **Database Schema Design**

### Impersonation Logs Table
```sql
CREATE TABLE impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL,
  target_user_type VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  ip_address INET,
  user_agent TEXT,
  actions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Action Audit Trail
```sql
CREATE TABLE impersonation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES impersonation_logs(id),
  action_type VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_data JSONB,
  response_status INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Session Store Table
```sql
CREATE TABLE user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Index for cleanup of expired sessions
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
```

## 🔧 **Implementation Components**

### 1. Session Manager Service
```typescript
class SessionManager {
  // Core session operations
  static async createSession(user: User): Promise<string>
  static async getSession(sessionId: string): Promise<SessionState | null>
  static async updateSession(sessionId: string, updates: Partial<SessionState>): Promise<void>
  static async deleteSession(sessionId: string): Promise<void>
  
  // Impersonation operations
  static async startImpersonation(sessionId: string, targetUserId: string, reason: string): Promise<void>
  static async endImpersonation(sessionId: string): Promise<void>
  
  // Cleanup and maintenance
  static async cleanupExpiredSessions(): Promise<void>
}
```

### 2. Impersonation Service
```typescript
class ImpersonationService {
  static async canImpersonate(adminSession: SessionState, targetUserId: string): Promise<boolean>
  static async startImpersonation(adminSessionId: string, targetUserId: string, reason: string): Promise<ImpersonationLog>
  static async endImpersonation(sessionId: string): Promise<void>
  static async logAction(logId: string, action: ActionLog): Promise<void>
  static async getActiveSessions(): Promise<ImpersonationLog[]>
}
```

### 3. Authentication Middleware
```typescript
// Replaces AuthServiceServer.getSession()
class AuthenticationService {
  static async getSessionFromRequest(request: NextRequest): Promise<SessionState | null>
  static async requireAuth(request: NextRequest): Promise<SessionState>
  static async requireRole(request: NextRequest, role: string): Promise<SessionState>
}
```

### 4. Action Restriction Middleware
```typescript
export async function impersonationMiddleware(request: NextRequest) {
  const session = await AuthenticationService.getSessionFromRequest(request);
  
  if (session?.impersonation?.isActive) {
    const isRestricted = await ImpersonationMiddleware.checkRestrictedAction(session, request);
    if (isRestricted) {
      return NextResponse.json({ error: 'Action not allowed during impersonation' }, { status: 403 });
    }
    
    // Log the action
    await ImpersonationService.logAction(session.impersonation.logId, {
      actionType: 'API_CALL',
      endpoint: request.url,
      method: request.method,
      timestamp: new Date()
    });
  }
}
```

## 🎨 **Frontend Architecture**

### Context Provider for Impersonation State
```typescript
interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationData: ImpersonationData | null;
  endImpersonation: () => Promise<void>;
  timeElapsed: string;
}

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global impersonation state management
  // Real-time updates via WebSocket or polling
};
```

### Component Structure
```
components/impersonation/
├── ImpersonationProvider.tsx     # Global state management
├── ImpersonationBanner.tsx       # Visual indicator
├── AdminImpersonationPage.tsx    # Main admin interface
├── UserSearchForm.tsx            # Reusable user search
├── UserSelectionList.tsx         # Paginated user list
├── ImpersonationForm.tsx         # Start impersonation form
├── ActiveSessionsList.tsx        # View active sessions
└── ImpersonationHistory.tsx      # Audit trail view
```

## 🧪 **Testing Strategy**

### Unit Tests
- SessionManager service methods
- ImpersonationService business logic
- Permission validation functions
- Action restriction middleware

### Integration Tests
- Full impersonation flow (start → use → end)
- Security restrictions enforcement
- Session cleanup and expiration
- Cookie handling and cleanup

### End-to-End Tests
- Admin impersonation workflow
- User experience during impersonation
- Banner visibility and functionality
- Error handling scenarios

## 📈 **Monitoring & Observability**

### Metrics to Track
- Active impersonation sessions count
- Impersonation attempts per admin
- Restricted action violations
- Session duration averages
- Failed impersonation attempts

### Alerts
- Suspicious impersonation patterns
- Long-running impersonation sessions
- Failed permission checks
- Unusual admin activity

### Audit Dashboard
- Real-time active impersonations
- Historical impersonation reports
- Admin activity patterns
- Security incident tracking

## 🚀 **Migration Strategy**

### Phase 1: Core Infrastructure
1. Implement session store system
2. Create database tables
3. Build SessionManager service
4. Replace AuthServiceServer

### Phase 2: Impersonation Logic
1. Build ImpersonationService
2. Implement action restriction middleware
3. Create audit logging
4. Add security validations

### Phase 3: Frontend Components
1. Build component library
2. Create admin interface
3. Add impersonation banner
4. Implement real-time updates

### Phase 4: Testing & Monitoring
1. Comprehensive test suite
2. Performance optimization
3. Monitoring setup
4. Documentation completion

## ⚡ **Performance Considerations**

### Session Store Optimization
- **Redis**: Primary session store for performance
- **Database**: Backup and audit trail
- **Caching**: Frequently accessed sessions
- **Cleanup**: Automated expired session removal

### Database Indexing
```sql
-- Performance indexes
CREATE INDEX idx_impersonation_logs_admin ON impersonation_logs(admin_user_id, started_at DESC);
CREATE INDEX idx_impersonation_logs_active ON impersonation_logs(status) WHERE status = 'active';
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE expires_at > NOW();
```

## 🔐 **Security Checklist**

- [ ] Admin role verification before impersonation
- [ ] Target user validation (only account/publisher types)
- [ ] Chain prevention (no nested impersonation)
- [ ] Action restrictions enforced at middleware level
- [ ] Comprehensive audit logging
- [ ] Session timeout enforcement
- [ ] IP address and user agent tracking
- [ ] Rate limiting on impersonation attempts
- [ ] CSRF protection on impersonation endpoints
- [ ] Secure session ID generation
- [ ] Session cleanup on security events

## 📝 **Configuration Options**

```env
# Impersonation settings
IMPERSONATION_MAX_DURATION=7200  # 2 hours in seconds
IMPERSONATION_CLEANUP_INTERVAL=300  # 5 minutes
IMPERSONATION_MAX_CONCURRENT=10  # Per admin user
SESSION_STORE_TTL=86400  # 24 hours
REDIS_SESSION_PREFIX=session:
```

## 🎯 **Success Metrics**

### Technical Success
- Single cookie authentication ✓
- No session conflicts ✓
- Clean development experience ✓
- Comprehensive security enforcement ✓

### Business Success
- Admin productivity improvement
- Support ticket resolution time
- Security incident reduction
- Audit compliance readiness

---

## 📋 **Next Steps**

This architecture addresses all the shortcomings from the first iteration:
- ✅ Eliminates cookie proliferation
- ✅ Proper security enforcement
- ✅ Clean development experience
- ✅ Comprehensive testing strategy
- ✅ Production-ready monitoring

Ready for detailed implementation roadmap creation.