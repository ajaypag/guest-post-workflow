# Shadow Publishers Implementation Plan

## Database Migration Strategy

### Migration 1: Modify Publishers Table for Shadow Support
**File**: `migrations/0058_add_shadow_publisher_support.sql`

```sql
-- Step 1: Add new fields for shadow publisher tracking
ALTER TABLE publishers 
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Step 2: Update existing publishers to have correct account_status
UPDATE publishers 
SET account_status = CASE 
  WHEN email = 'internal@system.local' THEN 'system'
  WHEN password IS NOT NULL THEN 'active'
  ELSE 'unclaimed'
END
WHERE account_status IS NULL;

-- Step 3: Make authentication fields nullable for shadow publishers
ALTER TABLE publishers 
  ALTER COLUMN password DROP NOT NULL,
  ALTER COLUMN contactName SET DEFAULT 'Unknown';

-- Step 4: Create conditional unique index for email
-- Drop existing unique constraint first
ALTER TABLE publishers DROP CONSTRAINT IF EXISTS publishers_email_key;
DROP INDEX IF EXISTS idx_publishers_email;

-- Create new conditional unique index (only enforce uniqueness for non-shadow publishers)
CREATE UNIQUE INDEX idx_publishers_email_active 
  ON publishers(LOWER(email)) 
  WHERE account_status NOT IN ('unclaimed', 'shadow');

-- Step 5: Add indexes for performance
CREATE INDEX idx_publishers_account_status ON publishers(account_status);
CREATE INDEX idx_publishers_source ON publishers(source);
CREATE INDEX idx_publishers_invitation_token ON publishers(invitation_token) WHERE invitation_token IS NOT NULL;

-- Rollback script:
-- ALTER TABLE publishers 
--   DROP COLUMN IF EXISTS account_status,
--   DROP COLUMN IF EXISTS source,
--   DROP COLUMN IF EXISTS source_metadata,
--   DROP COLUMN IF EXISTS claimed_at,
--   DROP COLUMN IF EXISTS invitation_token,
--   DROP COLUMN IF EXISTS invitation_sent_at,
--   DROP COLUMN IF EXISTS invitation_expires_at,
--   DROP COLUMN IF EXISTS confidence_score;
-- ALTER TABLE publishers 
--   ALTER COLUMN password SET NOT NULL,
--   ALTER COLUMN contactName SET NOT NULL;
-- DROP INDEX IF EXISTS idx_publishers_email_active;
-- CREATE UNIQUE INDEX idx_publishers_email ON publishers(email);
```

### Migration 2: Create Email Processing Infrastructure
**File**: `migrations/0059_create_email_automation_tables.sql`

```sql
-- Email processing logs for ManyReach webhooks
CREATE TABLE IF NOT EXISTS email_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255),
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  email_from VARCHAR(255) NOT NULL,
  email_subject VARCHAR(500),
  raw_content TEXT NOT NULL,
  parsed_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, processed, failed, manual_review
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for email logs
CREATE INDEX idx_email_logs_status ON email_processing_logs(status);
CREATE INDEX idx_email_logs_campaign ON email_processing_logs(campaign_id);
CREATE INDEX idx_email_logs_from ON email_processing_logs(email_from);
CREATE INDEX idx_email_logs_created ON email_processing_logs(created_at DESC);

-- Email review queue for manual processing
CREATE TABLE IF NOT EXISTS email_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES email_processing_logs(id) ON DELETE CASCADE,
  publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 50, -- 1-100, higher = more urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, approved, rejected, needs_info
  suggested_actions JSONB DEFAULT '{}',
  missing_fields TEXT[],
  review_notes TEXT,
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  auto_approve_at TIMESTAMP, -- If not reviewed by this time, auto-approve
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_queue_status ON email_review_queue(status);
CREATE INDEX idx_review_queue_priority ON email_review_queue(priority DESC);
CREATE INDEX idx_review_queue_auto ON email_review_queue(auto_approve_at) WHERE status = 'pending';

-- Publisher automation tracking
CREATE TABLE IF NOT EXISTS publisher_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_processing_logs(id),
  publisher_id UUID REFERENCES publishers(id),
  action VARCHAR(100) NOT NULL, -- created_shadow, updated_existing, merged_duplicate, sent_invitation
  previous_data JSONB,
  new_data JSONB,
  confidence DECIMAL(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_automation_logs_publisher ON publisher_automation_logs(publisher_id);
CREATE INDEX idx_automation_logs_action ON publisher_automation_logs(action);

-- Follow-up email tracking
CREATE TABLE IF NOT EXISTS email_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id UUID REFERENCES email_processing_logs(id),
  publisher_id UUID REFERENCES publishers(id),
  follow_up_type VARCHAR(50), -- missing_info, clarification, invitation, reminder
  template_used VARCHAR(100),
  sent_to VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  missing_fields TEXT[],
  sent_at TIMESTAMP DEFAULT NOW(),
  response_received_at TIMESTAMP,
  response_log_id UUID REFERENCES email_processing_logs(id)
);

CREATE INDEX idx_follow_ups_publisher ON email_follow_ups(publisher_id);
CREATE INDEX idx_follow_ups_type ON email_follow_ups(follow_up_type);

-- Rollback script:
-- DROP TABLE IF EXISTS email_follow_ups CASCADE;
-- DROP TABLE IF EXISTS publisher_automation_logs CASCADE;
-- DROP TABLE IF EXISTS email_review_queue CASCADE;
-- DROP TABLE IF EXISTS email_processing_logs CASCADE;
```

