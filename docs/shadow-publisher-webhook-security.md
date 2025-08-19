# Shadow Publisher Webhook Security Setup

## Overview
The ManyReach webhook endpoint is now secured with a secret URL path to prevent unauthorized access and fake webhook calls.

## Required Environment Variables

Add these to your `.env` file:

```env
# Required: OpenAI API Key for email parsing
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: Secret token for webhook URL security
MANYREACH_WEBHOOK_URL_SECRET=3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668

# Optional: Traditional webhook signature validation (if ManyReach supports it)
MANYREACH_WEBHOOK_SECRET=your-webhook-secret-here

# Optional: Bypass IP validation in development/testing
MANYREACH_BYPASS_IP_CHECK=false
```

## Webhook URL Configuration

### Development
```
http://localhost:3000/api/webhooks/manyreach/3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668
```

### Production
```
https://your-domain.com/api/webhooks/manyreach/3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668
```

## Security Features

### ✅ Implemented Security Measures:
1. **Secret URL Path** - 64-character random token in URL prevents discovery
2. **IP Allowlisting** - Only accepts requests from known ManyReach IP ranges
3. **Timestamp Validation** - Rejects requests older than 5 minutes
4. **Rate Limiting** - Prevents spam/abuse
5. **Request Logging** - All webhook attempts logged for audit
6. **Payload Validation** - Ensures request structure matches expected format

### ⚠️ Security Warnings:
- **Never commit the secret to git** - Use environment variables only
- **Generate new secret if compromised** - Use `openssl rand -hex 32`
- **Monitor webhook logs** - Check `/admin/shadow-publishers` for suspicious activity
- **Use HTTPS in production** - Protects secret in transit

## ManyReach Configuration Steps

1. **Log into ManyReach Dashboard**
2. **Navigate to Settings → Webhooks**
3. **Set Webhook URL** to your production URL with secret:
   ```
   https://your-domain.com/api/webhooks/manyreach/3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668
   ```
4. **Enable Events**: `prospect_replied`, `email_received`
5. **Test the webhook** using their test feature

## Testing

### Test Page
Use `/admin/test-shadow-publisher` to test email processing:
- Select pre-built test emails
- Write custom test emails
- View parsing results and confidence scores

### Health Check
Check webhook status:
```bash
curl https://your-domain.com/api/webhooks/manyreach/YOUR-SECRET/
```

Should return:
```json
{
  "status": "active",
  "message": "ManyReach webhook endpoint is ready",
  "security": "URL secret validated"
}
```

## Monitoring

### Security Logs
All webhook attempts are logged in `webhook_security_logs` table with:
- IP address and user agent
- Secret validation results
- Timestamp validation
- Allow/deny decisions

### Email Processing
Monitor processed emails at `/admin/shadow-publishers`:
- View confidence scores
- Check parsing results
- Review created publishers

## Troubleshooting

### Common Issues:

**"Invalid webhook URL" (401 Error)**
- Secret in URL doesn't match `MANYREACH_WEBHOOK_URL_SECRET`
- Check environment variable is set correctly

**"Webhook validation failed" (403 Error)**
- IP address not in allowed ranges
- Timestamp too old (>5 minutes)
- Invalid signature (if using traditional validation)

**"Invalid payload structure" (400 Error)**
- Request body doesn't match expected ManyReach format
- Missing required fields (email.from, email.content)

### Regenerating Secret:
```bash
# Generate new secret
openssl rand -hex 32

# Update environment variable
MANYREACH_WEBHOOK_URL_SECRET=new-secret-here

# Update ManyReach webhook URL with new secret
```

## Production Checklist

- [ ] Set `MANYREACH_WEBHOOK_URL_SECRET` in production environment
- [ ] Set `MANYREACH_BYPASS_IP_CHECK=false` (or remove entirely)  
- [ ] Configure ManyReach with production webhook URL + secret
- [ ] Test webhook with ManyReach's test feature
- [ ] Monitor initial webhook calls for errors
- [ ] Verify shadow publishers are being created properly

## Support

For issues:
1. Check webhook security logs in database
2. Test with `/admin/test-shadow-publisher`
3. Verify environment variables are set
4. Check ManyReach webhook configuration