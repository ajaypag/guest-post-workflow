# Unclaimed Publisher Strategy

## The Problem
Both ManyReach automation AND internal users create publisher records for people who haven't signed up yet. Currently, internal users create everything under a fake "internal@system.local" publisher, which isn't scalable or accurate.

## Current Situation Analysis

### When Internal Users Add Websites
```
Current Flow:
1. Internal user adds website
2. System creates/uses "internal@system.local" publisher
3. All offerings linked to this fake publisher
4. Real publisher can never claim their website
```

### When ManyReach Processes Emails
```
Proposed Flow:
1. Email received from publisher
2. AI extracts data
3. Need to create publisher record
4. But publisher hasn't signed up for account
5. Can't set password, can't log in
```

## Recommended Solution: Shadow Publishers

### Core Concept
Create "shadow" publisher records that can be claimed later by the real publisher.

### Database Changes Needed

#### 1. Add to Publishers Table
```sql
ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  account_status VARCHAR(50) DEFAULT 'unclaimed';
  -- Values: 'unclaimed', 'invited', 'active', 'suspended'

ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  claimed_at TIMESTAMP;

ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  invitation_token VARCHAR(255);

ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  invitation_sent_at TIMESTAMP;

ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  source VARCHAR(50);
  -- Values: 'internal_added', 'manyreach_auto', 'self_signup', 'invitation'

ALTER TABLE publishers ADD COLUMN IF NOT EXISTS 
  source_metadata JSONB;
  -- Store original email, campaign ID, who added it, etc.
```

#### 2. Modify Publisher Authentication
```typescript
// Publishers with account_status = 'unclaimed' cannot log in
// Password field can be NULL for unclaimed publishers
ALTER TABLE publishers ALTER COLUMN password DROP NOT NULL;
```

### Implementation Strategy

#### Phase 1: Shadow Publisher Creation

**When Internal User Adds Website:**
```typescript
async function createUnclaimedPublisher(data: {
  email: string;
  companyName?: string;
  contactName?: string;
  websiteDomain: string;
  addedBy: string; // internal user ID
}) {
  // Check if publisher already exists
  const existing = await db.publishers.findFirst({
    where: { email: data.email }
  });
  
  if (existing) {
    return existing; // Use existing publisher
  }
  
  // Create unclaimed publisher
  const publisher = await db.publishers.create({
    data: {
      id: crypto.randomUUID(),
      email: data.email,
      password: null, // No password yet
      contactName: data.contactName || 'Unknown',
      companyName: data.companyName || data.websiteDomain,
      account_status: 'unclaimed',
      status: 'pending', // Not active until claimed
      source: 'internal_added',
      source_metadata: {
        addedBy: data.addedBy,
        addedAt: new Date(),
        websiteDomain: data.websiteDomain,
        originalContext: 'internal_website_addition'
      }
    }
  });
  
  return publisher;
}
```

**When ManyReach Processes Email:**
```typescript
async function createPublisherFromEmail(extraction: ExtractedData) {
  // Check if publisher exists
  const existing = await db.publishers.findFirst({
    where: { email: extraction.sender.email }
  });
  
  if (existing) {
    // Update with new info if better quality
    if (existing.account_status === 'unclaimed') {
      await updateUnclaimedPublisher(existing.id, extraction);
    }
    return existing;
  }
  
  // Create new unclaimed publisher
  const publisher = await db.publishers.create({
    data: {
      id: crypto.randomUUID(),
      email: extraction.sender.email,
      password: null, // No password yet
      contactName: extraction.sender.name || 'Unknown',
      companyName: extraction.sender.company || extraction.website.domain,
      account_status: 'unclaimed',
      status: extraction.confidence > 0.9 ? 'active' : 'pending',
      source: 'manyreach_auto',
      source_metadata: {
        campaignId: extraction.campaignId,
        emailContent: extraction.rawEmail,
        extractedAt: new Date(),
        confidence: extraction.confidence,
        websiteDomain: extraction.website.domain
      }
    }
  });
  
  // Auto-send invitation if high confidence
  if (extraction.confidence > 0.85) {
    await sendClaimInvitation(publisher);
  }
  
  return publisher;
}
```

#### Phase 2: Claiming Process

**Invitation Email:**
```typescript
async function sendClaimInvitation(publisher: Publisher) {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token
  await db.publishers.update({
    where: { id: publisher.id },
    data: {
      invitation_token: token,
      invitation_sent_at: new Date(),
      account_status: 'invited'
    }
  });
  
  // Send email
  await sendEmail({
    to: publisher.email,
    subject: 'Claim Your Publisher Profile on [Platform]',
    template: 'publisher_claim_invitation',
    data: {
      publisherName: publisher.companyName,
      claimUrl: `${process.env.NEXTAUTH_URL}/publisher/claim?token=${token}`,
      websiteCount: await getWebsiteCount(publisher.id),
      offeringCount: await getOfferingCount(publisher.id)
    }
  });
}
```

**Claim Page (`/publisher/claim`):**
```typescript
export default function ClaimPublisherPage() {
  // User arrives with token in URL
  // 1. Verify token is valid
  // 2. Show publisher info (websites, offerings)
  // 3. Let them set password
  // 4. Activate account
  
  const handleClaim = async (token: string, password: string) => {
    const response = await fetch('/api/publisher/claim', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password,
        acceptTerms: true
      })
    });
    
    if (response.ok) {
      // Account claimed! Redirect to login
      router.push('/publisher/login?claimed=true');
    }
  };
}
```

