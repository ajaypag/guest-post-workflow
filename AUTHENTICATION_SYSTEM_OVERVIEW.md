# Authentication System Overview
## Date: 2025-08-16

## Three User Types & Authentication Systems

### 1. Internal Users (Staff/Admin)
- **Table**: `users`
- **User Type**: `internal`
- **Cookie**: `auth-token`
- **Login Page**: `/login`
- **Dashboard**: `/admin/*` pages
- **Redirect on Auth Failure**: `/login`

### 2. Account Users (External Clients)
- **Table**: `accounts`
- **User Type**: `account`
- **Cookie**: `auth-token-account`
- **Login Page**: `/account/login`
- **Dashboard**: `/account/*` pages
- **Redirect on Auth Failure**: `/account/login`
- **Component Protection**: `AccountAuthWrapper` component

### 3. Publisher Users
- **Table**: `publishers`
- **User Type**: `publisher`
- **Cookie**: `auth-token-publisher`
- **Login Page**: `/publisher/login`
- **Dashboard**: `/publisher/*` pages
- **Redirect on Auth Failure**: `/publisher/login`

## Authentication Flow

### Login Process
1. User submits credentials to respective login endpoint:
   - Internal: `/api/auth/login`
   - Account: `/api/auth/account-login`
   - Publisher: `/api/auth/publisher/login`

2. Server validates credentials against respective table
3. JWT token created with user info and `userType`
4. Token stored in HTTP-only cookie with specific name
5. User redirected to respective dashboard

### Protected Routes

#### Middleware Protection (middleware.ts)
- **Admin Pages** (`/admin/*`): Requires `internal` userType, redirects to `/login`
- **Account Pages** (`/account/*`): Requires `account` userType, redirects to `/account/login`
- **Publisher Pages** (`/publisher/*`): Requires `publisher` userType, redirects to `/publisher/login`

#### API Endpoints
- **Admin API** (`/api/admin/*`): Requires `internal` userType
- **Account API** (`/api/account/*`): Requires `account` userType
- **Publisher API** (`/api/publisher/*`): Requires `publisher` userType

## Key Fixes Implemented

### 1. Publisher Redirect Fix
**Problem**: Publishers were being redirected to `/login` instead of `/publisher/login`
**Solution**: Added specific middleware protection for publisher routes with correct redirect

```typescript
// Publisher pages protection
if (path.startsWith('/publisher')) {
  // Redirect to /publisher/login if not authenticated
  url.pathname = '/publisher/login';
}
```

### 2. Account Redirect Fix
**Problem**: Account users needed proper middleware protection
**Solution**: Added middleware protection for account routes

```typescript
// Account pages protection
if (path.startsWith('/account')) {
  // Redirect to /account/login if not authenticated
  url.pathname = '/account/login';
}
```

### 3. Publisher API Protection
**Problem**: Publisher API endpoints were not protected
**Solution**: Added API endpoint protection for `/api/publisher/*` routes

## Testing Checklist

### Internal User Flow
- [ ] Login at `/login`
- [ ] Access `/admin` pages
- [ ] Logout redirects to `/login`
- [ ] Cannot access `/account/*` or `/publisher/*` pages

### Account User Flow
- [ ] Login at `/account/login`
- [ ] Access `/account/*` pages
- [ ] Logout redirects to `/account/login`
- [ ] Cannot access `/admin/*` or `/publisher/*` pages

### Publisher User Flow
- [ ] Login at `/publisher/login`
- [ ] Access `/publisher/*` pages
- [ ] Logout redirects to `/publisher/login`
- [ ] Cannot access `/admin/*` or `/account/*` pages

## Cookie Management

Each user type has its own cookie to prevent conflicts:
- `auth-token`: Internal users
- `auth-token-account`: Account users
- `auth-token-publisher`: Publisher users

This allows users to be logged into multiple systems simultaneously without interference.

## Security Considerations

1. **JWT Secret**: Unified across all services using `NEXTAUTH_SECRET` environment variable
2. **HTTP-Only Cookies**: Prevents XSS attacks
3. **User Type Validation**: Each protected route validates the user type
4. **Token Expiration**: 7-day expiration for all tokens
5. **Redirect Parameters**: Preserved during authentication flow to return users to intended page