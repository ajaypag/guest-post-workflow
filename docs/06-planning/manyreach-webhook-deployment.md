# ManyReach Webhook Deployment Guide

## Production Environment Variables

Add these to your production environment (Coolify/deployment platform):

```env
# ManyReach Integration (REQUIRED)
MANYREACH_WEBHOOK_URL_SECRET=your-webhook-secret-here
MANYREACH_API_KEY=your-manyreach-api-key-here
MANYREACH_BYPASS_IP_CHECK=true  # Set to false in production after configuring IP allowlist

# OpenAI for email parsing (REQUIRED)
OPENAI_API_KEY=your-production-openai-api-key
```

## Webhook URL Configuration

Configure this URL in ManyReach:
```
https://your-production-domain.com/api/webhooks/manyreach/YOUR_WEBHOOK_SECRET_HERE
```

## Database Requirements

The following tables must exist (created automatically via migrations):
- `email_processing_logs` - Stores all incoming email responses
- `webhook_security_logs` - Tracks webhook security validation
- Additional shadow publisher tables (see migration 0056)

## Testing the Webhook

1. **Health Check:**
```bash
curl https://your-domain.com/api/webhooks/manyreach/YOUR_WEBHOOK_SECRET_HERE
```

2. **Test Payload:**
```bash
curl -X POST https://your-domain.com/api/webhooks/manyreach/YOUR_WEBHOOK_SECRET_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "prospect_replied",
    "campaignid": "test-001",
    "message": "Yes, we accept guest posts for $300",
    "prospect": {
      "email": "test@example.com",
      "firstname": "Test",
      "lastname": "User",
      "company": "Test Company"
    }
  }'
```

## Monitoring

Check webhook logs at:
- `/admin/email-processing-logs` - View all processed emails
- `/admin/webhook-security` - Security audit trail

## Security Notes

1. The URL secret (`3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668`) is embedded in the URL path
2. ManyReach doesn't support HMAC signatures yet, so URL secret is primary security
3. In production, consider adding IP allowlisting once you know ManyReach's IP ranges

## Response Format

Successful webhook returns:
```json
{
  "success": true,
  "emailLogId": "uuid",
  "publisherId": "uuid or null",
  "parsedData": {
    "confidence": 0.85,
    "offerings": 1,
    "websiteDetected": "example.com"
  }
}
```

## Common Issues

1. **Database connection errors**: Ensure `DATABASE_URL` is correctly configured
2. **AI parsing failures**: Check `OPENAI_API_KEY` is valid
3. **Timeout errors**: Email parsing can take 30-120 seconds due to AI processing