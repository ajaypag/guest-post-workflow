# Client Management Security Implementation

## Overview

This document outlines the security implementation for the client management system, following the established patterns from the order system.

## Current Status (2025-01-31)

### ✅ Completed Work
1. **Unified UI Implementation**
   - Single interface for both internal and account users at `/clients/new`
   - Account users see simplified flow without 3-step selection
   - Proper account pre-selection for account users
   - Fixed placeholder text formatting issue

2. **Security Implementation**
   - All client API endpoints secured with authentication
   - Row-level security for account users
   - Permission checks following existing order system patterns
   - Added comprehensive security middleware and utilities

3. **System User Solution**
   - Created system user (ID: 00000000-0000-0000-0000-000000000000)
   - Handles foreign key constraint for account-created clients
   - Admin tool at `/admin/create-system-user`
   - Fixes "created_by expects user ID" error for account users

4. **Missing Endpoint Fix**
   - Added `/api/auth/session` endpoint for custom auth system
   - Resolved 404 errors on session checks

### ⚠️ Known Issues & Solutions

#### Cookie Conflict Issue
**Problem**: Admin users couldn't see clients/bulk analysis data
**Cause**: Cookie priority issue when both `auth-token` (internal) and `auth-token-account` cookies exist
**Solution**: 
- Clear all cookies and log in fresh
- Root cause: Different cookie names for different user types can conflict
**Status**: Identified but not permanently fixed - needs proper cookie management

### 🔄 Next Steps
1. **Cookie Management Fix**
   - Implement proper handling of multiple auth tokens
   - Consider unified cookie approach or proper priority system
   - Add cookie cleanup on logout

2. **Order System Migration**
   - Orders currently reference users.id directly
   - Need to migrate to support both internal users and accounts
   - See: `/docs/architecture/ORDER_SYSTEM_IMPLEMENTATION.md`

3. **Additional Features**
   - Account switching UI for users with multiple accounts
   - Better session management for dual-role users
   - Audit logging for security-sensitive actions

## Authentication Pattern

Following the pattern established in the order system (see [ORDER_SYSTEM_IMPLEMENTATION.md](./ORDER_SYSTEM_IMPLEMENTATION.md)), we use a consistent authentication approach across all client-related endpoints.

### User Types and Permissions

#### Internal Users
- **Access**: Full CRUD operations on all clients
- **Create**: Can create clients with any configuration (existing account, invitation, share link)
- **Read**: Can view all clients, including orphaned ones
- **Update**: Can update any client
- **Delete**: Can delete any client
- **Special**: Can view internal metadata (createdBy, shareToken, invitationId)

#### Account Users  
- **Access**: Limited to their own clients only
- **Create**: Can only create clients for their own account (existing_account path only)
- **Read**: Can only view clients where `accountId` matches their userId
- **Update**: Can only update their own clients, cannot change ownership
- **Delete**: Can delete their own clients
- **Restricted**: Cannot see internal metadata

## API Security Implementation

### Authentication Check Pattern
```typescript
// Consistent pattern across all endpoints
const session = await AuthServiceServer.getSession(request);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Permission Check Pattern
```typescript
// Check access - both internal and account users allowed with different permissions
if (session.userType === 'internal') {
  // Internal users: Full access
} else if (session.userType === 'account') {
  // Account users: Check ownership
  if (resource.accountId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden - Account access denied' }, { status: 403 });
  }
} else {
  return NextResponse.json({ error: 'Unauthorized - Invalid user type' }, { status: 401 });
}
```

## Implemented Endpoints

### 1. Client List (`/api/clients`)
- **GET**: Returns filtered list based on user type
  - Internal: All clients
  - Account: Only their clients

### 2. Client Creation (`/api/clients`)
- **POST**: Creates new client with permission checks
  - Internal: All creation paths allowed
  - Account: Only `existing_account` path, forced to their own account

### 3. Individual Client (`/api/clients/[id]`)
- **GET**: View client with ownership check
- **PUT**: Update client with ownership check and field restrictions
- **DELETE**: Delete client with ownership check

### 4. Target Pages (`/api/clients/[id]/target-pages`)
- **GET**: View target pages with client ownership check
- **POST**: Add target pages with client ownership check
- **PUT**: Update target page status with client ownership check
- **DELETE**: Remove target pages with client ownership check

## Frontend Integration

### UI Adaptations
1. **Dynamic text**: "Clients" vs "Brands" based on user type
2. **Hidden features**: Internal-only badges and metadata hidden from account users
3. **Pre-filled data**: Account users have their account pre-selected
4. **Simplified flow**: Account users skip path selection

### API Call Security
```typescript
// All API calls include credentials
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for session cookies
  body: JSON.stringify(data)
});
```

## Row-Level Security

### Database Queries
Account users automatically get filtered results:
```typescript
// In ClientService
if (session.userType === 'account') {
  clients = await ClientService.getClientsByAccount(session.userId);
}
```

### Data Sanitization
Sensitive fields removed for account users:
```typescript
// lib/auth/clientPermissions.ts
export function sanitizeClientData(session: AuthSession, client: any): any {
  if (session.userType === 'account') {
    // Remove internal metadata
    const { createdBy, shareToken, invitationId, ...publicData } = client;
    return publicData;
  }
  return client;
}
```

## Error Responses

Consistent error messages across the system:
- `401 Unauthorized`: No session or invalid session
- `403 Forbidden - Account access denied`: Account user trying to access others' resources
- `403 Forbidden - [Specific action] denied`: Specific permission failures
- `404 Not found`: Resource doesn't exist or user has no access

## Security Utilities

Created `lib/auth/clientPermissions.ts` with reusable permission checking functions:
- `canViewClient()`
- `canCreateClient()`
- `canUpdateClient()`
- `canDeleteClient()`
- `getClientFilter()`
- `sanitizeClientData()`
- `getClientPermissions()`

## Testing Checklist

### Account User Testing
- [ ] Can only see their own clients
- [ ] Can create clients only for themselves
- [ ] Cannot access other accounts' clients
- [ ] Cannot change client ownership
- [ ] Cannot see internal metadata

### Internal User Testing
- [ ] Can see all clients
- [ ] Can create clients with any configuration
- [ ] Can access any client
- [ ] Can update any client
- [ ] Can see all metadata

### Error Handling
- [ ] Proper 401 for unauthenticated requests
- [ ] Proper 403 for unauthorized access
- [ ] Consistent error messages
- [ ] No information leakage in errors

## Future Considerations

1. **Granular Permissions**: Could add role-based permissions within account users
2. **Audit Logging**: Track who makes changes to clients
3. **Rate Limiting**: Prevent abuse of API endpoints
4. **Field-Level Permissions**: Control which fields different users can update