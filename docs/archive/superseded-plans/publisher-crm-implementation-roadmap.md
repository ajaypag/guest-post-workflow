# Publisher CRM Implementation Roadmap
## Clean Slate Strategy - Technical Implementation Plan

**Version**: 1.0  
**Date**: August 13, 2025  
**Timeline**: 6 weeks  
**Complexity**: Medium (Reduced from High)

## Overview

This roadmap details the technical implementation of the Publisher CRM system using the clean slate approach. By eliminating contact data migration complexity, we can focus on building a modern, scalable system from the ground up.

## Week 1-2: Database & Core Backend

### Day 1-2: Database Schema Implementation

#### Task 1.1: Create New Database Tables
**File**: `/migrations/0020_publisher_crm_clean_slate.sql`

```sql
-- Create publisher_contacts table
CREATE TABLE IF NOT EXISTS publisher_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  job_title VARCHAR(100),
  company VARCHAR(255),
  linkedin_url VARCHAR(500),
  preferred_contact_method VARCHAR(20) DEFAULT 'email',
  timezone VARCHAR(50),
  communication_notes TEXT,
  relationship_status VARCHAR(20) DEFAULT 'prospect',
  acquisition_channel VARCHAR(50),
  first_contact_date DATE,
  last_contact_date DATE,
  internal_notes TEXT,
  assigned_account_manager UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create contact_website_associations table
CREATE TABLE IF NOT EXISTS contact_website_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  is_primary_contact BOOLEAN DEFAULT false,
  permissions TEXT[],
  offers_guest_posts BOOLEAN DEFAULT false,
  offers_link_inserts BOOLEAN DEFAULT false,
  guest_post_price DECIMAL(10,2),
  link_insert_price DECIMAL(10,2),
  minimum_turnaround_days INTEGER,
  payment_terms VARCHAR(50),
  content_requirements TEXT,
  link_requirements TEXT,
  status VARCHAR(20) DEFAULT 'active',
  relationship_start_date DATE,
  relationship_end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(contact_id, website_id, role)
);

-- Add enhanced columns to websites table
ALTER TABLE websites ADD COLUMN IF NOT EXISTS publisher_tier VARCHAR(20) DEFAULT 'standard';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS preferred_content_types TEXT[];
ALTER TABLE websites ADD COLUMN IF NOT EXISTS editorial_calendar_url VARCHAR(500);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS content_guidelines_url VARCHAR(500);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS typical_turnaround_days INTEGER DEFAULT 7;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS accepts_do_follow BOOLEAN DEFAULT true;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS requires_author_bio BOOLEAN DEFAULT false;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS max_links_per_post INTEGER DEFAULT 2;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES publisher_contacts(id);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS publisher_company VARCHAR(255);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS website_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS avg_response_time_hours INTEGER;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS success_rate_percentage DECIMAL(5,2);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS last_campaign_date DATE;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS total_posts_published INTEGER DEFAULT 0;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS internal_quality_score INTEGER CHECK (internal_quality_score >= 1 AND internal_quality_score <= 10);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_email ON publisher_contacts(email);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_status ON publisher_contacts(relationship_status);
CREATE INDEX IF NOT EXISTS idx_publisher_contacts_account_manager ON publisher_contacts(assigned_account_manager);
CREATE INDEX IF NOT EXISTS idx_contact_associations_contact ON contact_website_associations(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_associations_website ON contact_website_associations(website_id);
CREATE INDEX IF NOT EXISTS idx_contact_associations_status ON contact_website_associations(status);
CREATE INDEX IF NOT EXISTS idx_websites_primary_contact ON websites(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_websites_account_manager ON websites(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_websites_publisher_tier ON websites(publisher_tier);
```

#### Task 1.2: Remove Deprecated Tables
**File**: `/migrations/0021_remove_website_contacts.sql`

```sql
-- Drop website_contacts table and related objects
DROP TABLE IF EXISTS website_contacts CASCADE;

-- Note: This is safe because we confirmed the table has minimal critical importance
```

#### Task 1.3: Update Schema Files
**Files to modify**:
- `/lib/db/websiteSchema.ts` - Remove websiteContacts, add new tables
- `/lib/db/schema.ts` - Update exports

### Day 3-5: Core Service Layer Development

#### Task 2.1: Publisher Contact Service
**File**: `/lib/db/publisherContactService.ts`