### Migration 3: Add Publisher Claiming Support
**File**: `migrations/0060_add_publisher_claiming.sql`

```sql
-- Add claiming-specific fields if not already added
ALTER TABLE publishers 
  ADD COLUMN IF NOT EXISTS claim_verification_code VARCHAR(6), -- 6-digit code for email verification
  ADD COLUMN IF NOT EXISTS claim_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_attempt TIMESTAMP;

-- Create publisher claim history table
CREATE TABLE IF NOT EXISTS publisher_claim_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID REFERENCES publishers(id) NOT NULL,
  action VARCHAR(50) NOT NULL, -- invitation_sent, claim_started, claim_completed, claim_failed
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_claim_history_publisher ON publisher_claim_history(publisher_id);
CREATE INDEX idx_claim_history_action ON publisher_claim_history(action);

-- Create table to track which websites belong to which shadow publishers
CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id UUID REFERENCES publishers(id) NOT NULL,
  website_id UUID REFERENCES websites(id) NOT NULL,
  confidence DECIMAL(3,2),
  source VARCHAR(50), -- email_domain_match, content_mention, manual_assignment
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(publisher_id, website_id)
);

CREATE INDEX idx_shadow_websites_publisher ON shadow_publisher_websites(publisher_id);
CREATE INDEX idx_shadow_websites_website ON shadow_publisher_websites(website_id);

-- Rollback script:
-- ALTER TABLE publishers 
--   DROP COLUMN IF EXISTS claim_verification_code,
--   DROP COLUMN IF EXISTS claim_attempts,
--   DROP COLUMN IF EXISTS last_claim_attempt;
-- DROP TABLE IF EXISTS shadow_publisher_websites CASCADE;
-- DROP TABLE IF EXISTS publisher_claim_history CASCADE;
```

## Service Implementation

### EmailParserService
**File**: `/lib/services/emailParserService.ts`

