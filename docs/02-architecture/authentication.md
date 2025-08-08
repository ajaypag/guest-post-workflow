# Authentication System Documentation

> **Last Updated**: 2025-08-08  
> **Status**: ✅ Production Ready  
> **Architecture**: JWT + HTTP-only Cookies

## Overview

Dual-tier authentication system supporting internal team members and external clients with JWT-based sessions, HTTP-only cookies, role-based permissions, and comprehensive security features.

## User Types

### 1. Internal Users
**Table**: `users`  
**Purpose**: Team members with system access  
**Login**: `/login` or `/api/auth/login`

**Roles**:
- `admin`: Full system access
- `user`: Standard internal access

**Access**:
- All admin endpoints (`/admin/*`)
- All client data and orders
- System configuration
- Diagnostic tools

### 2. Account Users (External Clients)
**Table**: `accounts`  
**Purpose**: Customers purchasing guest posts  
**Login**: `/account/login` or `/api/auth/account/login`

**Roles**:
- `admin`: Account administrator
- `editor`: Create/edit orders
- `viewer`: Read-only access

**Access**:
- Own account data only
- Orders they created
- Assigned clients
- Account dashboard (`/account/*`)

### 3. Publishers (Planned)
**Table**: `publishers`  
**Purpose**: Website owners providing placements  
**Status**: Schema exists, implementation pending

## Authentication Flows

### Login Process

#### Internal User Login
```mermaid
User -> Login Page -> API /auth/login
API -> Check Rate Limit (5/15min)
API -> Verify Credentials (users table)
API -> Generate JWT (7 days)
API -> Set HTTP-only Cookie
API -> Return User Data
```

#### Account User Login
```mermaid
User -> Account Login -> API /auth/account/login
API -> Check Rate Limit (5/15min)
API -> Verify Credentials (accounts table)
API -> Check Account Status (active)
API -> Generate JWT (7 days)
API -> Set HTTP-only Cookie
API -> Update lastLoginAt
API -> Return User Data
```

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  userType: 'internal' | 'account' | 'publisher';
  accountId?: string;    // For account users
  clientId?: string;     // Primary client
  companyName?: string;  // For accounts
  exp: number;          // Expiry (7 days)
  iat: number;          // Issued at
}
```

### Cookie Configuration
```typescript
// Production settings
{
  httpOnly: true,        // Prevent XSS
  secure: true,          // HTTPS only
  sameSite: 'lax',      // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/'
}
```

**Cookie Names**:
- Internal: `auth-token`
- Account: `auth-token-account`

### Token Refresh
**Endpoint**: `/api/auth/account/refresh`

**Logic**:
1. Accept expired tokens up to 7 days
2. Reject if expired > 7 days
3. Generate new token with same claims
4. Set fresh cookie
5. Auto-refresh every 5 minutes on client

### Password Reset Flow

#### Request Reset
```typescript
POST /api/auth/account/forgot-password
{
  email: "user@example.com"
}

