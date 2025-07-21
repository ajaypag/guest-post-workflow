# Coolify Deployment Guide

> **Why**: Deploy to production on Coolify v4  
> **Use when**: Setting up new environment or updating deployment  
> **Outcome**: Live production app with PostgreSQL

## Pre-Deployment Checklist

- [ ] GitHub repository connected to Coolify
- [ ] PostgreSQL database created in Coolify
- [ ] Domain configured (optional)
- [ ] Environment variables ready

## Deployment Steps

### 1. Create PostgreSQL Database (2 min)

In Coolify dashboard:
1. **Services** → **Add Service** → **PostgreSQL**
2. Note the internal connection details
3. **Important**: Use internal URL format

### 2. Add Application (3 min)

1. **Projects** → **Add Resource** → **Public Repository**
2. Repository: `https://github.com/ajaypag/guest-post-workflow`
3. Build Pack: **Next.js**
4. Branch: `main` or `semantic-audit-v2`

### 3. Configure Environment (2 min)

Add these variables in Coolify:

```env
# Required
DATABASE_URL=postgresql://postgres:password@postgres:5432/guest_post_workflow?sslmode=disable
NEXTAUTH_SECRET=generate-strong-secret-here
NEXTAUTH_URL=https://your-domain.com

# Optional AI Features
OPENAI_API_KEY=sk-...
OPENAI_API_KEY_BACKUP=sk-...
VECTOR_STORE_ID=vs_...
AGENT_TIMEOUT_MS=300000

# DataForSEO API (for Bulk Qualification)
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
```

**Critical**: 
- Use internal service names (e.g., `postgres` not `localhost`)
- Set `sslmode=disable` for internal connections
- Generate strong NEXTAUTH_SECRET: `openssl rand -base64 32`

### 4. Deploy (5 min)

1. Click **Deploy**
2. Monitor build logs
3. Wait for "Deployment successful"

### 5. Verify Deployment

1. Visit your domain
2. Login: `admin@example.com` / `admin123`
3. Check `/database-checker` for system health

## Production Configuration

### Resource Limits
```yaml
# Recommended minimums
CPU: 1 core
Memory: 1GB
Storage: 10GB
```

### Health Checks
Configure in Coolify:
- Path: `/api/health`
- Interval: 30s
- Timeout: 10s

### Backup Strategy
1. Enable automated PostgreSQL backups
2. Set retention: 7 days minimum
3. Test restore procedure monthly

## Troubleshooting

### Build Failures
```bash
# Check build logs in Coolify
# Common fix: Clear build cache
```

### Database Connection Issues
- Verify internal service name
- Check PostgreSQL is running
- Confirm `sslmode=disable`

### 502 Bad Gateway
- Check application logs
- Verify environment variables
- Ensure database migrations ran

## Post-Deployment

### First Time Setup
1. Change admin password immediately
2. Create production users
3. Configure client accounts

### Monitoring
- Set up uptime monitoring
- Configure error alerts
- Monitor database size

### Updates
1. Push to GitHub
2. Coolify auto-deploys (if enabled)
3. Or manually trigger deployment

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong NEXTAUTH_SECRET
- [ ] Enable HTTPS (Coolify handles this)
- [ ] Restrict database access
- [ ] Regular security updates