```typescript
import OpenAI from 'openai';
import { db } from '@/lib/db/connection';
import { publishers, emailProcessingLogs } from '@/lib/db/schema';

export interface ParsedEmailData {
  sender: {
    email: string;
    name?: string;
    company?: string;
    confidence: number;
  };
  websites: Array<{
    domain: string;
    confidence: number;
  }>;
  offerings: Array<{
    type: 'guest_post' | 'link_insertion';
    basePrice?: number;
    currency?: string;
    turnaroundDays?: number;
    requirements?: {
      acceptsDoFollow?: boolean;
      maxLinks?: number;
      prohibitedTopics?: string[];
      minWordCount?: number;
      maxWordCount?: number;
    };
    confidence: number;
  }>;
  overallConfidence: number;
  missingFields: string[];
}

export class EmailParserService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async parsePublisherEmail(
    emailContent: string,
    emailFrom: string,
    subject: string
  ): Promise<ParsedEmailData> {
    // Multi-pass extraction for accuracy
    const [basicInfo, pricing, requirements] = await Promise.all([
      this.extractBasicInfo(emailContent, emailFrom),
      this.extractPricing(emailContent),
      this.extractRequirements(emailContent)
    ]);

    return this.mergeExtractions(basicInfo, pricing, requirements);
  }

  private async extractBasicInfo(content: string, from: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Extract publisher contact information from email.
            Focus on: sender name, company, website domains.
            Return JSON with confidence scores for each field.`
        },
        {
          role: "user",
          content: `Email from: ${from}\n\nContent:\n${content}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async extractPricing(content: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Extract pricing information from publisher email.
            Look for: guest post rates, link insertion rates, bulk discounts.
            Handle multiple currencies. Convert all prices to cents (multiply by 100).
            Return JSON with offerings array.`
        },
        {
          role: "user",
          content
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async extractRequirements(content: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Extract content requirements from publisher email.
            Look for: DoFollow policy, prohibited topics, word counts, turnaround time.
            Return JSON with requirements object.`
        },
        {
          role: "user",
          content
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private mergeExtractions(...extractions: any[]): ParsedEmailData {
    // Merge logic to combine all extractions
    // Calculate overall confidence
    // Identify missing fields
    // Return consolidated ParsedEmailData
  }
}
```

### ShadowPublisherService
**File**: `/lib/services/shadowPublisherService.ts`

```typescript
import { db } from '@/lib/db/connection';
import { publishers, publisherOfferings, websites } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export class ShadowPublisherService {
  async findOrCreateShadowPublisher(data: ParsedEmailData, logId: string) {
    // Check if publisher exists
    const existingPublisher = await this.findExistingPublisher(data.sender.email);
    
    if (existingPublisher) {
      return await this.updateExistingPublisher(existingPublisher, data);
    }

    // Create shadow publisher
    return await this.createShadowPublisher(data, logId);
  }

  private async findExistingPublisher(email: string) {
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, email.toLowerCase()))
      .limit(1);

    return publisher;
  }

  private async createShadowPublisher(data: ParsedEmailData, logId: string) {
    const publisherId = crypto.randomUUID();
    
    const [publisher] = await db
      .insert(publishers)
      .values({
        id: publisherId,
        email: data.sender.email.toLowerCase(),
        password: null, // No password for shadow publishers
        contactName: data.sender.name || 'Unknown',
        companyName: data.sender.company || data.websites[0]?.domain,
        status: 'pending', // Business status
        account_status: 'unclaimed', // Account status
        source: 'manyreach_auto',
        source_metadata: {
          logId,
          campaignId: data.campaignId,
          extractedAt: new Date(),
          confidence: data.overallConfidence,
          originalEmail: data.sender.email
        },
        confidence_score: data.overallConfidence,
        emailVerified: false,
        internalNotes: `Shadow publisher created from ManyReach. Confidence: ${(data.overallConfidence * 100).toFixed(1)}%`
      })
      .returning();

    // Log the action
    await this.logAutomationAction(logId, publisherId, 'created_shadow', data);

    // Create offerings if confidence is high enough
    if (data.overallConfidence >= 0.75) {
      await this.createOfferings(publisher, data);
    }

    // Send invitation if confidence is very high
    if (data.overallConfidence >= 0.85) {
      await this.sendClaimInvitation(publisher);
    }

    return publisher;
  }

  private async updateExistingPublisher(publisher: any, data: ParsedEmailData) {
    // Only update if new data has higher confidence
    if (data.overallConfidence > (publisher.confidence_score || 0)) {
      await db
        .update(publishers)
        .set({
          contactName: data.sender.name || publisher.contactName,
          companyName: data.sender.company || publisher.companyName,
          confidence_score: data.overallConfidence,
          source_metadata: {
            ...publisher.source_metadata,
            lastUpdated: new Date(),
            updateConfidence: data.overallConfidence
          }
        })
        .where(eq(publishers.id, publisher.id));
    }

    return publisher;
  }

  private async createOfferings(publisher: any, data: ParsedEmailData) {
    for (const offering of data.offerings) {
      if (offering.confidence < 0.7) continue;

      await db
        .insert(publisherOfferings)
        .values({
          publisherId: publisher.id,
          offeringType: offering.type,
          basePrice: offering.basePrice || 0,
          currency: offering.currency || 'USD',
          turnaroundDays: offering.turnaroundDays || 7,
          minWordCount: offering.requirements?.minWordCount,
          maxWordCount: offering.requirements?.maxWordCount,
          currentAvailability: 'pending_verification',
          attributes: {
            ...offering.requirements,
            autoExtracted: true,
            extractionConfidence: offering.confidence
          },
          isActive: false // Not active until claimed
        })
        .onConflictDoNothing();
    }
  }

  async sendClaimInvitation(publisher: any) {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

    // Update publisher with invitation token
    await db
      .update(publishers)
      .set({
        invitation_token: token,
        invitation_sent_at: new Date(),
        invitation_expires_at: expiresAt,
        account_status: 'invited'
      })
      .where(eq(publishers.id, publisher.id));

    // Send email via Resend
    await this.sendInvitationEmail(publisher, token);

    // Log the invitation
    await this.logAutomationAction(null, publisher.id, 'sent_invitation', { token });
  }

  private async sendInvitationEmail(publisher: any, token: string) {
    // Use Resend API to send invitation
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'info@linkio.com',
      to: publisher.email,
      subject: 'Claim Your Publisher Profile',
      html: `
        <h2>Your Publisher Profile is Ready!</h2>
        <p>We've created a publisher profile for your website based on our recent conversation.</p>
        <p>Click the link below to claim your account and start receiving orders:</p>
        <a href="${process.env.NEXTAUTH_URL}/publisher/claim?token=${token}">
          Claim Your Profile
        </a>
        <p>This link expires in 30 days.</p>
      `
    });
  }

  private async logAutomationAction(logId: string | null, publisherId: string, action: string, metadata: any) {
    await db
      .insert(publisherAutomationLogs)
      .values({
        email_log_id: logId,
        publisher_id: publisherId,
        action,
        metadata,
        confidence: metadata.confidence || metadata.overallConfidence
      });
  }
}
```

## API Endpoints

### ManyReach Webhook Handler
**File**: `/app/api/webhooks/manyreach/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/connection';
import { emailProcessingLogs } from '@/lib/db/schema';
import { EmailParserService } from '@/lib/services/emailParserService';
import { ShadowPublisherService } from '@/lib/services/shadowPublisherService';

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const signature = request.headers.get('x-manyreach-signature');
    const webhookSecret = process.env.MANYREACH_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('MANYREACH_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const rawBody = await request.text();
    
    // Verify signature if provided
    if (signature && !verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    
    // Store in database
    const [log] = await db
      .insert(emailProcessingLogs)
      .values({
        webhook_id: payload.id,
        campaign_id: payload.campaign_id,
        campaign_name: payload.campaign_name,
        email_from: payload.from_email,
        email_subject: payload.subject,
        raw_content: payload.body,
        status: 'pending'
      })
      .returning();

    // Process asynchronously
    processEmailAsync(log.id).catch(console.error);

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: false, error: 'Processing error' });
  }
}

async function processEmailAsync(logId: string) {
  const parserService = new EmailParserService();
  const shadowService = new ShadowPublisherService();

  try {
    // Get the log entry
    const [log] = await db
      .select()
      .from(emailProcessingLogs)
      .where(eq(emailProcessingLogs.id, logId))
      .limit(1);

    if (!log) return;

    // Update status to processing
    await db
      .update(emailProcessingLogs)
      .set({ status: 'processing' })
      .where(eq(emailProcessingLogs.id, logId));

    // Parse email with AI
    const parsedData = await parserService.parsePublisherEmail(
      log.raw_content,
      log.email_from,
      log.email_subject
    );

    // Store parsed data
    await db
      .update(emailProcessingLogs)
      .set({
        parsed_data: parsedData,
        confidence_score: parsedData.overallConfidence
      })
      .where(eq(emailProcessingLogs.id, logId));

    // Process based on confidence
    if (parsedData.overallConfidence >= 0.7) {
      const publisher = await shadowService.findOrCreateShadowPublisher(parsedData, logId);
      
      await db
        .update(emailProcessingLogs)
        .set({
          status: 'processed',
          processed_at: new Date()
        })
        .where(eq(emailProcessingLogs.id, logId));
    } else {
      // Queue for manual review
      await db
        .insert(emailReviewQueue)
        .values({
          log_id: logId,
          priority: Math.round(parsedData.overallConfidence * 100),
          missing_fields: parsedData.missingFields,
          suggested_actions: {
            sendClarification: parsedData.missingFields.length > 0,
            manualReview: true
          }
        });

      await db
        .update(emailProcessingLogs)
        .set({ status: 'manual_review' })
        .where(eq(emailProcessingLogs.id, logId));
    }
  } catch (error) {
    console.error(`Error processing email ${logId}:`, error);
    
    await db
      .update(emailProcessingLogs)
      .set({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .where(eq(emailProcessingLogs.id, logId));
  }
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Publisher Claim Endpoint
**File**: `/app/api/publisher/claim/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/connection';
import { publishers, publisherClaimHistory } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token, password, verificationCode } = await request.json();

    // Find publisher by token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.invitation_token, token),
          eq(publishers.account_status, 'invited')
        )
      )
      .limit(1);

    if (!publisher) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Check if token is expired
    if (publisher.invitation_expires_at && new Date() > publisher.invitation_expires_at) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Verify email verification code if required
    if (verificationCode && publisher.claim_verification_code !== verificationCode) {
      await db
        .update(publishers)
        .set({
          claim_attempts: (publisher.claim_attempts || 0) + 1,
          last_claim_attempt: new Date()
        })
        .where(eq(publishers.id, publisher.id));

      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update publisher to claimed
    await db
      .update(publishers)
      .set({
        password: hashedPassword,
        account_status: 'active',
        status: 'active',
        claimed_at: new Date(),
        invitation_token: null,
        invitation_expires_at: null,
        claim_verification_code: null,
        emailVerified: true
      })
      .where(eq(publishers.id, publisher.id));

    // Log the claim
    await db
      .insert(publisherClaimHistory)
      .values({
        publisher_id: publisher.id,
        action: 'claim_completed',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: { source: publisher.source }
      });

    // Activate all offerings
    await db
      .update(publisherOfferings)
      .set({ isActive: true })
      .where(eq(publisherOfferings.publisherId, publisher.id));

    return NextResponse.json({ 
      success: true,
      message: 'Account successfully claimed'
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ 
      error: 'Failed to claim account' 
    }, { status: 500 });
  }
}
```

## Timeline & Milestones

### Week 1: Database & Infrastructure
- [ ] Run migration scripts in development
- [ ] Test shadow publisher creation
- [ ] Verify email uniqueness handling
- [ ] Set up ManyReach webhook endpoint

### Week 2: Core Services
- [ ] Implement EmailParserService
- [ ] Implement ShadowPublisherService
- [ ] Create webhook handler
- [ ] Test with sample emails

### Week 3: Claiming Flow
- [ ] Build claim page UI
- [ ] Implement claim API
- [ ] Create invitation email templates
- [ ] Test end-to-end flow

### Week 4: Admin Interface
- [ ] Build review queue dashboard
- [ ] Create manual approval interface
- [ ] Add monitoring metrics
- [ ] Implement follow-up system

### Week 5: Testing & Refinement
- [ ] Process 100 test emails
- [ ] Tune confidence thresholds
- [ ] Fix edge cases
- [ ] Performance optimization

### Week 6: Production Rollout
- [ ] Deploy migrations to production
- [ ] Configure ManyReach webhooks
- [ ] Monitor first 1000 emails
- [ ] Adjust based on results

## Success Metrics
- 70% of emails processed automatically
- 90% accuracy on pricing extraction
- 25% claim rate within 30 days
- < 5 minutes from email to database
- Zero duplicate publishers created