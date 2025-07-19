# Guest Post Workflow

A 16-step workflow management system for creating and publishing guest posts.

## 🚀 Quick Start

**Prerequisites**: Node.js 18+, PostgreSQL

```bash
# Clone and install
git clone https://github.com/ajaypag/guest-post-workflow.git
cd guest-post-workflow
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run locally
npm run dev
# Open http://localhost:3000
```

**Default login**: `admin@example.com` / `admin123`

## 📋 What It Does

- **16-step workflow** from topic research to email templates
- **Multi-user** with PostgreSQL database
- **Client management** with target pages tracking
- **OpenAI integration** for content generation
- **Auto-save** at every step

## 📖 Documentation

| Topic | Description |
|-------|-------------|
| [Local Development](docs/setup/LOCAL_DEV.md) | Full setup guide, troubleshooting |
| [Coolify Deployment](docs/setup/COOLIFY_DEPLOY.md) | Production deployment steps |
| [Building Agents](docs/agents/BUILDING_BLOCKS.md) | Create new AI agents |
| [Database Rules](docs/db/SCHEMA_RULES.md) | Schema patterns, VARCHAR sizes |
| [Diagnostics](docs/admin/DIAGNOSTICS.md) | Debug production issues |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | All technical details |

## 🛠️ Common Tasks

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:studio    # Browse database
npm run lint         # Check code style
```

## 🔍 Troubleshooting

1. **Database errors**: Visit `/database-checker`
2. **Workflow issues**: Check `/api/workflows/[id]/validate`
3. **Login problems**: Verify `DATABASE_URL` in `.env`

## 📄 License

Private - OutreachLabs Internal Use

---

**Need help?** Check [docs/](docs/) or search the codebase for examples.