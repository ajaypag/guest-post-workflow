# Airtable Webhook Setup Guide

## Overview
This document provides comprehensive instructions for setting up Airtable webhooks to automatically sync website data changes to the Guest Post Workflow database.

## System Architecture

### Data Flow
1. Airtable record is created/updated/deleted
2. Airtable sends webhook to your application
3. Application verifies webhook authenticity
4. Application fetches full record data from Airtable API
5. Data is synced to PostgreSQL database

### Key Components
- **Webhook Endpoint**: `https://postflow.outreachlabs.net/api/airtable/webhook`
- **Website Table ID**: `tblT8P0fPHV5fdrT5`
- **Airtable Base ID**: Set in environment variable `AIRTABLE_BASE_ID`

## Prerequisites

### 1. Environment Variables
Add these to your production environment:

```env
# Required
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_WEBHOOK_SECRET=generate-a-secure-random-string

# Your application URL
NEXTAUTH_URL=https://postflow.outreachlabs.net
```

### 2. Database Tables
Ensure these tables exist (already created by migration `0013_add_airtable_sync_tables.sql`):
- `websites` - Stores website data
- `website_contacts` - Stores contact information
- `airtable_webhook_events` - Logs webhook events
- `website_sync_logs` - Tracks sync history

## Airtable Field Mappings

### Website Table Fields
The following Airtable fields are synced to the local database:

| Airtable Field | Database Column | Type | Notes |
|----------------|-----------------|------|-------|
| `Website` | `domain` | VARCHAR(255) | URL is parsed to extract domain |
| `Domain Rating` | `domain_rating` | INTEGER | Ahrefs DR metric |
| `Total Traffic` | `total_traffic` | INTEGER | Monthly traffic estimate |
| `Guest Post Cost V2` | `guest_post_cost` | DECIMAL(10,2) | Cost in USD |
| `Category` | `categories` | TEXT[] | Array of categories |
| `Type` | `type` | TEXT[] | Array of types |
| `Status` | `status` | VARCHAR(50) | Active, Inactive, etc. |
| `Guest Post Access?` | `has_guest_post` | BOOLEAN | "Yes" = true |
| `Link Insert Access?` | `has_link_insert` | BOOLEAN | "Yes" = true |
| `Count of Published Opportunities` | `published_opportunities` | INTEGER | |
| `Overall Website Quality` | `overall_quality` | VARCHAR(255) | |

### PostFlow Lookup Fields (for Contacts)
These fields pull contact data from the Link Price table:

| Airtable Field | Purpose |
|----------------|---------|
| `PostFlow Contact Emails` | Contact email addresses |
| `PostFlow Guest Post Prices` | Guest post pricing |
| `PostFlow Blogger Requirements` | Paid/Swap requirement |
| `PostFlow Contact Status` | Active/Inactive status |

## Step-by-Step Webhook Setup

### Step 1: Generate Webhook Secret
Create a secure random string for webhook authentication:

```bash
# Linux/Mac
openssl rand -hex 32

# Or use any password generator to create a 32+ character string
```

### Step 2: Configure Airtable Automation

1. **Open your Airtable base**
2. **Click "Automations" in the top menu**
3. **Click "Create automation"**
4. **Name your automation**: "Sync Website Changes to App"

### Step 3: Configure Trigger

1. **Choose trigger type**: "When record matches conditions"
2. **Select table**: Website (or your website table name)
3. **Set conditions**:
   - When record enters a view: "All records" OR
   - When record is created OR
   - When record is updated
4. **Test the trigger** with a sample record

### Step 4: Add Webhook Action

1. **Add action**: "Run a script"
2. **Paste this script**:

