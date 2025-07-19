# Local Development Setup

> **Why**: Get the app running locally in < 10 minutes  
> **Use when**: First time setup or troubleshooting local issues  
> **Outcome**: Working development environment with hot reload

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL installed and running
- [ ] Git configured
- [ ] Code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Clone and Install (2 min)

```bash
git clone https://github.com/ajaypag/guest-post-workflow.git
cd guest-post-workflow
npm install
```

### 2. Database Setup (3 min)

Create a PostgreSQL database:
```sql
CREATE DATABASE guest_post_workflow;
```

### 3. Environment Configuration (2 min)

Create `.env.local` file:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/guest_post_workflow?sslmode=disable
NEXTAUTH_SECRET=dev-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

Optional AI features:
```env
OPENAI_API_KEY=sk-...
VECTOR_STORE_ID=vs_...
```

### 4. Start Development (1 min)

```bash
npm run dev
```

Visit http://localhost:3000

**Default login**: `admin@example.com` / `admin123`

## Common Issues & Fixes

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql postgresql://postgres:password@localhost:5432/guest_post_workflow
```

### Port Already in Use
```bash
# Use different port
PORT=3001 npm run dev
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Test production build |
| `npm run db:studio` | Browse database GUI |
| `npm run lint` | Check code style |
| `npm run db:generate` | Create migrations |

## Database Tools

Access Drizzle Studio:
```bash
npm run db:studio
# Opens http://localhost:4983
```

## Testing Workflows

1. Create a test client
2. Start a new workflow
3. Use GPT links for each step
4. Check auto-save works

## Next Steps

- Read [Building Agents](../agents/BUILDING_BLOCKS.md) to add AI features
- Check [Database Rules](../db/SCHEMA_RULES.md) before schema changes
- See [Diagnostics](../admin/DIAGNOSTICS.md) for debugging