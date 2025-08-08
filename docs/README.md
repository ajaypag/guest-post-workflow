# Documentation

Welcome to the Guest Post Workflow documentation. All documentation follows a clear, organized structure for easy navigation.

## 📁 Documentation Structure

### [01-getting-started/](01-getting-started/)
**For new developers and deployments**
- Local development setup
- Production deployment
- Third-party integrations

### [02-architecture/](02-architecture/)
**System design and architecture**
- Core systems (orders, bulk analysis, AI)
- Authentication and security
- Database schema
- Technical debt tracking

### [03-development/](03-development/)
**Developer guides and patterns**
- Building AI agents
- Design patterns
- Best practices
- Code guidelines

### [04-operations/](04-operations/)
**System operations and maintenance**
- Diagnostics and monitoring
- Service configuration
- Database migrations
- Troubleshooting

### [05-reference/](05-reference/)
**API and technical references**
- API documentation
- Feature specifications
- Data formats
- Integration guides

### [06-planning/](06-planning/)
**Product planning and design**
- Product requirements
- Design documents
- Implementation plans
- QA documentation

### [archive/](archive/)
**Historical documentation**
- Deprecated features
- Old implementations
- Legacy documentation

## 🚀 Quick Links

### Essential Reading
1. [Local Development Setup](01-getting-started/local-development.md)
2. [System Architecture](02-architecture/README.md)
3. [AI Integration Guide](02-architecture/ai-integration.md)
4. [Authentication System](02-architecture/authentication.md)

### For Developers
- [Building AI Agents](03-development/building-ai-agents.md)
- [Database Guidelines](03-development/database-guidelines.md)
- [Auto-Save Pattern](03-development/auto-save-pattern.md)

### For Operations
- [System Diagnostics](04-operations/diagnostics.md)
- [Deployment Guide](01-getting-started/deployment.md)
- [Migration Checklist](04-operations/migration-checklist.md)

## 📊 System Status

| Component | Status | Documentation |
|-----------|--------|--------------|
| Workflow System | ✅ Production | [Overview](02-architecture/README.md) |
| AI Integration | ✅ Production | [AI Guide](02-architecture/ai-integration.md) |
| Bulk Analysis | ✅ Production | [Bulk Analysis](02-architecture/bulk-analysis.md) |
| Authentication | ✅ Production | [Auth System](02-architecture/authentication.md) |
| Order System | ⚠️ 60% Complete | [Order System](02-architecture/order-system.md) |
| Payments | ❌ Not Implemented | [Planning](06-planning/) |
| Email | ❌ Not Implemented | [Email Service](04-operations/email-service.md) |

## 🔍 Finding Documentation

### By Topic
- **Setup & Installation** → [01-getting-started/](01-getting-started/)
- **How the system works** → [02-architecture/](02-architecture/)
- **Writing code** → [03-development/](03-development/)
- **Running in production** → [04-operations/](04-operations/)
- **API details** → [05-reference/](05-reference/)
- **Future plans** → [06-planning/](06-planning/)

### By User Role
- **New Developer** → Start with [01-getting-started/](01-getting-started/)
- **Backend Developer** → See [02-architecture/](02-architecture/) and [03-development/](03-development/)
- **DevOps Engineer** → Check [04-operations/](04-operations/)
- **Product Manager** → Review [06-planning/](06-planning/)

## 📝 Documentation Standards

### File Naming
- Use lowercase with hyphens: `order-system.md`
- Be descriptive but concise
- Group related docs in folders

### Content Structure
1. Start with overview/purpose
2. Include practical examples
3. Add troubleshooting section
4. Keep it up-to-date

### Maintenance
- Update docs when code changes
- Archive outdated documentation
- Review quarterly for accuracy

## 🤝 Contributing to Docs

When adding documentation:
1. Place in appropriate folder (01-06)
2. Follow naming conventions
3. Update folder README
4. Add to this index if significant

## 📚 Additional Resources

- **Main README**: [/README.md](/README.md)
- **Changelog**: [/CHANGELOG.md](/CHANGELOG.md)
- **AI Coding Guide**: [/CLAUDE.md](/CLAUDE.md)
- **Developer Guide**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

---

**Last Updated**: 2025-08-08  
**Maintained By**: Development Team  
**Questions?** Check existing docs first, then ask team lead.