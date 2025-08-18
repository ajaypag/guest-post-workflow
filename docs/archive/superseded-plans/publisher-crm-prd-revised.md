# Product Requirements Document: Publisher CRM System
## Clean Slate Implementation Strategy

**Version**: 2.0 (Revised)  
**Date**: August 13, 2025  
**Status**: Ready for Implementation  
**Complexity**: Medium (Simplified from High)

## Executive Summary

This PRD outlines a simplified implementation of a Publisher CRM system that leverages a "clean slate" approach to contact management. By eliminating the need to preserve existing `websiteContacts` data, we can implement a modern, person-centric contact system that significantly reduces implementation complexity while providing better publisher relationship management capabilities.

## Problem & Opportunity

### Current Pain Points
- **Fragmented Contact Data**: Current `websiteContacts` table ties contacts directly to websites, creating data silos
- **Limited Relationship Management**: No comprehensive view of publisher relationships across multiple websites
- **Scalability Issues**: Current structure doesn't support complex publisher scenarios (multiple websites, team contacts, hierarchies)
- **Publisher Portal Gaps**: No self-service portal for publishers to manage their information

### Business Opportunity
**Clean Slate Advantages**:
- **Simplified Implementation**: No data migration complexity
- **Modern Architecture**: Person-first design from day one
- **Faster Time-to-Market**: Reduced by ~40% without migration overhead
- **Publisher Re-engagement**: Fresh start opportunity to re-establish relationships
- **Quality Control**: Opportunity to verify and update all publisher information

## Solution Overview

### Core Strategy: Clean Slate + Websites Evolution

1. **Preserve Critical Data**: Keep existing `websites` table as foundation
2. **Delete Non-Critical**: Remove `websiteContacts` table entirely
3. **Implement New System**: Build person-centric contact management
4. **Publisher Re-onboarding**: Structured process to rebuild contact relationships
5. **Websites Enhancement**: Extend existing table to support new features

### Architecture Principles
- **Person-Centric**: Contacts are independent entities that can be associated with multiple websites
- **Flexible Associations**: Support complex publisher scenarios (teams, hierarchies, multiple roles)
- **Publisher Self-Service**: Portal for publishers to manage their own information
- **Airtable Compatibility**: Maintain sync capabilities with enhanced data structure

## Detailed Requirements

### Phase 1: Database Schema Implementation (Week 1-2)

#### New Tables

