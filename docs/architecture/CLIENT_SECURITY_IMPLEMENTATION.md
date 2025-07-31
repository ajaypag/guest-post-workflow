# Client Management Security Implementation

## Overview

This document outlines the security implementation for the client management system, following the established patterns from the order system.

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