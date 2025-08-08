# Database Architecture

## Why This Guide
Understanding the database schema and service architecture for workflow management.

## When to Use
- Adding new features
- Debugging data persistence issues  
- Understanding data flow

## Database Schema

```sql
-- Main tables
users (id, email, name, password_hash, role)
clients (id, name, website, description, created_by)
workflows (id, user_id, client_id, title, status, content, target_pages)
target_pages (id, client_id, url, domain, status)
workflow_steps (id, workflow_id, step_number, title, status, inputs, outputs)
```

### Key Design Decisions
- **Workflows**: Use JSON storage in `content` field for flexibility
- **Target Pages**: Stored separately from clients in dedicated table
- **Workflow Steps**: Data stored within workflow JSON content, not separate rows

## Key Services

| Service | Purpose | Location |
|---------|---------|----------|
| Workflow Service | CRUD operations with JSON storage | `/lib/db/workflowService.ts` |
| Client Service | Client and target pages management | `/lib/db/clientService.ts` |
| Storage Layer | Frontend API communication | `/lib/storage.ts` |

## API Endpoints

### Workflows
- `GET/POST /api/workflows` - List and create workflows
- `GET/PUT/DELETE /api/workflows/[id]` - Individual workflow operations

### Clients  
- `GET/POST/PUT/DELETE /api/clients/[id]/target-pages` - Target pages management

### System Health
- `/api/database-checker` - Full system diagnostics
- `/api/check-table-structure` - Schema verification

## Connection Requirements

### PostgreSQL on Coolify
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=disable
```

**Critical**: 
- Must use internal URL format
- SSL must be disabled (`sslmode=disable`)
- Database auto-initializes on first run

## Outcome
Clear understanding of data structure and service boundaries for maintaining data integrity.