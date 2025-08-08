# Archive Behavior Documentation

## Overview
The archive functionality provides soft deletion for clients/brands, preserving data while hiding it from normal views.

## Archive Behavior Across Interfaces

### 1. Main Clients/Brands Page (`/clients`)
- **Default View**: Archived clients are hidden
- **Show Archived Toggle**: Available for both internal and account users
- **Visual Indicators**: 
  - Archived clients show with 75% opacity
  - "Archived" badge displayed
  - Archive icon replaced with Restore icon
- **Actions**: Users can archive/restore their own clients

### 2. Account Dashboard (`/account/dashboard`)
- **Default View**: Archived brands are excluded
- **Reasoning**: Dashboard shows active metrics and quick access
- **No Toggle**: Dashboard is for active items only

### 3. Order Creation (`/orders/create`, `/orders/new`)
- **Default View**: Archived clients are excluded
- **Reasoning**: Cannot create orders for archived clients
- **No Toggle**: Only active clients can receive new orders

### 4. Bulk Analysis
- **Default View**: Archived clients are excluded
- **Reasoning**: Active analysis only for active clients
- **No Toggle**: Analysis tools for active clients only

### 5. Website Qualification
- **Default View**: Archived clients are excluded
- **Reasoning**: No need to qualify sites for archived clients
- **No Toggle**: Qualification for active clients only

### 6. API Endpoints
- **GET /api/clients**: Excludes archived by default, accepts `?includeArchived=true`
- **GET /api/accounts/client**: Excludes archived clients
- **ClientService.getAllClients()**: Excludes archived by default
- **ClientService.getClientsByAccount()**: Excludes archived by default

## Archive Rules

### Who Can Archive/Restore
1. **Internal Users**: Can archive/restore any client
2. **Account Users**: Can only archive/restore their own clients (where `accountId` matches)

### Archive Tracking
- `archivedAt`: Timestamp of archival
- `archivedBy`: User ID (null for account users due to FK constraint)
- `archiveReason`: Text reason (includes account email for account users)

### Foreign Key Constraint
The `archivedBy` field references the `users` table, not `accounts`. When account users archive:
- Store `null` in `archivedBy`
- Include account email in `archiveReason` for audit trail

## Best Practices

1. **Default Exclusion**: Archived items should be excluded by default everywhere
2. **Explicit Inclusion**: Only show archived items when explicitly requested
3. **Visual Distinction**: Always make archived items visually distinct
4. **Audit Trail**: Always track who archived and why
5. **Restoration**: Make it easy to restore archived items
6. **Permissions**: Respect ownership - users can only archive their own items

## Implementation Checklist

- [x] Main clients page filters archived by default
- [x] Show Archived toggle available for all users
- [x] Visual indicators for archived clients
- [x] Archive/Restore buttons with proper permissions
- [x] Account dashboard excludes archived brands
- [x] Order creation excludes archived clients
- [x] Bulk analysis excludes archived clients
- [x] API endpoints respect archive status
- [x] Foreign key constraint handled for account users
- [x] Audit trail maintained with reason