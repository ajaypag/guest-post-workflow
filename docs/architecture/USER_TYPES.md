# User Types Architecture

## Overview

The Guest Post Workflow system has three distinct types of users with different roles and access levels:

1. **Internal Users** (Staff)
2. **Advertisers** (Customers)
3. **Publishers** (Suppliers)

## User Types

### 1. Internal Users (`users` table)
**Who**: Your company's employees  
**Purpose**: Manage the entire platform  
**Access**: Full system access based on role  

**Roles**:
- `admin` - Full system access
- `analyst` - Bulk analysis, workflows
- `support` - Customer service
- `viewer` - Read-only access

**Features they access**:
- Bulk analysis tools
- Workflow management
- Order processing
- Client management
- Website database
- All reporting

**Authentication**: 
- Email/password
- Invite-only registration
- No self-service signup

### 2. Advertisers (`advertisers` table)
**Who**: External companies/individuals ordering guest posts  
**Purpose**: Place orders, track deliverables  
**Access**: Limited to their own data  

**Features they will access**:
- Order placement
- Order tracking
- Content approval
- Billing/invoices
- Their company profile
- Analytics for their campaigns

**Authentication**:
- Email/password
- Self-service signup (future)
- Email verification required
- Password reset

**Relationship to internal system**:
- Linked to internal `clients` via `primaryClientId`
- Can have multiple users per company (future)
- Orders are placed under advertiser account

### 3. Publishers (`publishers` table)
**Who**: Website owners providing guest post opportunities  
**Purpose**: Manage their websites, receive orders  
**Access**: Limited to their websites and orders  

**Features they will access**:
- Website management
- Pricing updates
- Order fulfillment
- Content publishing
- Payment tracking
- Performance analytics

**Authentication**:
- Email/password
- Invite-only initially
- Email verification required
- Password reset

**Relationship to internal system**:
- Manage multiple websites via `publisher_websites`
- Receive portion of order payment
- Submit published URLs

## Database Design Principles

### Separation of Concerns
```
❌ Bad: Putting all user types in one table
✅ Good: Separate tables for each user type
```

### Why Separate Tables?

1. **Different Data Requirements**
   - Internal users: role, department, permissions
   - Advertisers: billing info, credit terms, tax ID
   - Publishers: payment info, commission rates, bank details

2. **Security**
   - Sensitive financial data isolated
   - Different authentication flows
   - Separate password policies possible

3. **Scalability**
   - Easy to add fields without affecting other user types
   - Can implement different features per type
   - Clear separation of business logic

4. **Multi-tenancy**
   - Advertisers can have multiple users (team members)
   - Publishers can manage multiple websites
   - Clear ownership and access control

## Migration Notes

### Current State
- Orders reference `users.id` for advertiserId (incorrect)
- No separate advertiser/publisher tables

### Migration Steps
1. Create advertiser/publisher tables
2. Migrate existing advertiser data from users table
3. Update orders to reference advertisers table
4. Add foreign key constraints
5. Remove advertiser-specific fields from users table

### Backwards Compatibility
During migration:
- Support both user ID and advertiser ID lookups
- Gradually migrate existing orders
- Maintain audit trail of changes

## Access Control

### Route Protection
```typescript
// Internal routes
if (!session || session.userType !== 'internal') {
  return unauthorized();
}

// Advertiser routes
if (!session || session.userType !== 'advertiser') {
  return unauthorized();
}

// Publisher routes
if (!session || session.userType !== 'publisher') {
  return unauthorized();
}
```

### Data Access
- Internal users can see all data (based on role)
- Advertisers can only see their own orders/data
- Publishers can only see their websites/orders

## Future Considerations

### Team Accounts
- Advertisers will need multiple users per company
- Role-based access within advertiser accounts
- Approval workflows for large orders

### SSO/OAuth
- Google/Microsoft login for advertisers
- SAML for enterprise advertisers
- Social login for publishers

### API Access
- Separate API keys per user type
- Rate limiting per type
- Different endpoints exposed

## Summary

By maintaining separate tables for internal users, advertisers, and publishers, we achieve:
- ✅ Clean separation of concerns
- ✅ Appropriate security boundaries
- ✅ Flexibility for future features
- ✅ Clear data ownership
- ✅ Scalable architecture

This approach follows industry best practices for multi-tenant SaaS applications with distinct user types.