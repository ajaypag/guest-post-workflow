# Guest Post Workflow

Production-ready workflow system for managing guest post operations with AI integration, bulk analysis, and multi-user support.

## 🚀 Quick Start

**Prerequisites**: Node.js 18+, PostgreSQL 14+

```bash
# Clone and install
git clone https://github.com/your-org/guest-post-workflow.git
cd guest-post-workflow
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Configuration below)

# Initialize database
npm run db:migrate

# Run locally
npm run dev
# Open http://localhost:3000
```

**Default login**: 
- Internal: `admin@example.com` / `admin123`
- Account: Create via `/account/signup`

## 🎯 Key Features

### Core Functionality
- **16-Step Workflow System** - Complete guest post creation pipeline
- **AI-Powered Content** - O3/O4-mini integration for article generation
- **Bulk Domain Analysis** - Qualify thousands of sites with AI
- **Multi-Client Orders** - Service fee pricing model
- **Dual Authentication** - Internal team + external clients

### System Status
| Feature | Status | Notes |
|---------|--------|-------|
| Workflow Management | ✅ Production | 16 steps, auto-save |
| AI Integration | ✅ Production | O3, O4-mini models |
| Bulk Analysis | ✅ Production | DataForSEO + AI qualification |
| Authentication | ✅ Production | JWT + HTTP-only cookies |
| Order System | ⚠️ Partial | Complete through invoicing |
| Payment Processing | ❌ Manual | No gateway integration |
| Email Notifications | ❌ Not Implemented | Resend configured but unused |

## 📖 Documentation

### Essential Guides
| Guide | Description |
|-------|-------------|
| [Documentation Index](docs/DOCUMENTATION_INDEX.md) | Complete documentation map |
| [Local Development](docs/01-getting-started/local-development.md) | Detailed setup instructions |
| [Production Deploy](docs/01-getting-started/deployment.md) | Coolify deployment guide |
| [AI Integration](docs/02-architecture/ai-integration.md) | GPT/O3 implementation |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Comprehensive technical reference |

### System Documentation
- [Order System](docs/02-architecture/order-system.md) - Order flow (in development)
- [Bulk Analysis](docs/02-architecture/bulk-analysis.md) - Domain qualification
- [Authentication](docs/02-architecture/authentication.md) - Security & auth
- [Pricing System](docs/02-architecture/pricing-system.md) - Service fee model
- [Database Schema](docs/02-architecture/database-schema.md) - Data architecture

## 🔧 Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Authentication
NEXTAUTH_SECRET=generate-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# OpenAI (Required for AI features)
OPENAI_API_KEY=sk-your-key-here

# DataForSEO (Required for bulk analysis)
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password

# Email (Optional - not fully implemented)
RESEND_API_KEY=re_your_key_here
```

### OpenAI Accounts Supported
- info@onlyoutreach.com
- ajay@pitchpanda.com
- ajay@linkio.com

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build           # Production build
npm run lint            # Check code style
npm run typecheck       # TypeScript validation

# Database
npm run db:migrate      # Run migrations
npm run db:studio       # Prisma Studio GUI
npm run db:seed         # Seed test data

# Testing
npm run test            # Run tests (if configured)
```

## 🔍 Troubleshooting

### Quick Diagnostics
- **System Health**: `/database-checker`
- **Full Diagnostics**: `/admin/diagnostics`
- **Agent Monitoring**: `/admin/agent-diagnostics`
- **VARCHAR Issues**: `/admin/varchar-limits`

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL format
postgresql://user:password@host:port/database
```

**AI Features Not Working**
```bash
# Test OpenAI connection
curl /api/admin/test-o3-api-call

# Check API key
echo $OPENAI_API_KEY
```

**Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## 🏗️ Project Structure

```
/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes
│   ├── admin/          # Admin pages
│   ├── account/        # Account pages
│   └── orders/         # Order management
├── components/         # React components
│   ├── orders/        # Order-specific
│   ├── steps/         # Workflow steps
│   └── ui/            # Shared UI
├── lib/               # Core libraries
│   ├── services/      # Business logic
│   ├── db/           # Database layer
│   └── utils/        # Utilities
├── docs/             # Documentation
└── migrations/       # Database migrations
```

## 🚦 Development Workflow

### Feature Development
1. Create feature branch from `main`
2. Run `npm run dev` for local testing
3. Ensure `npm run build` passes
4. Update relevant documentation
5. Create PR with description

### Before Committing
```bash
# Must pass
npm run lint
npm run typecheck
npm run build

# Recommended
npm run db:migrate  # If schema changed
```

## 📊 System Requirements

### Minimum
- Node.js 18+
- PostgreSQL 14+
- 2GB RAM
- 10GB disk space

### Recommended (Production)
- Node.js 20 LTS
- PostgreSQL 15+
- 4GB+ RAM
- 20GB+ disk space
- Redis (for future rate limiting)

## 🔒 Security

- JWT authentication with HTTP-only cookies
- Bcrypt password hashing
- Rate limiting on auth endpoints
- CSRF protection via SameSite
- Input validation and sanitization
- SQL injection prevention via Drizzle ORM

## 📈 Performance

- Auto-save with race condition prevention
- Efficient bulk operations (100 domains/batch)
- Response caching for expensive operations
- Database indexes on critical queries
- Lazy loading for large datasets

## 🤝 Contributing

This is a private repository for OutreachLabs internal use.

For team members:
1. Check [CLAUDE.md](CLAUDE.md) for AI coding guidelines
2. Review [Developer Guide](docs/DEVELOPER_GUIDE.md)
3. Follow existing patterns and conventions
4. Update documentation for significant changes

## 📄 License

Private - OutreachLabs Internal Use Only

---

**Need Help?**
- 📚 Browse [Documentation Index](docs/DOCUMENTATION_INDEX.md)
- 🔍 Search codebase for examples
- 💬 Contact team lead for support
- 🐛 Report issues in internal tracker

**Version**: 1.1.0 | **Status**: Production (with ongoing development) | **Last Updated**: 2025-08-08