```javascript
// Webhook configuration
const WEBHOOK_URL = 'https://postflow.outreachlabs.net/api/airtable/webhook';
const WEBHOOK_SECRET = 'your-webhook-secret-from-step-1';

// Get trigger data
const recordId = input.config().recordId;
const tableId = base.getTable(cursor.activeTableId).id;

// Determine event type
let eventType = 'table.record.updated'; // Default
if (input.config().triggerType === 'recordCreated') {
    eventType = 'table.record.created';
} else if (input.config().triggerType === 'recordDeleted') {
    eventType = 'table.record.deleted';
}

// Prepare webhook payload
const payload = {
    type: eventType,
    webhook: {
        id: 'airtable-automation-' + Date.now()
    },
    base: {
        table: {
            id: tableId
        }
    },
    record: {
        id: recordId
    },
    tableId: tableId,
    recordId: recordId,
    timestamp: new Date().toISOString()
};

// Send webhook
try {
    const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WEBHOOK_SECRET}`
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Webhook sent successfully');
    output.set('success', true);
} catch (error) {
    console.error('Webhook error:', error);
    output.set('success', false);
    output.set('error', error.message);
}
```

3. **Configure input variables**:
   - Add input variable: `recordId` (from trigger step)

### Step 5: Create Additional Automations

Repeat Steps 3-4 for each event type:

1. **"When record is created"** automation
2. **"When record is updated"** automation  
3. **"When record is deleted"** automation

### Step 6: Test the Integration

1. **Check webhook health**: 
   ```
   GET https://postflow.outreachlabs.net/api/airtable/webhook
   ```

2. **Create a test record** in Airtable
3. **Check your database** for the synced record
4. **View webhook logs** in `airtable_webhook_events` table

## Webhook Security

### Authentication
- Webhooks are authenticated using Bearer token in Authorization header
- Token must match `AIRTABLE_WEBHOOK_SECRET` environment variable
- Unauthorized requests return 401 status

### Rate Limiting
- Airtable API: 5 requests per second
- Webhook processing includes 250ms delay between batch operations
- Failed webhooks are logged but don't block the response

## Monitoring & Troubleshooting

### Health Check Endpoint
```bash
curl https://postflow.outreachlabs.net/api/airtable/webhook
```

Returns:
```json
{
  "status": "ok",
  "stats": {
    "total": 150,
    "processed": 148,
    "errors": 2,
    "last_received": "2025-01-28T10:30:00Z"
  },
  "webhookUrl": "https://postflow.outreachlabs.net/api/airtable/webhook"
}
```

### Common Issues

1. **401 Unauthorized**
   - Check `AIRTABLE_WEBHOOK_SECRET` matches automation script
   - Ensure Authorization header format: `Bearer YOUR_SECRET`

2. **Record not syncing**
   - Check `airtable_webhook_events` table for errors
   - Verify `AIRTABLE_API_KEY` is valid
   - Ensure table ID matches: `tblT8P0fPHV5fdrT5`

3. **Missing contact data**
   - Verify PostFlow lookup fields are configured in Airtable
   - Check that Link Price records have email addresses (not just record IDs)

### Database Queries for Debugging

```sql
-- Check recent webhook events
SELECT * FROM airtable_webhook_events 
ORDER BY received_at DESC 
LIMIT 10;

-- Check sync logs
SELECT * FROM website_sync_logs 
ORDER BY started_at DESC 
LIMIT 10;

-- Find websites by domain
SELECT * FROM websites 
WHERE domain LIKE '%example.com%';

-- Check website contacts
SELECT w.domain, wc.* 
FROM website_contacts wc
JOIN websites w ON w.id = wc.website_id
WHERE w.domain = 'example.com';
```

## Manual Sync Option

If webhooks fail, you can manually sync:

1. **Navigate to**: `/admin/airtable-sync`
2. **Click**: "Run Full Sync"
3. **Monitor progress** in the UI

## Contact Data Requirements

For contact syncing to work properly, ensure your Airtable setup includes:

1. **Link Price table** with actual email addresses (not record IDs)
2. **PostFlow lookup fields** in Website table:
   - PostFlow Contact Emails
   - PostFlow Guest Post Prices
   - PostFlow Blogger Requirements
   - PostFlow Contact Status

## Support

If you encounter issues:

1. Check webhook events table for error messages
2. Verify all environment variables are set
3. Test the health check endpoint
4. Review Airtable automation run history

## Next Steps

After setting up webhooks:

1. **Test with real data changes** in Airtable
2. **Monitor the first 24 hours** for any sync issues
3. **Set up alerts** for failed webhook events
4. **Document any custom field mappings** specific to your setup