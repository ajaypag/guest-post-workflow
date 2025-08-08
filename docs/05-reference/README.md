# Reference Documentation

API references, feature specifications, and technical details.

## Contents

### API Documentation
- **[api-responses-fix.md](api-responses-fix.md)** - API response handling
- **[prompt-examples.md](prompt-examples.md)** - AI prompt examples

### Feature Specifications
- **API Documentation** - Core API endpoints and data formats (see sections below)

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/account/login
POST /api/auth/account/logout
GET  /api/auth/session
```

### Orders
```
POST /api/orders
GET  /api/orders/[id]
PUT  /api/orders/[id]
POST /api/orders/[id]/confirm
```

### Bulk Analysis
```
POST /api/bulk-analysis/projects
GET  /api/bulk-analysis/assigned-projects
POST /api/clients/[id]/bulk-analysis/ai-qualify
```

### AI Services
```
POST /api/workflows/[id]/auto-generate-v2
POST /api/workflows/[id]/semantic-audit
POST /api/workflows/[id]/final-polish
```

## Data Formats

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "userType": "internal|account",
  "role": "admin|editor|viewer",
  "exp": 1234567890
}
```

### Order Status Flow
```
draft → configuring → confirmed → site_selection → 
payment_pending → paid → workflow_generation → completed
```