**Publisher Contacts Table**
```sql
CREATE TABLE publisher_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  
  -- Professional Information  
  job_title VARCHAR(100),
  company VARCHAR(255),
  linkedin_url VARCHAR(500),
  
  -- Contact Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email', -- email, phone, linkedin
  timezone VARCHAR(50),
  communication_notes TEXT,
  
  -- Relationship Data
  relationship_status VARCHAR(20) DEFAULT 'prospect', -- prospect, active, inactive, blocked
  acquisition_channel VARCHAR(50), -- referral, outreach, inbound, etc.
  first_contact_date DATE,
  last_contact_date DATE,
  
  -- Internal Tracking
  internal_notes TEXT,
  assigned_account_manager UUID REFERENCES users(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

**Contact Website Associations Table**
```sql
CREATE TABLE contact_website_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES publisher_contacts(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Association Details
  role VARCHAR(50) NOT NULL, -- owner, editor, contact_person, decision_maker, etc.
  is_primary_contact BOOLEAN DEFAULT false,
  permissions TEXT[], -- pricing, content, technical, etc.
  
  -- Service Information
  offers_guest_posts BOOLEAN DEFAULT false,
  offers_link_inserts BOOLEAN DEFAULT false,
  guest_post_price DECIMAL(10,2),
  link_insert_price DECIMAL(10,2),
  minimum_turnaround_days INTEGER,
  
  -- Terms & Conditions
  payment_terms VARCHAR(50), -- net_30, prepaid, etc.
  content_requirements TEXT,
  link_requirements TEXT,
  
  -- Status Tracking
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  relationship_start_date DATE,
  relationship_end_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  
  -- Prevent duplicate roles for same contact/website
  UNIQUE(contact_id, website_id, role)
);
```

#### Enhanced Websites Table
```sql
-- Add new columns to existing websites table
ALTER TABLE websites ADD COLUMN IF NOT EXISTS (
  -- Enhanced Publisher Information
  publisher_tier VARCHAR(20) DEFAULT 'standard', -- premium, standard, basic
  preferred_content_types TEXT[], -- ["technology", "business", "lifestyle"]
  editorial_calendar_url VARCHAR(500),
  content_guidelines_url VARCHAR(500),
  
  -- Publishing Details
  typical_turnaround_days INTEGER DEFAULT 7,
  accepts_do_follow BOOLEAN DEFAULT true,
  requires_author_bio BOOLEAN DEFAULT false,
  max_links_per_post INTEGER DEFAULT 2,
  
  -- Business Information
  primary_contact_id UUID REFERENCES publisher_contacts(id),
  publisher_company VARCHAR(255),
  website_language VARCHAR(10) DEFAULT 'en',
  target_audience TEXT,
  
  -- Performance Tracking
  avg_response_time_hours INTEGER,
  success_rate_percentage DECIMAL(5,2),
  last_campaign_date DATE,
  total_posts_published INTEGER DEFAULT 0,
  
  -- Internal Classification
  internal_quality_score INTEGER CHECK (internal_quality_score >= 1 AND internal_quality_score <= 10),
  internal_notes TEXT,
  account_manager_id UUID REFERENCES users(id)
);
```

### Phase 2: Publisher Portal (Week 3-4)

#### User Stories

**As a Publisher**:
- I want to create a profile with my contact information so that I can manage my publisher account
- I want to add and manage my websites so that I can offer them for guest posting opportunities
- I want to set pricing and availability for each website so that I can control my service offerings
- I want to view incoming guest post requests so that I can respond to opportunities
- I want to update my contact preferences so that communication happens on my terms
- I want to view my publishing history and performance metrics so that I can track my success

**As an Internal User**:
- I want to view all publisher contacts in a unified dashboard so that I can manage relationships effectively
- I want to see the complete relationship history for each publisher so that I can provide personalized service
- I want to track performance metrics per publisher so that I can identify top performers
- I want to assign account managers to publishers so that we can provide dedicated support

#### Portal Features

**Publisher Dashboard**:
- Contact information management
- Website portfolio management
- Pricing and availability settings
- Request inbox and response tracking
- Performance analytics
- Communication history

**Internal CRM Interface**:
- Publisher contact directory
- Relationship timeline view
- Performance dashboards
- Account management tools
- Communication tracking

### Phase 3: Publisher Re-onboarding (Week 5-6)

#### Re-onboarding Strategy

**Existing Website Preservation**:
- All existing websites remain in the system with full data
- No disruption to ongoing Airtable synchronization
- Website performance history and metrics preserved

**Contact Relationship Rebuilding**:
1. **Automated Outreach**: Email existing publishers (from old contact data) about new portal
2. **Self-Service Registration**: Publishers create their own contact profiles
3. **Website Claiming**: Publishers claim ownership of their websites through verification process
4. **Data Enhancement**: Publishers update and enhance their information through portal
5. **Account Manager Assignment**: Internal team assigns dedicated managers

**Verification Process**:
- Email verification for website ownership
- Domain verification through DNS or file upload
- Manual review for high-value publishers
- Grandfathered pricing for existing relationships

## Technical Implementation

### Database Migration Plan

**Step 1: Schema Creation**
```sql
-- Create new tables
-- (Tables defined above)

-- Add indexes for performance
CREATE INDEX idx_publisher_contacts_email ON publisher_contacts(email);
CREATE INDEX idx_publisher_contacts_status ON publisher_contacts(relationship_status);
CREATE INDEX idx_contact_associations_contact ON contact_website_associations(contact_id);
CREATE INDEX idx_contact_associations_website ON contact_website_associations(website_id);
CREATE INDEX idx_websites_primary_contact ON websites(primary_contact_id);
```

**Step 2: Remove Old Tables**
```sql
-- Clean removal of deprecated tables
DROP TABLE IF EXISTS website_contacts CASCADE;
-- Update relations in schema files
```

**Step 3: Update Application Code**
- Remove all references to `websiteContacts`
- Implement new service layers for publisher contact management
- Update API endpoints
- Build publisher portal interfaces

### API Endpoints

**Publisher Contact Management**
```
GET /api/publisher-contacts - List all contacts (internal only)
POST /api/publisher-contacts - Create new contact
GET /api/publisher-contacts/[id] - Get contact details
PUT /api/publisher-contacts/[id] - Update contact
DELETE /api/publisher-contacts/[id] - Delete contact (soft delete)

