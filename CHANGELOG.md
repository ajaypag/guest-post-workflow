# Changelog

All notable changes to the Guest Post Workflow project will be documented in this file.

## [Unreleased] - 2025-02-08

### In Development
- Order System (partially complete through invoicing)
- Workflow generation and fulfillment
- Payment processing integration
- Email notifications

## [1.1.0] - 2025-01-30

### Account Authentication System
- Full login/logout with HTTP-only cookies
- Password reset via email
- Account settings & profile management
- JWT auto-refresh & rate limiting
- Role-based permissions (viewer/editor/admin)

### Order System Phase 1 & 2
- Multi-client order creation working
- Bulk analysis projects auto-created on order confirmation
- Notification system for internal users
- Order interface redesign (three-column layout)
- Package-based pricing (Bronze/Silver/Gold/Custom)

### User System Migration
- Migrated to invite-only system
- Email service integration with invitations
- Separate tables for advertisers/publishers

## [1.0.5] - 2025-01-19

### V2 Article Generation
- Added V2 LLM orchestration for article generation
- Implemented ArticleEndCritic for completion detection with o4-mini
- Fixed message-reasoning pair integrity
- Increased section limit to 40
- Dynamic outline-based completion detection
- True LLM orchestration without complex tools

### Documentation Refactor
- Restructured documentation into focused guides
- Created job-specific documentation files
- Added diagnostic tools documentation
- Improved README to under 100 lines

## [1.0.4] - 2025-01-15

### Semantic Audit V2
- Implemented V2 semantic audit with auto-save
- Fixed force-save event handling
- Added debugging for auto-save issues
- Improved section formatting when merging

## [1.0.3] - 2025-01-09

### Agent Retry Logic
- Added retry pattern for agent text responses
- Fixed conversation history pollution
- Implemented agentUtils helper functions
- Applied fix to agenticSemanticAuditService.ts

## [1.0.2] - 2025-01-05

### Formatting QA
- Added formatting QA agentic feature
- Created comprehensive diagnostics system
- Implemented VARCHAR limit checking
- Added admin UI requirements
- Fixed silent failures from VARCHAR(100) truncation

## [1.0.1] - 2025-01-03

### Teams Integration
- Added Teams Workspace button to step components
- Updated ArticleDraftStepClean, ContentAuditStepClean, FinalPolishStepClean

## [1.0.0] - 2025-01-02

### 🎉 First Stable Production Release

#### Added
- **PostgreSQL Database Integration**
  - Replaced localStorage with persistent PostgreSQL storage
  - Full multi-user support with centralized data
  - Automatic database initialization on first run
  
- **Complete Workflow Management**
  - 16-step guest post workflow system
  - Full data persistence across all workflow steps
  - Workflow validation and health checking tools
  
- **Client Management System**  
  - Client creation with website and description
  - Target pages management (add/update/remove)
  - Client assignment to users
  
- **Multi-Account OpenAI Support**
  - Added GPT links for 3 different OpenAI accounts
  - Users can select links based on their login
  - Supported accounts:
    - info@onlyoutreach.com
    - ajay@pitchpanda.com  
    - ajay@linkio.com

#### Fixed
- **Workflow Creation Issues**
  - Fixed database schema mismatch (JSON storage model)
  - Resolved "column does not exist" errors
  - Implemented proper UUID generation
  
- **Step Data Persistence**
  - Fixed PUT endpoint that was returning fake success
  - All 16 workflow steps now save data correctly
  - Data persists across page refreshes
  
- **Target Pages Storage**
  - Created missing API endpoints
  - Fixed frontend trying to save to wrong location
  - Target pages now use separate database table

#### Technical Improvements
- **Diagnostic Tools**
  - Added `/database-checker` for system health monitoring
  - Created `/admin/diagnostics` for debugging
  - Implemented VARCHAR limit checker
  - Added database migration tools

- **Production Deployment**
  - Successfully deployed to Coolify
  - Environment-based configuration
  - Secure credential management

## Known Issues & Technical Debt

### High Priority
- Order confirmation flow disconnected from edit page
- Workflow generation not automated after payment
- No email notifications for status changes
- Share token system (schema exists, no UI)

### Medium Priority
- Hardcoded DR/traffic values throughout system
- Manual payment recording only
- No bulk operations support
- Limited client-facing features

### Low Priority
- Advanced analytics not implemented
- No webhook support
- API v2 (GraphQL) planned but not started

---

**Note**: Version numbers follow semantic versioning. This changelog combines all project history from initial release through current development.