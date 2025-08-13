# Email Service Documentation

**Status**: ✅ Production Ready | **Provider**: Resend API | **Last Updated**: 2025-01-29

## Overview

Complete email service implementation with Resend API integration, React Email templates, comprehensive logging, and admin management interface.

## Core Components

### EmailService (`lib/services/emailService.ts`)
Main orchestration service handling:
- Single email sending with templates
- Bulk email processing (rate-limited)
- Automatic logging to database
- Error handling and retry logic
- Statistics and monitoring

### Email Templates (`lib/email/templates/`)
React Email components for consistent styling:
- `BaseEmail.tsx` - Common layout and styling
- `WelcomeEmail.tsx` - User onboarding
- `WorkflowCompletedEmail.tsx` - Workflow notifications
- `ContactOutreachEmail.tsx` - Contact communications
- `InvitationEmail.tsx` - User invitations
- `index.ts` - Template exports

### Database Logging (`email_logs` table)
Complete audit trail with:
- Email type and status tracking
- Recipient and subject logging
- Resend API response IDs
- Error message capture
- Metadata storage (attachments, CC/BCC)

### Admin Interface (`/admin/email`)
Management dashboard with:
- Email logs with filtering
- Send statistics and analytics
- Test email functionality
- System health monitoring

## Email Types

```typescript
type EmailType = 
  | 'welcome'           // User onboarding
  | 'password-reset'    // Auth recovery
  | 'workflow-completed'// System notifications
  | 'workflow-update'   // Status updates
  | 'contact-outreach'  // Contact communications
  | 'guest-post-request'// Guest post workflows
  | 'invitation'        // User invitations
  | 'notification';     // General notifications
```

## Usage Patterns

### Single Email with Template
```typescript
import { EmailService } from '@/lib/services/emailService';
import { InvitationEmail } from '@/lib/email/templates';

const result = await EmailService.sendWithTemplate(
  'invitation',
  'user@example.com',
  {
    subject: 'You\'re invited to join Linkio',
    template: InvitationEmail({
      inviteeEmail: 'user@example.com',
      userType: 'internal',
      role: 'user',
      invitationUrl: 'https://app.com/accept-invitation?token=abc123',
      expiresAt: '2025-02-05T12:00:00.000Z',
      invitedBy: 'Admin User',
    }),
  }
);

if (result.success) {
  console.log('Email sent with ID:', result.id);
} else {
  console.error('Email failed:', result.error);
}
```

### Bulk Email Processing
```typescript
const recipients = [
  { to: 'user1@example.com', data: { name: 'User 1' } },
  { to: 'user2@example.com', data: { name: 'User 2' } },
];

const results = await EmailService.sendBulk(
  'notification',
  recipients,
  (data) => ({
    subject: `Hello ${data.name}`,
    template: NotificationEmail(data),
  })
);

console.log(`Sent: ${results.sent}, Failed: ${results.failed}`);
```

### Direct Email Sending
```typescript
const result = await EmailService.send('welcome', {
  to: 'user@example.com',
  subject: 'Welcome to PostFlow',
  html: '<h1>Welcome!</h1><p>Thanks for joining us.</p>',
  text: 'Welcome! Thanks for joining us.',
});
```

## Key Features

### Automatic Logging
- All email attempts logged to `email_logs` table
- Status tracking: `sent`, `failed`, `queued`
- Resend API response IDs captured
- Detailed error messages stored
- Metadata includes CC, BCC, attachments

### Error Handling
- Graceful failure with detailed error messages
- Logging continues even if email fails
- API key validation with helpful errors
- Rate limiting and retry logic

### Bulk Processing
- Rate-limited batches (10 emails/second, 1 second delay)
- Parallel processing within batches
- Individual result tracking
- Progress monitoring

### Template System
- React Email for consistent styling
- Type-safe template props
- Responsive design patterns
- Professional styling with gradients

### Admin Tools
- Send test emails for any type
- View email logs with filtering
- Statistics dashboard
- System health monitoring

## Invitation System Integration

### Files Modified
- `app/api/admin/invitations/route.ts` - Create invitation with email
- `app/api/admin/invitations/[id]/resend/route.ts` - Resend with new token