// Response always 200 (prevent enumeration)
{
  success: true,
  message: "If account exists, email sent"
}
```

#### Complete Reset
```typescript
POST /api/auth/account/reset-password
{
  token: "reset-token-from-email",
  password: "NewSecurePassword123"
}
```

**Security**:
- Token valid for 1 hour
- Cryptographically secure generation
- Hashed storage in database
- Rate limited (3 attempts/hour)

## Security Features

### Rate Limiting
```typescript
// In-memory implementation
const rateLimiter = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000  // 15 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000  // 1 hour
  }
};
```

### Password Requirements
- Minimum 8 characters
- Must contain:
  - Uppercase letter
  - Lowercase letter
  - Number
- Bcrypt hash with 10 salt rounds

### Session Security
- HTTP-only cookies (no JS access)
- Secure flag in production
- 7-day expiration
- Automatic cleanup of expired sessions
- CSRF protection via SameSite

## Route Protection

### Middleware Configuration
```typescript
// middleware.ts
const protectedRoutes = {
  '/admin/*': 'internal',      // Internal users only
  '/account/*': 'account',     // Account users only
  '/api/admin/*': 'internal',  // Internal API
  '/api/account/*': 'account', // Account API
  '/api/expensive/*': 'any'    // Any authenticated
};
```

### API Permission Checks
```typescript
// Example: Client access control
export async function checkClientAccess(
  session: AuthSession,
  clientId: string
): Promise<boolean> {
  if (session.userType === 'internal') {
    return true; // Full access
  }
  
  if (session.userType === 'account') {
    // Check ownership
    const client = await getClient(clientId);
    return client.accountId === session.userId;
  }
  
  return false;
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Internal login
- `POST /api/auth/account/login` - Account login
- `POST /api/auth/account/logout` - Logout
- `GET /api/auth/session` - Get session
- `GET /api/auth/account/verify` - Verify token
- `POST /api/auth/account/refresh` - Refresh token

### Password Management
- `POST /api/auth/forgot-password` - Request reset (internal)
- `POST /api/auth/account/forgot-password` - Request reset (account)
- `POST /api/auth/reset-password` - Complete reset (internal)
- `POST /api/auth/account/reset-password` - Complete reset (account)
- `POST /api/account/change-password` - Change password

### Account Management
- `POST /api/accounts/signup` - Self-service signup
- `GET /api/accounts` - List accounts (internal only)
- `POST /api/accounts` - Create account (internal only)
- `PUT /api/accounts/[id]` - Update account
- `GET /api/account/profile` - Get own profile
- `PUT /api/account/profile` - Update profile

## Client-Side Integration

### Auth Service
```typescript
// lib/auth.ts
class AuthService {
  static getSession(): AuthSession | null
  static setSession(session: AuthSession): void
  static clearSession(): void
  static startTokenRefresh(): void
  static isAuthenticated(): boolean
}
```

### React Components

#### AuthWrapper (Internal)
```tsx
<AuthWrapper requireAdmin={true}>
  {/* Protected content */}
</AuthWrapper>
```

#### AccountAuthWrapper
```tsx
<AccountAuthWrapper>
  {(user, logout) => (
    <div>
      Welcome {user.name}
      <button onClick={logout}>Logout</button>
    </div>
  )}
</AccountAuthWrapper>
```

### Auto-Refresh Implementation
```typescript
// Refreshes token every 5 minutes
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/auth/account/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      AuthService.setSession(data.user);
    }
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

## Database Schema

### Users Table (Internal)
```sql
users {
  id: UUID PRIMARY KEY
  email: string UNIQUE
  password: string (bcrypt hash)
  name: string
  role: enum('admin', 'user')
  resetToken: string
  resetTokenExpiry: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Accounts Table (External)
```sql
accounts {
  id: UUID PRIMARY KEY
  email: string UNIQUE
  password: string (bcrypt hash)
  name: string
  companyName: string
  role: enum('admin', 'editor', 'viewer')
  status: enum('active', 'inactive', 'suspended')
  emailVerified: boolean
  resetPasswordToken: string
  resetPasswordExpires: timestamp
  lastLoginAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Environment Configuration

```env
# Required
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Optional
JWT_SECRET=separate-jwt-secret
SESSION_TIMEOUT=604800  # 7 days in seconds
RATE_LIMIT_ENABLED=true
```

## Common Issues & Solutions

### 1. Token Expired
**Symptom**: User logged out unexpectedly  
**Solution**: Check auto-refresh is running
```typescript
// Verify refresh endpoint
curl -X POST /api/auth/account/refresh \
  --cookie "auth-token-account=expired-token"
```

### 2. Permission Denied
**Symptom**: 403 errors on API calls  
**Check**:
```typescript
// Verify session
const session = AuthService.getSession();
console.log(session.userType, session.role);

// Check middleware protection
// Ensure route patterns match in middleware.ts
```

### 3. Rate Limit Hit
**Symptom**: 429 Too Many Requests  
**Solution**: Wait for window to expire
- Login: 15 minutes
- Password reset: 1 hour

### 4. Cookie Not Set
**Symptom**: Login succeeds but session lost  
**Check**:
- HTTPS in production (Secure flag)
- Correct domain configuration
- SameSite settings

## Security Best Practices

### Implementation
1. ✅ HTTP-only cookies prevent XSS
2. ✅ CSRF protection via SameSite
3. ✅ Rate limiting on auth endpoints
4. ✅ Secure password requirements
5. ✅ Bcrypt for password hashing
6. ✅ Constant-time comparison
7. ✅ No user enumeration

### Monitoring
```sql
-- Failed login attempts
SELECT email, COUNT(*) as attempts
FROM auth_logs
WHERE success = false
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 3;

-- Suspicious activity
SELECT * FROM accounts
WHERE last_login_at IS NOT NULL
AND last_login_at > created_at + INTERVAL '5 minutes';
```

## Future Improvements

### Planned
1. Publisher authentication completion
2. Redis-based rate limiting
3. Email verification for signups
4. 2FA/MFA support
5. OAuth providers (Google, GitHub)
6. Session activity tracking
7. Device management

### Under Consideration
1. Passwordless authentication
2. Biometric support
3. Risk-based authentication
4. IP allowlisting
5. Audit logging

---

**Note**: Authentication system is production-ready with comprehensive security. Rate limiting currently uses in-memory storage - consider Redis for distributed deployments.