```typescript
import { db } from './index';
import { publisherContacts, contactWebsiteAssociations, websites } from './schema';
import { eq, and, desc } from 'drizzle-orm';

export interface PublisherContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  linkedinUrl?: string;
  preferredContactMethod: 'email' | 'phone' | 'linkedin';
  timezone?: string;
  communicationNotes?: string;
  relationshipStatus: 'prospect' | 'active' | 'inactive' | 'blocked';
  acquisitionChannel?: string;
  firstContactDate?: Date;
  lastContactDate?: Date;
  internalNotes?: string;
  assignedAccountManager?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface ContactWebsiteAssociation {
  id: string;
  contactId: string;
  websiteId: string;
  role: string;
  isPrimaryContact: boolean;
  permissions: string[];
  offersGuestPosts: boolean;
  offersLinkInserts: boolean;
  guestPostPrice?: number;
  linkInsertPrice?: number;
  minimumTurnaroundDays?: number;
  paymentTerms?: string;
  contentRequirements?: string;
  linkRequirements?: string;
  status: 'active' | 'inactive' | 'suspended';
  relationshipStartDate?: Date;
  relationshipEndDate?: Date;
  notes?: string;
}

export class PublisherContactService {
  // Contact CRUD operations
  async createContact(contact: Omit<PublisherContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<PublisherContact> {
    // Implementation
  }

  async getContact(id: string): Promise<PublisherContact | null> {
    // Implementation
  }

  async updateContact(id: string, updates: Partial<PublisherContact>): Promise<PublisherContact> {
    // Implementation
  }

  async deleteContact(id: string): Promise<void> {
    // Soft delete implementation
  }

  async listContacts(filters?: {
    status?: string;
    accountManager?: string;
    search?: string;
  }): Promise<PublisherContact[]> {
    // Implementation with filtering and search
  }

  // Website association methods
  async associateWebsite(association: Omit<ContactWebsiteAssociation, 'id'>): Promise<ContactWebsiteAssociation> {
    // Implementation
  }

  async getContactWebsites(contactId: string): Promise<(ContactWebsiteAssociation & { website: any })[]> {
    // Implementation with website details
  }

  async getWebsiteContacts(websiteId: string): Promise<(ContactWebsiteAssociation & { contact: PublisherContact })[]> {
    // Implementation with contact details
  }

  async updateAssociation(id: string, updates: Partial<ContactWebsiteAssociation>): Promise<ContactWebsiteAssociation> {
    // Implementation
  }

  async removeAssociation(id: string): Promise<void> {
    // Implementation
  }

  // Business logic methods
  async getPrimaryContactForWebsite(websiteId: string): Promise<PublisherContact | null> {
    // Implementation
  }

  async getContactsByAccountManager(accountManagerId: string): Promise<PublisherContact[]> {
    // Implementation
  }

  async searchContacts(query: string): Promise<PublisherContact[]> {
    // Full-text search implementation
  }
}

export const publisherContactService = new PublisherContactService();
```

#### Task 2.2: Enhanced Website Service
**File**: `/lib/db/enhancedWebsiteService.ts`

Extend existing website service to handle new publisher-related fields:

```typescript
export interface EnhancedWebsite extends Website {
  publisherTier: 'premium' | 'standard' | 'basic';
  preferredContentTypes: string[];
  editorialCalendarUrl?: string;
  contentGuidelinesUrl?: string;
  typicalTurnaroundDays: number;
  acceptsDoFollow: boolean;
  requiresAuthorBio: boolean;
  maxLinksPerPost: number;
  primaryContactId?: string;
  publisherCompany?: string;
  websiteLanguage: string;
  targetAudience?: string;
  avgResponseTimeHours?: number;
  successRatePercentage?: number;
  lastCampaignDate?: Date;
  totalPostsPublished: number;
  internalQualityScore?: number;
  internalNotes?: string;
  accountManagerId?: string;
}

export class EnhancedWebsiteService extends WebsiteService {
  async updatePublisherInfo(websiteId: string, updates: Partial<EnhancedWebsite>): Promise<EnhancedWebsite> {
    // Implementation
  }

  async getWebsitesWithContacts(filters?: {
    tier?: string;
    accountManager?: string;
    hasActiveContact?: boolean;
  }): Promise<(EnhancedWebsite & { contacts: PublisherContact[] })[]> {
    // Implementation
  }

  async updatePerformanceMetrics(websiteId: string, metrics: {
    avgResponseTime?: number;
    successRate?: number;
    totalPosts?: number;
  }): Promise<void> {
    // Implementation
  }
}
```

### Day 6-7: API Endpoints Development

#### Task 3.1: Publisher Contact APIs
**Files**:
- `/app/api/publisher-contacts/route.ts`
- `/app/api/publisher-contacts/[id]/route.ts`
- `/app/api/publisher-contacts/[id]/websites/route.ts`

#### Task 3.2: Enhanced Website APIs
**Files**:
- `/app/api/websites/[id]/contacts/route.ts`
- `/app/api/websites/[id]/publisher-info/route.ts`

## Week 3-4: Publisher Portal Development

### Day 8-10: Publisher Authentication System

#### Task 4.1: Publisher Authentication Schema
**File**: `/lib/db/publisherAuthSchema.ts`

