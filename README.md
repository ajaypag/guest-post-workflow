# Guest Post Workflow v1.0.0 🚀

A comprehensive 16-step guest post workflow management system built for OutreachLabs.

## 📋 Overview

This Next.js application provides a complete workflow management system for guest post creation, from site selection to final publication. It includes multi-user support, client management, and integrates with OpenAI GPT projects for content creation.

## ✨ Key Features

- **16-Step Workflow System** - Complete guest post creation process
- **Multi-User Support** - PostgreSQL database with role-based access
- **Client Management** - Track clients and their target pages
- **Workflow Persistence** - All step data saves automatically
- **Multi-Account GPT Integration** - Support for 3 OpenAI accounts
- **Admin Dashboard** - User management and analytics

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.4 with React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom auth with bcryptjs
- **Styling**: Tailwind CSS
- **Deployment**: Coolify v4

### Database Schema
- Users (authentication & roles)
- Clients (customer information)
- Workflows (16-step process data as JSON)
- Target Pages (client website targets)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajaypag/guest-post-workflow.git
   cd guest-post-workflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=disable
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Visit [http://localhost:3000](http://localhost:3000)

### First Time Setup
- Default admin: `admin@example.com` / `admin123`
- Database initializes automatically on first run
- Create clients and start your first workflow

## 📖 Usage

### The 16-Step Workflow Process

1. **Domain Selection** - Choose target publication site
2. **Site Qualification** - Research and prepare
3. **Topic Generation** - Find ranking opportunities
4. **Outline Creation** - Deep research with GPT-o3
5. **Article Draft** - Write with GPT-o3 Advanced Reasoning
6. **Semantic SEO** - Optimize content section by section
7. **Polish & Finalize** - Brand alignment review
8. **Formatting & QA** - Manual review and citations
9. **Internal Links** - Add guest site links
10. **Tier 2 Links** - Link to other guest posts
11. **Client Mention** - Add for AI overviews
12. **Client Link** - Natural link insertion
13. **Images** - Generate visual content
14. **Link Requests** - Internal link opportunities
15. **URL Suggestion** - Recommend post URL
16. **Email Template** - Publisher communication

### Client Management
- Add clients with website and description
- Manage target pages for each client
- Track page status (active/inactive/completed)
- Assign users to clients

### OpenAI Integration
The system supports three OpenAI accounts:
- **info@onlyoutreach.com** (primary)
- **ajay@pitchpanda.com**
- **ajay@linkio.com**

Users select the appropriate GPT link based on their login.

## 🔧 Development

### Build & Test
```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Operations
```bash
# Generate migrations
npm run db:generate

# View database
npm run db:studio
```

### Diagnostic Tools
- `/database-checker` - System health analysis
- `/api/workflows/[id]/validate` - Workflow validation
- `/api/check-table-structure` - Schema verification

## 🚀 Deployment

### Coolify Deployment
1. Connect GitHub repository to Coolify
2. Set environment variables in Coolify dashboard
3. Configure PostgreSQL database
4. Deploy as Next.js application

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@internal-host:5432/database?sslmode=disable
NEXTAUTH_SECRET=production-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## 📝 Version History

### v1.0.0 (2025-01-02) - Production Release
- ✅ Complete workflow system with data persistence
- ✅ Multi-user PostgreSQL integration
- ✅ Client and target page management
- ✅ Multi-account OpenAI support
- ✅ All major bugs fixed and tested

## 📚 Documentation

- **CLAUDE.md** - Technical documentation for AI reference
- **CHANGELOG.md** - Detailed version history
- **API Documentation** - Available endpoints and usage

## 🐛 Known Issues

None in v1.0.0 - this is a stable production release.

## 🤝 Support

For issues or questions:
1. Check the diagnostic tools at `/database-checker`
2. Review logs for error details
3. Verify environment variables are correct

## 📄 License

Private - OutreachLabs Internal Use

---

**Built with ❤️ for OutreachLabs**