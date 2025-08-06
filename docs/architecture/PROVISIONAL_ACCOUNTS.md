# Provisional Accounts System

## Overview
Provisional accounts allow internal users to create orders before clients have signed up. This solves the workflow issue where sales teams need to start work immediately after a verbal agreement, without waiting for client onboarding.

## How It Works

### 1. Creation
When an internal user creates an order without selecting an account:
- A provisional account is automatically created
- Uses temporary email: `provisional-{timestamp}@pending.local`
- Status set to `'provisional'`
- Cannot be used for login
- Stores metadata about who created it and when

### 2. Multiple Orders
- Same provisional account can have multiple orders
- Internal team can continue adding orders to provisional accounts
- All orders remain associated when account is claimed

### 3. Claiming Process
Provisional accounts can be claimed in three ways:

#### A. During Signup (Automatic)
```typescript
// When user signs up, system checks for provisional accounts:
1. Match by intended email (stored in metadata)
2. Match by company name
3. If found, convert provisional → active
4. All orders automatically transfer
```

#### B. Manual Conversion (Admin)
```typescript
// Admin can manually convert via /admin/provisional-accounts
1. Select provisional account
2. Enter client details (email, password, etc.)
3. Account becomes active
4. Client can log in immediately
```

#### C. Invitation Link (Future)
```typescript
// Send invite to specific provisional account
1. Generate claim token
2. Send invitation email
3. Client completes signup with pre-filled data
4. Account automatically converts
```

## Database Structure

### Accounts Table
```sql
-- Regular fields
id, email, password, status, contactName, companyName...

-- Special handling for provisional
status: 'provisional' | 'active' | 'pending' | 'suspended' | 'blocked'
email: 'provisional-{timestamp}@pending.local' -- for provisional
password: hashed but unusable -- for provisional

-- Metadata in internalNotes (JSON)
{
  createdBy: "internal-user-id",
  createdByEmail: "sales@company.com",
  createdAt: "2024-01-30T...",
  provisionalNotes: "Big client, rush order",
  originalEmail: "client@example.com", -- intended email if known
  claimable: true,
  claimedAt: "2024-01-31T...", -- when converted
  claimedBy: "self" | "internal-user-id",
  conversionMethod: "email_match" | "token" | "internal"
}
```

## API Endpoints

### Create Provisional Account
`POST /api/accounts/provisional`
```json
{
  "companyName": "ACME Corp",
  "contactName": "John Doe", 
  "email": "john@acme.com",  // Optional - for future claiming
  "notes": "Rush order discussed on call"
}
```

### List Provisional Accounts
`GET /api/accounts/provisional`
Returns all provisional accounts with order counts and values

### Claim Provisional Account
`POST /api/accounts/provisional/claim`
```json
{
  "provisionalAccountId": "uuid",  // For manual conversion
  "email": "client@example.com",
  "password": "secure-password",
  "contactName": "John Doe",
  "companyName": "ACME Corp"
}
```

### Check for Provisional Accounts
`GET /api/accounts/provisional/claim?email=client@example.com&company=ACME`
Used during signup to check if there are claimable accounts

## UI Components

### Order Creation (`/orders/new`)
- Internal users see "Select Account (Optional)"
- Can choose existing account or leave empty
- Empty selection creates provisional account

### Order Edit (`/orders/[id]/edit`)
- Shows provisional accounts in dropdown
- Displays warning when no account selected
- Allows switching between provisional and real accounts

### Admin Panel (`/admin/provisional-accounts`)
- Lists all provisional accounts
- Shows associated orders and values
- Convert to active accounts
- Track creation metadata

## Benefits

1. **No Breaking Changes**: `accountId` remains non-null throughout system
2. **Workflow Flexibility**: Sales can start immediately after verbal agreement
3. **Order Continuity**: All orders stay with account through conversion
4. **Clean Data**: No orphaned orders or null references
5. **Audit Trail**: Full tracking of who created what and when

## Security Considerations

1. **Provisional accounts cannot log in** - password is unusable
2. **Only internal users can create** provisional accounts
3. **Email uniqueness maintained** - provisional emails don't conflict
4. **Claiming requires verification** - either matching data or admin action
5. **No sensitive data exposed** in provisional state

## Future Enhancements

1. **Invitation System**: Send direct invite links to claim accounts
2. **Auto-cleanup**: Remove old unclaimed provisional accounts
3. **Bulk Conversion**: Convert multiple provisional accounts at once
4. **Analytics**: Track conversion rates and time-to-claim
5. **Templates**: Create provisional account templates for common scenarios

## Troubleshooting

### Common Issues

1. **Duplicate Provisional Accounts**
   - System prevents duplicate real emails
   - Multiple provisional allowed for same company
   - Admin can merge if needed

2. **Unclaimed Accounts**
   - No automatic deletion
   - Admin can manually clean up
   - Consider periodic review process

3. **Wrong Account Claimed**
   - Admin can unclaim and reassign
   - Full audit trail maintained
   - Orders can be moved between accounts

## Implementation Status

✅ **Completed**:
- API endpoints for provisional accounts
- Automatic creation in order flow
- Claiming mechanism
- Admin management interface
- UI updates in order edit page

⏳ **Planned**:
- Invitation link system
- Auto-cleanup job
- Analytics dashboard
- Bulk operations