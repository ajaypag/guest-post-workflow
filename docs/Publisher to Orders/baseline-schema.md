# Baseline Schema Documentation
**Date**: 2025-01-02
**Purpose**: Document current state before publisher integration changes

## order_line_items Table - Publisher Fields

Current publisher-related fields in `order_line_items`:
- `publisherId`: uuid('publisher_id') - NULLABLE
- `publisherOfferingId`: uuid('publisher_offering_id') - NULLABLE  
- `publisherStatus`: varchar('publisher_status', { length: 50 }) - NULLABLE
- `publisherPrice`: integer('publisher_price') - In cents - NULLABLE
- `platformFee`: integer('platform_fee') - In cents - NULLABLE
- `publisherNotifiedAt`: timestamp('publisher_notified_at') - NULLABLE
- `publisherAcceptedAt`: timestamp('publisher_accepted_at') - NULLABLE
- `publisherSubmittedAt`: timestamp('publisher_submitted_at') - NULLABLE

Fields to KEEP:
- `publisherId`
- `publisherOfferingId`
- `publisherPrice`

Fields to REMOVE (belong in workflows):
- `publisherStatus`
- `platformFee`
- `publisherNotifiedAt`
- `publisherAcceptedAt`
- `publisherSubmittedAt`

## publishers Table (from accountSchema)
- Standard user account fields
- `is_shadow` flag for internal-created publishers

## publisher_offerings Table
- `id`: Primary key
- `publisherId`: References publishers (NOT direct FK)
- `basePrice`: integer (nullable - NULL = unknown)
- `offeringType`, `offeringName`: descriptive fields
- `turnaroundDays`: delivery timeframe
- Source email tracking fields for audit

## publisher_offering_relationships Table
- Links publishers → websites through offerings
- `publisherId`: References publisher
- `offeringId`: References offering (nullable)
- `websiteId`: References website
- Relationship metadata (isPrimary, isActive, etc.)

## Key Observations
1. No direct foreign key constraints from order_line_items to publishers
2. Publisher offerings linked to websites via relationships table
3. Several publisher fields in order_line_items are unused (workflow-related)