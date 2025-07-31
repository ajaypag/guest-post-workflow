# Buyer Portal Implementation Guide

## Overview
This document captures the step-by-step implementation plan for building out the buyer portal, including order creation workflow, client/brand architecture, and account integration. This is a living document that will evolve as we build together.

## Client/Brand Architecture

### Key Understanding: Clients = Brands
In our system, "clients" are actually brands/companies that need guest post services. They are NOT the contact people - those are "accounts".

### Three Client Creation Scenarios

### Scenario 1: Adding Client for Existing Account
- Internal team selects an Account from dropdown (including Outreach Labs' own account)
- Adds brand/client info (name, website, target pages)
- Contact info comes from the Account (no need to re-enter)

### Scenario 2: Lead Generation (No Account Yet)
- Create Client without an Account
- Generate shareable order link
- Anonymous prospect can view/claim later
- When they sign up, they create an Account and claim the Client

### Scenario 3: Known Contact (Send Invite)
- Create Client with contact email
- System sends account invitation
- They sign up via invitation and claim the Client

## Current Implementation Issues

### 1. Disconnected Contact Information
The current `/clients/new` form has fields for:
- Contact Name
- Contact Email  
- Contact Phone
- Address

**Problem**: This duplicates data that should live at the Account level.

### 2. Missing Account Integration
- No way to associate a Client with an existing Account
- No invitation flow from client creation
- No lead generation/shareable link flow

## Proposed Client Creation Flow

```typescript
// Step 1: Choose creation path
interface ClientCreationPath {
  type: 'existing_account' | 'send_invitation' | 'generate_link';
}

// Step 2: Collect appropriate info
if (path.type === 'existing_account') {
  // Show account dropdown
  // No contact fields needed
} else if (path.type === 'send_invitation') {
  // Show email field only
  // Will create client + send account invite
} else {
  // No contact info needed
  // Will create client + generate share token
}

// Step 3: Always collect brand info
interface BrandInfo {
  name: string;        // Company name
  website: string;     // Company website
  description?: string; // Optional description
  targetPages: string[]; // URLs to build links to
}
```

## Account User Self-Service

When account users add their own clients/brands:
1. They're already authenticated - we know the account
2. No contact info needed - it's their account
3. They can add multiple brands under one account
4. Same brand info collected (name, website, target pages)

## Cost Considerations

### Free Operations
- Adding brand/client basic info
- Adding target page URLs
- Viewing/managing brands

### Paid Operations (Triggered During Order Fulfillment)
- AI keyword generation for target pages
- AI page description generation
- Bulk analysis for domain selection
- Any DataForSEO API calls

**Key Principle**: AI enrichment happens during internal workflow, not during client setup.

## Database Schema Notes

Current `clients` table fields:
- `name` - Company name
- `website` - Company website  
- `description` - Optional description
- `clientType` - 'prospect' or 'client'
- `defaultRequirements` - Order defaults (JSONB)
- `createdBy` - Internal user who created it

Missing/Needed:
- `accountId` - Link to accounts table (for scenario 1)
- `shareToken` - For lead generation links (scenario 2)
- `invitationId` - Link to invitation sent (scenario 3)

## Implementation Progress

### ✅ Completed (2025-01-31)
1. **Updated `/clients/new`** to support three creation paths:
   - Path selection UI with clear options
   - Account selection for existing accounts
   - Email input for sending invitations
   - Notice for lead generation links

2. **Database Migration** - Added fields to clients table:
   - `accountId` - Links clients to accounts
   - `shareToken` - For lead generation links
   - `invitationId` - Tracks sent invitations
   - Migration available at `/admin/add-client-fields-migration`

3. **Updated API** `/api/clients`:
   - Handles all three creation paths
   - Generates share tokens for lead gen
   - Creates and sends account invitations
   - Links clients to existing accounts

4. **ClientService Updates**:
   - Added `getClientsByAccount()` method
   - Added `getClientByShareToken()` method
   - Updated `createClient()` to handle new fields

### 🚧 Next Steps
1. **Test the implementation** - Run migration and test all three paths
2. **Update order creation** - Use account dropdown instead of user dropdown
3. **Create share link preview page** - For lead generation flow
4. **Update account dashboard** - Show account's associated clients

## Notes for Next Steps

- Share link preview page needs to be created at `/orders/preview/[shareToken]`
- Order creation flow needs to respect account-client relationships
- Consider if we need industry/category for better bulk analysis
- Email template for client invitations is using the account invitation template