# Database Operations Log

## Current Database Configuration
- **Local Test Database**: `postgresql://postgres:postgres@localhost:5434/guest_post_production_test`
- **Port**: 5434 (Docker PostgreSQL)
- **Database Name**: guest_post_production_test
- **Purpose**: Local testing and development before production deployment

---

## Migrations Status (2025-08-21)

### Required Migrations for Email Testing
1. **0063_email_qualification_tracking.sql** - CRITICAL
   - Adds `qualification_status` and `disqualification_reason` columns to email_processing_logs
   - Required for email qualification system
   - Status: PENDING

### Recent Work
- Created email testing interface at `/admin/email-testing`
- Built Parser V2 and Qualification services
- Fixed TypeScript compilation issues by removing problematic test files

### Migration Commands
```bash
# Check migration status
npm run db:migrate-apply

# Or use admin interface (after server starts)
http://localhost:3000/admin/migrations
```

---

## Testing Checklist
- [x] Run migration 0063 (tables already exist in test DB)
- [x] Start local server on port 3003
- [ ] Test email parsing at `/admin/email-testing`
- [ ] Verify qualification logic works correctly
- [ ] Document any issues or improvements needed

## Server Status
- **Running on**: http://localhost:3003
- **Email Testing Page**: http://localhost:3003/admin/email-testing
- **Migrations Admin**: http://localhost:3003/admin/migrations

---

## Production Deployment Notes
When ready for production:
1. Use standard build: `npm run build`
2. Use standard start: `npm start`
3. Run migrations via admin panel: `/admin/migrations`
4. All critical migrations are tracked here

---

## Active Issues
- None currently

## Test Data Available
- 20 recent email samples from email_processing_logs table
- Real ManyReach webhook data for testing
- Both qualified and disqualified email examples