### Email Flow
1. **Create Invitation**: 
   - Generate secure token
   - Save to database 
   - Send email via `EmailService.sendWithTemplate`
   - Return status including email success

2. **Resend Invitation**:
   - Generate new token and expiration
   - Update database record
   - Send new email with updated details
   - Return status including email success

3. **Email Content**:
   - Professional template with company branding
   - Clear invitation details (email, role, user type)
   - Prominent call-to-action button
   - Alternative text link for accessibility
   - Expiration date and next steps

### Error Handling
- Email failure doesn't prevent invitation creation
- Clear success/failure messaging to admin
- Console logging for debugging
- Database logging for audit trail

## Configuration

### Environment Variables
```env
RESEND_API_KEY=re_your_api_key_here        # Required: Resend API key
EMAIL_FROM=info@linkio.com                 # Optional: Custom from address
EMAIL_FROM_NAME=Linkio                     # Optional: From name
EMAIL_REPLY_TO=info@linkio.com            # Optional: Reply-to address
```

### Current Setup (Production)
- **From Address**: `noreply@postflow.outreachlabs.net` (verified domain)
- **Reply To**: `info@linkio.com`
- **Status**: ✅ Production ready with custom domain
- **Limitation**: None - full email functionality available

### Environment Variables (Optional Override)
Set these to customize email addresses:
```env
EMAIL_FROM=info@linkio.com                   # Default from address
EMAIL_FROM_NAME=Linkio                       # From name
EMAIL_REPLY_TO=info@linkio.com              # Reply-to address
```

## Database Schema

### email_logs Table
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,           -- EmailType enum
  recipients TEXT[] NOT NULL,          -- Array of recipient emails
  subject TEXT NOT NULL,               -- Email subject line
  status VARCHAR(20) NOT NULL,         -- 'sent', 'failed', 'queued'
  sent_at TIMESTAMP,                   -- When successfully sent
  error TEXT,                          -- Error message if failed
  resend_id VARCHAR(255),              -- Resend API response ID
  metadata JSONB,                      -- Additional data (CC, BCC, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Monitoring and Debugging

### Admin Dashboard (`/admin/email`)
- **Email Logs**: Filter by type, status, recipient, date
- **Statistics**: Daily/monthly send rates, failure analysis
- **Test Interface**: Send test emails for any type
- **Real-time Status**: Current system health

### API Endpoints
- `GET /api/email/logs` - Retrieve email logs with filtering
- `GET /api/email/stats` - Email statistics and analytics
- `POST /api/email/send` - Send single email
- `POST /api/email/bulk` - Send bulk emails
- `GET /api/email/test-config` - Test Resend configuration

### Health Checks
```bash
# Test Resend configuration
curl /api/email/test-config

# View recent email logs
curl "/api/email/logs?limit=10"

# Check email statistics
curl "/api/email/stats"
```

### Common Issues

**Email Not Sending**
1. Verify `RESEND_API_KEY` is set correctly
2. Check `/api/email/test-config` endpoint
3. Review error logs in `/admin/email`
4. Confirm recipient email format

**Template Errors**
1. Ensure all templates exported in `index.ts`
2. Check React Email component syntax
3. Verify template props match interface
4. Test with simple HTML first

**Rate Limiting**
1. Bulk sends automatically rate-limited
2. Resend free tier: 100 emails/day
3. Monitor usage in admin dashboard
4. Consider upgrading plan for production

## Development Notes

### Adding New Email Types
1. Add type to `EmailType` union in `emailService.ts`
2. Create template component in `templates/`
3. Export template in `templates/index.ts`
4. Add to admin UI filters if needed
5. Update this documentation

### Template Development
- Use React Email components for consistency
- Follow `BaseEmail` pattern for common styling
- Include preview text for email clients
- Test across email clients (Gmail, Outlook, etc.)
- Keep styling inline for compatibility

### Testing Strategy
- Use admin test interface for quick validation
- Test with real email addresses
- Verify template rendering across clients
- Check logs for delivery status
- Monitor bounce rates and complaints

## Security Considerations

- API keys stored in environment variables only
- No sensitive data in email logs (metadata sanitized)
- Rate limiting prevents abuse
- Email content sanitized before sending
- Audit trail for compliance requirements

---

**Last Updated**: 2025-01-29  
**Next Review**: After domain verification completion