```sql
CREATE TABLE IF NOT EXISTS publisher_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Task 4.2: Publisher Authentication Service
**File**: `/lib/auth/publisherAuth.ts`

Implement separate authentication system for publishers:
- Registration with email verification
- Login/logout with session management
- Password reset functionality
- Rate limiting and security measures

### Day 11-14: Publisher Portal Interface

#### Task 5.1: Publisher Portal Layout
**Files**:
- `/app/publisher/layout.tsx`
- `/app/publisher/page.tsx` (Dashboard)
- `/components/publisher/PublisherNavigation.tsx`

#### Task 5.2: Core Publisher Pages
**Files**:
- `/app/publisher/profile/page.tsx` - Contact information management
- `/app/publisher/websites/page.tsx` - Website portfolio management
- `/app/publisher/pricing/page.tsx` - Pricing and availability settings
- `/app/publisher/requests/page.tsx` - Incoming requests
- `/app/publisher/analytics/page.tsx` - Performance metrics

#### Task 5.3: Website Claiming System
**File**: `/components/publisher/WebsiteClaiming.tsx`

Implement verification process:
- Domain ownership verification
- Email verification
- Manual review workflow

## Week 5-6: Integration & Re-onboarding

### Day 15-17: Internal CRM Interface Updates

#### Task 6.1: Enhanced Admin Dashboard
**Files**:
- `/app/admin/publishers/page.tsx` - Publisher directory
- `/app/admin/publishers/[id]/page.tsx` - Detailed publisher view
- `/components/admin/PublisherManagement.tsx`

#### Task 6.2: Relationship Management Tools
**Files**:
- `/components/admin/ContactTimeline.tsx`
- `/components/admin/PublisherAnalytics.tsx`
- `/components/admin/AccountManagerAssignment.tsx`

### Day 18-21: Publisher Re-onboarding System

#### Task 7.1: Re-onboarding Email Campaign
**File**: `/lib/email/publisherOnboarding.ts`

Implement email templates and automation:
- Welcome to new system emails
- Website claiming instructions
- Portal feature introductions
- Support contact information

#### Task 7.2: Data Export and Backup
**File**: `/scripts/exportContactData.ts`

Export existing contact data for manual backup:
```typescript
// Export all existing website contact data before deletion
// This serves as a backup for manual outreach if needed
export async function exportWebsiteContacts() {
  // Implementation to export CSV of existing contacts
  // Include: website domain, email, basic info
  // Use for manual outreach to publishers who don't re-register
}
```

## Implementation Checklist

### Database & Backend (Week 1-2)
- [ ] Create publisher_contacts table
- [ ] Create contact_website_associations table
- [ ] Add enhanced columns to websites table
- [ ] Remove website_contacts table
- [ ] Update schema files
- [ ] Create publisher contact service
- [ ] Create enhanced website service
- [ ] Build API endpoints for contacts
- [ ] Build API endpoints for associations
- [ ] Add comprehensive error handling
- [ ] Write unit tests for services

### Publisher Portal (Week 3-4)
- [ ] Create publisher authentication schema
- [ ] Implement publisher authentication service
- [ ] Build publisher portal layout
- [ ] Create profile management page
- [ ] Create website management page
- [ ] Create pricing settings page
- [ ] Create request inbox page
- [ ] Create analytics dashboard
- [ ] Implement website claiming system
- [ ] Add email verification flow
- [ ] Implement security measures
- [ ] Test all portal functionality

### Integration & Re-onboarding (Week 5-6)
- [ ] Update internal admin interfaces
- [ ] Create publisher management tools
- [ ] Build relationship timeline views
- [ ] Implement analytics dashboards
- [ ] Create re-onboarding email templates
- [ ] Set up automated email campaigns
- [ ] Export existing contact data
- [ ] Test complete system integration
- [ ] Perform security audit
- [ ] Create user documentation
- [ ] Train internal team
- [ ] Launch re-onboarding campaign

## Risk Mitigation

### Technical Risks
1. **Airtable Sync Compatibility**: Test enhanced website fields with existing sync
2. **Publisher Portal Security**: Comprehensive security testing and review
3. **Data Integrity**: Extensive testing of associations and constraints

### Business Risks
1. **Publisher Adoption**: Incentives and dedicated support during transition
2. **Contact Data Loss**: Backup export and manual outreach capability
3. **Operational Disruption**: Gradual rollout with fallback procedures

## Success Criteria

### Technical
- [ ] All database migrations run successfully
- [ ] Publisher portal passes security audit
- [ ] API response times < 200ms
- [ ] Zero data integrity issues
- [ ] Comprehensive test coverage > 80%

### Business
- [ ] 70% publisher re-engagement within 60 days
- [ ] 95% uptime during transition
- [ ] Zero critical security vulnerabilities
- [ ] Internal team trained and comfortable with new system
- [ ] Documentation complete and accessible

## Post-Launch Activities

### Week 7: Monitoring & Optimization
- Monitor publisher portal usage
- Track re-onboarding success rates
- Gather feedback from internal team and publishers
- Optimize database queries and performance
- Address any bug reports or feature requests

### Week 8-12: Enhancement & Scale
- Implement advanced analytics features
- Add bulk operations for internal team
- Integrate with existing workflow systems
- Plan for advanced publisher features
- Prepare for potential marketplace integration

This roadmap provides a clear path to implementing the Publisher CRM system using the clean slate approach, with specific technical tasks, timelines, and success criteria.