**Claim API Endpoint:**
```typescript
export async function POST(request: Request) {
  const { token, password } = await request.json();
  
  // Find publisher by token
  const publisher = await db.publishers.findFirst({
    where: {
      invitation_token: token,
      account_status: { in: ['unclaimed', 'invited'] }
    }
  });
  
  if (!publisher) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Update publisher to claimed
  await db.publishers.update({
    where: { id: publisher.id },
    data: {
      password: hashedPassword,
      account_status: 'active',
      status: 'active',
      claimed_at: new Date(),
      invitation_token: null, // Clear token
      emailVerified: true // Auto-verify since they received email
    }
  });
  
  // Log the claiming event
  await db.publisherActivityLogs.create({
    data: {
      publisherId: publisher.id,
      action: 'account_claimed',
      metadata: {
        source: publisher.source,
        claimedAt: new Date()
      }
    }
  });
  
  return NextResponse.json({ success: true });
}
```

#### Phase 3: Migration of Existing Data

**Migrate Current "internal@system.local" Records:**
```typescript
async function migrateInternalPublishers() {
  // Get all websites/offerings linked to internal@system.local
  const internalPublisher = await db.publishers.findFirst({
    where: { email: 'internal@system.local' }
  });
  
  if (!internalPublisher) return;
  
  // Get all relationships
  const relationships = await db.publisherOfferingRelationships.findMany({
    where: { publisherId: internalPublisher.id },
    include: {
      website: true,
      offering: true
    }
  });
  
  // Group by likely publisher (by domain, contact info, etc.)
  const groupedByLikelyPublisher = groupRelationships(relationships);
  
  // Create shadow publishers for each group
  for (const group of groupedByLikelyPublisher) {
    const shadowPublisher = await createUnclaimedPublisher({
      email: group.estimatedEmail, // Derive from domain or contact info
      companyName: group.companyName,
      contactName: group.contactName,
      websiteDomain: group.domain,
      addedBy: 'migration'
    });
    
    // Transfer relationships to shadow publisher
    await db.publisherOfferingRelationships.updateMany({
      where: {
        id: { in: group.relationshipIds }
      },
      data: {
        publisherId: shadowPublisher.id
      }
    });
  }
}
```

### Benefits of This Approach

1. **Accurate Attribution**: Each website/offering linked to correct (unclaimed) publisher
2. **Easy Claiming**: Publishers can claim with one click from invitation email
3. **Preserves History**: All data added before claiming is preserved
4. **Supports Both Flows**: Works for internal additions AND ManyReach automation
5. **No Fake Accounts**: No more "internal@system.local" workarounds
6. **Progressive Enhancement**: Can add more data as we learn more about publisher

### UI Changes Needed

#### 1. Internal Website Management
Show publisher status:
```tsx
<div className="publisher-info">
  {publisher.account_status === 'unclaimed' && (
    <Badge color="yellow">Unclaimed</Badge>
  )}
  {publisher.account_status === 'invited' && (
    <Badge color="blue">Invitation Sent</Badge>
  )}
  {publisher.account_status === 'active' && (
    <Badge color="green">Active</Badge>
  )}
  
  {publisher.account_status === 'unclaimed' && (
    <button onClick={() => sendInvitation(publisher.id)}>
      Send Claim Invitation
    </button>
  )}
</div>
```

#### 2. Publisher Portal
New claim flow:
- `/publisher/claim` - Claim page with token
- `/publisher/claim/success` - Success page after claiming
- `/publisher/login` - Modified to show "Account claimed!" message

#### 3. Admin Dashboard
Track unclaimed vs claimed:
```typescript
interface PublisherMetrics {
  total: number;
  claimed: number;
  unclaimed: number;
  invited: number;
  claimRate: number; // (claimed / invited) * 100
}
```

### Security Considerations

1. **Token Security**:
   - Use cryptographically secure random tokens
   - Expire tokens after 30 days
   - One-time use only
   - Rate limit claim attempts

2. **Email Verification**:
   - Only send invitations to verified business emails
   - Block generic domains (gmail, yahoo) for auto-invites
   - Require manual approval for suspicious domains

3. **Data Protection**:
   - Don't show sensitive pricing until claimed
   - Hide competitor offerings until claimed
   - Show limited info on claim page

### Rollout Plan

1. **Week 1**: Database schema changes
2. **Week 2**: Shadow publisher creation logic
3. **Week 3**: Claiming flow implementation
4. **Week 4**: Migrate existing data
5. **Week 5**: Testing and refinement
6. **Week 6**: Production rollout

### Success Metrics

- **Claim Rate**: Target 30% of invited publishers claim within 30 days
- **Data Quality**: 95% of claimed accounts have accurate data
- **Time to Claim**: Average < 5 minutes from email to claimed
- **Reduction in Duplicates**: 80% fewer duplicate publisher records

## Conclusion

This approach solves the core problem: we can create publisher records (from internal additions OR ManyReach emails) without requiring immediate signup, while still maintaining data integrity and allowing real publishers to claim their profiles later.