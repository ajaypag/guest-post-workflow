# Operations & Administration

Documentation for system operations, diagnostics, and maintenance.

## Contents

### Diagnostics & Monitoring
- **[diagnostics.md](diagnostics.md)** - System diagnostics and debugging
- **[agent-diagnostics-guide.md](agent-diagnostics-guide.md)** - AI agent diagnostics

### Services
- **[email-service.md](email-service.md)** - Email service configuration

### Migrations
- **[migration-checklist.md](migration-checklist.md)** - Database migration procedures
- **[order-type-migration.md](order-type-migration.md)** - Order system migration guide

## Quick Diagnostics

### Health Check Endpoints
- `/database-checker` - System health
- `/admin/diagnostics` - Full diagnostics
- `/admin/agent-diagnostics` - AI monitoring
- `/admin/varchar-limits` - Database validation

### Common Operations

**Check System Health**
```bash
curl https://your-domain/database-checker
```

**Run Migrations**
```bash
npm run db:migrate
```

**View Database**
```bash
npm run db:studio
```

## Troubleshooting

### Database Issues
1. Check connection: `/database-checker`
2. Verify credentials in `.env`
3. Check PostgreSQL is running

### AI Issues
1. Test API: `/api/admin/test-o3-api-call`
2. Check OpenAI key
3. Review agent diagnostics

### Performance Issues
1. Check `/admin/diagnostics`
2. Review database indexes
3. Check for VARCHAR truncation

## Monitoring Checklist

- [ ] Database connections healthy
- [ ] AI API keys valid
- [ ] No VARCHAR truncation issues
- [ ] Auto-save functioning
- [ ] Rate limiting active
- [ ] Error rates normal