GET /api/publisher-contacts/[id]/websites - Get websites for contact
POST /api/publisher-contacts/[id]/websites - Associate website
PUT /api/publisher-contacts/[id]/websites/[websiteId] - Update association
DELETE /api/publisher-contacts/[id]/websites/[websiteId] - Remove association
```

**Publisher Portal**
```
GET /api/publisher/profile - Get current publisher profile
PUT /api/publisher/profile - Update publisher profile
GET /api/publisher/websites - Get publisher's websites
POST /api/publisher/websites/claim - Claim website ownership
GET /api/publisher/requests - Get guest post requests
PUT /api/publisher/requests/[id] - Respond to request
```

### Authentication Strategy

**Publisher Authentication**:
- Separate authentication system for publishers
- Email-based registration and verification
- Password reset functionality
- Session management with HTTP-only cookies

**Permission Model**:
```typescript
type UserType = 'internal' | 'publisher';
type PublisherRole = 'owner' | 'editor' | 'contact_person' | 'decision_maker';

// Internal users: Full access to all data
// Publishers: Access only to their associated websites and profile
```

## Success Metrics

### Operational Metrics
- **Contact Data Quality**: 95% complete profiles within 30 days
- **Publisher Re-onboarding Rate**: 70% of active websites reclaimed within 60 days
- **Response Time**: Average publisher response time < 24 hours
- **Portal Adoption**: 80% of active publishers using self-service portal

### Business Metrics
- **Publisher Satisfaction**: NPS score > 50 within 90 days
- **Operational Efficiency**: 30% reduction in manual contact management tasks
- **Revenue Impact**: 15% increase in successful placements due to better relationship data
- **Relationship Growth**: 25% increase in publisher engagement metrics

## Risk Analysis

### Technical Risks
**Low Risk** (Clean Slate Benefits):
- ✅ No data migration complexity
- ✅ No backward compatibility issues
- ✅ Clean architecture from start

**Medium Risk**:
- **Airtable Sync Changes**: Need to update sync logic for enhanced website data
  - *Mitigation*: Maintain existing sync fields, add new fields as optional
- **Publisher Portal Security**: New authentication system
  - *Mitigation*: Use proven authentication patterns from existing system

### Business Risks
**Medium Risk**:
- **Publisher Re-onboarding**: Some publishers may not re-engage
  - *Mitigation*: Proactive outreach, incentives, dedicated support
- **Temporary Contact Loss**: Gap period during re-onboarding
  - *Mitigation*: Export existing contact data for manual outreach backup

### Operational Risks
**Low Risk**:
- **Team Training**: New CRM interface
  - *Mitigation*: Comprehensive training program, documentation
- **Process Changes**: New publisher management workflows
  - *Mitigation*: Gradual rollout, change management support

## Timeline & Resources

### Development Timeline
**Total Duration**: 6 weeks (Reduced from 10+ weeks)

**Week 1-2: Database & Core Backend**
- Database schema implementation
- Core service layer development
- API endpoint creation
- Basic CRUD operations

**Week 3-4: Publisher Portal**
- Publisher authentication system
- Portal interface development
- Website claiming functionality
- Profile management features

**Week 5-6: Re-onboarding & Integration**
- Publisher outreach campaigns
- Internal CRM interface updates
- Testing and quality assurance
- Documentation and training

### Resource Requirements
- **1 Senior Developer**: Database and backend development
- **1 Frontend Developer**: Publisher portal and internal interfaces
- **1 Product Manager**: Coordination and publisher outreach
- **QA Support**: Testing and validation

### Quick Wins (Week 1)
- Database schema deployment
- Basic contact creation functionality
- Internal contact directory view
- Publisher registration page

## Clean Slate Benefits Summary

### Implementation Benefits
1. **40% Faster Delivery**: No migration complexity
2. **Lower Risk**: No data corruption or compatibility issues
3. **Modern Architecture**: Built for scalability from day one
4. **Quality Control**: Fresh, accurate data from start

### Business Benefits
1. **Publisher Re-engagement**: Opportunity to strengthen relationships
2. **Data Quality**: Complete, verified publisher information
3. **Process Improvement**: Streamlined workflows from launch
4. **Competitive Advantage**: Modern CRM capabilities immediately

### Operational Benefits
1. **Simplified Training**: No legacy system knowledge needed
2. **Clean Reporting**: Consistent data structure for analytics
3. **Scalable Foundation**: Built to handle future growth
4. **Integration Ready**: Designed for future marketplace features

## Next Steps

1. **Stakeholder Approval**: Review and approve simplified approach
2. **Technical Planning**: Detailed database migration and API design
3. **Publisher Communication Strategy**: Plan re-onboarding campaigns
4. **Resource Allocation**: Assign development team
5. **Timeline Confirmation**: Confirm 6-week delivery target

---

**This revised PRD leverages the clean slate opportunity to deliver a superior publisher CRM system faster and with lower risk than the original migration-heavy approach.**