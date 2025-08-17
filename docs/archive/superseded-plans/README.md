# Archived Documentation

This directory contains superseded planning documents that have been replaced by the current implementation.

## Why These Were Archived

These documents described a "clean slate" approach where the old `websiteContacts` table would be deleted and publishers would re-register from scratch. However, the actual implementation (migration 0035) took an "enhancement layer" approach that preserves all existing data.

## Current Documentation

For the actual implementation, see:
- `/docs/02-architecture/publisher-system-current-state.md` - What's actually built
- `/docs/02-architecture/publisher-system-roadmap.md` - What still needs to be implemented

## Archived Files

1. **publisher-crm-prd-revised.md** - Original PRD proposing clean slate approach
2. **publisher-crm-implementation-roadmap.md** - Original 6-week implementation plan
3. **publisher-system-integration.md** - Initial integration plan (replaced by current-state + roadmap)

## Key Differences

**Original Plan**: Delete old data, start fresh with new schema
**Actual Implementation**: Add enhancement layer on top of existing data

The valuable elements from these documents (re-onboarding strategy, success metrics, risk mitigation) have been incorporated into the current roadmap.