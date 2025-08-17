# Internal Portal - Website & Publisher Management System

## Overview
Internal portal for team members to manage the website database, assign publishers, control pricing, and oversee the entire guest post marketplace.

## Goals
1. **Centralized Website Management** - Single source of truth for all websites
2. **Publisher Oversight** - Manage publisher relationships and assignments
3. **Quality Control** - Verify websites and publisher relationships
4. **Bulk Operations** - Efficient management of large datasets
5. **Integration Ready** - Prepare for order system integration

## Architecture

### Access Control
- Only internal users (`userType === 'internal'`) can access
- Located at `/internal/*` routes
- Uses existing authentication system
- Leverages admin permissions for sensitive operations

### Database Design (Already Implemented)
```
websites (single entry per domain)
    ↓
publisher_offering_relationships (many-to-many)
    ↓
publisher_offerings (pricing per relationship)
```

## Feature Specifications

### Phase 1: Core Website Management

#### 1.1 Website Dashboard (`/internal/websites`)
- **List View**
  - All websites in database
  - Search by domain, DR, traffic
  - Filter by status, quality, publisher assignment
  - Bulk selection for operations
  - Export to CSV

- **Metrics Overview**
  - Total websites
  - Assigned vs unassigned
  - Quality distribution
  - Publisher coverage

#### 1.2 Website Details (`/internal/websites/[id]`)
- **Information Tabs**
  - Overview: All website data
  - Publishers: List of connected publishers with relationships
  - Pricing: View all publisher offerings for this website
  - History: Audit log of changes
  - Internal Notes: Team-only documentation

- **Actions**
  - Edit website information
  - Assign/remove publishers
  - Set quality ratings
  - Add internal notes
  - Verify/flag website

#### 1.3 Add/Edit Website
- **Manual Entry**
  - Full form with all website fields
  - Airtable ID for sync
  - Internal classification
  - Quality assessment

- **Bulk Import**
  - CSV upload
  - Field mapping
  - Validation preview
  - Conflict resolution (update vs skip existing)

### Phase 2: Publisher Management

#### 2.1 Publisher Relationships (`/internal/publishers`)
- **Overview**
  - All publishers in system
  - Website count per publisher
  - Performance metrics
  - Verification status

#### 2.2 Assignment Interface
- **Bulk Assignment**
  - Select multiple websites
  - Choose publisher
  - Set relationship type
  - Configure default pricing

- **Smart Matching**
  - Suggest publishers based on niche
  - Match by pricing range
  - Geographic considerations

#### 2.3 Relationship Management
- **Verification Tools**
  - Verify publisher owns/manages website
  - Flag suspicious relationships
  - Audit trail of verifications

- **Pricing Control**
  - View all offerings for a website
  - Compare publisher prices
  - Set internal cost benchmarks
  - Flag outlier pricing

### Phase 3: Quality & Analytics

#### 3.1 Quality Assessment
- **Bulk Quality Tools**
  - Set quality ratings
  - Flag websites for review
  - Track quality changes over time

#### 3.2 Analytics Dashboard
- **Marketplace Insights**
  - Publisher distribution
  - Pricing trends
  - Website coverage gaps
  - Relationship types breakdown

### Phase 4: Integration Features

#### 4.1 Order Preparation
- **Domain Matching**
  - Match bulk analysis domains to websites
  - Prepare for order assignment
  - Identify missing websites

#### 4.2 Publisher Assignment for Orders
- **Order Routing**
  - See available publishers for domain
  - Compare pricing and turnaround
  - Assign orders to publishers

## Implementation Plan

### Step 1: Layout & Navigation
- Create `/internal` layout wrapper
- Add navigation sidebar
- Set up permission guards

### Step 2: Website List
- Reuse existing table components
- Add search/filter capabilities
- Implement bulk selection

### Step 3: Website CRUD
- Create/Read/Update/Delete operations
- Form validation
- Audit logging

### Step 4: Bulk Import
- CSV parser
- Validation logic
- Preview interface
- Import processor

### Step 5: Publisher Assignment
- Assignment modal/form
- Relationship type selector
- Batch operations

### Step 6: Quality Tools
- Rating interface
- Verification workflow
- Internal notes system

## UI/UX Patterns

### Reuse Existing Components
- `ResponsiveTable` for lists
- `ResponsiveModal` for forms
- Publisher components where applicable
- Consistent styling with main app

### Internal-Specific Features
- Bulk action toolbar
- Advanced filters
- Admin badges/indicators
- Audit information display

## Security Considerations

1. **Access Control**
   - Check `session.userType === 'internal'`
   - Verify `session.role === 'admin'` for sensitive ops

2. **Audit Trail**
   - Log all modifications
   - Track who changed what and when

3. **Data Validation**
   - Prevent duplicate domains
   - Validate relationship constraints
   - Ensure data integrity

## Success Metrics

1. **Efficiency**
   - Time to add 100 websites < 5 minutes (bulk import)
   - Publisher assignment < 30 seconds per website

2. **Data Quality**
   - 100% websites have quality ratings
   - All publisher relationships verified

3. **Coverage**
   - 80% of websites have at least one publisher
   - Price variance documented for multi-publisher websites

## Technical Stack

- **Frontend**: Next.js App Router, TypeScript, Tailwind CSS
- **Backend**: Existing API routes, Drizzle ORM
- **Database**: PostgreSQL with existing schema
- **Components**: Reuse publisher portal components where possible

## Implementation Status: ✅ FOUNDATION COMPLETE

### Completed Components

1. **Internal Portal Layout** (`/components/internal/InternalLayout.tsx`)
   - Custom navigation for internal team
   - Breadcrumb navigation
   - Quick stats sidebar
   - Mobile responsive

2. **Dashboard** (`/app/internal/page.tsx`)
   - Overview statistics
   - Quick actions grid
   - Recent websites and publishers
   - System health indicators

3. **Website Management** (`/app/internal/websites/page.tsx`)
   - Full CRUD interface for websites
   - Advanced filtering (DR, traffic, publisher status)
   - Bulk selection for operations
   - Pagination
   - Sort by multiple criteria

### Key Features Implemented

- **Unified Database**: Internal team uses same `websites` table as publishers
- **No Duplication**: Each website exists once, can have multiple publishers
- **Flexible Relationships**: Support for owner, editor, manager, broker, contact types
- **Bulk Operations Ready**: Select multiple websites for assignment
- **Search & Filter**: Find websites by domain, metrics, publisher status
- **Quality Tracking**: Verification status visible and manageable

## Risk Mitigation

1. **Data Integrity**
   - Validate all imports
   - Soft deletes where appropriate
   - Backup before bulk operations

2. **Performance**
   - Paginate large lists
   - Optimize queries
   - Cache frequently accessed data

3. **User Experience**
   - Clear feedback on actions
   - Undo capabilities where possible
   - Help documentation

## Next Steps After Implementation

1. Connect to order system
2. Automate publisher verification
3. API for external tools
4. Advanced analytics dashboard
5. Automated quality scoring