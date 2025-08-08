# Chatwoot Integration Setup Guide

This guide walks you through setting up Chatwoot integration with PostFlow for email sending and tracking.

## Prerequisites

- Self-hosted Chatwoot instance
- Admin access to Chatwoot
- Access to Coolify environment variables
- Working SMTP configuration in Chatwoot

## Step-by-Step Setup

### 1. Get Your API Access Token

1. Log into your Chatwoot instance
2. Click on your profile icon (bottom left corner)
3. Go to **Profile Settings**
4. Click on **Access Token** tab
5. Copy your access token (or create one if it doesn't exist)

**Example:** `xyzABC123...` (long string)

### 2. Find Your Account ID

Look at your browser URL when logged into Chatwoot:
```
https://chatwoot.yourdomain.com/app/accounts/1/dashboard
                                               ^
                                               This is your Account ID
```

Usually it's `1` for the first account.

### 3. Create or Configure Email Inbox

#### Option A: Use Existing Email Inbox
1. Go to **Settings** → **Inboxes**
2. Find an inbox with type "Email"
3. Click on it and check the URL:
   ```
   https://chatwoot.yourdomain.com/app/accounts/1/inboxes/3/settings
                                                           ^
                                                           This is your Inbox ID
   ```

#### Option B: Create New Email Inbox
1. Go to **Settings** → **Inboxes**
2. Click **Add Inbox**
3. Choose **Email** as the channel type
4. Configure your email settings:
   - **Channel Name:** PostFlow Outreach (or similar)
   - **Email:** your-email@domain.com
   - **SMTP Configuration:**
     - For Gmail: smtp.gmail.com, port 587, use app password
     - For SendGrid: smtp.sendgrid.net, port 587, API key as password
     - For other providers: check their SMTP documentation
5. Save and note the Inbox ID from the URL

### 4. Configure Environment Variables in Coolify

Add these environment variables to your PostFlow application in Coolify:

```env
CHATWOOT_API_URL=https://chatwoot.yourdomain.com
CHATWOOT_API_KEY=your-access-token-from-step-1
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=3
CHATWOOT_APP_URL=https://chatwoot.yourdomain.com
```

#### How to add in Coolify:
1. Navigate to your PostFlow application
2. Click on **Environment Variables** tab
3. Add each variable one by one
4. Click **Save**
5. Click **Redeploy** to apply changes

### 5. Test the Integration

1. Go to `/admin/chatwoot-test` in your PostFlow instance
2. Click **Test Connection** - should show your inbox details
3. Send a test email to verify everything works
4. Check both your email and Chatwoot to confirm receipt

### 6. Configure Webhooks (Optional but Recommended)

To receive real-time updates when publishers reply:

1. In Chatwoot, go to **Settings** → **Integrations** → **Webhooks**
2. Click **Add Webhook**
3. Configure:
   - **Webhook URL:** `https://your-postflow-domain.com/api/webhooks/chatwoot`
   - **Events:** Select at least:
     - Message Created
     - Message Updated
     - Conversation Status Changed
4. Save the webhook

## Troubleshooting

### "Failed to connect to Chatwoot"
- Verify your CHATWOOT_API_URL doesn't have a trailing slash
- Check if your API token is valid
- Ensure your Chatwoot instance is accessible from your PostFlow server

### "Invalid inbox configuration"
- Double-check your CHATWOOT_INBOX_ID
- Ensure the inbox is of type "Email" not "Website" or "API"
- Verify the inbox is active and not deleted

### Emails not sending
- Check SMTP configuration in your Chatwoot email inbox
- Verify sending email address is authorized in your SMTP provider
- Check Chatwoot logs for SMTP errors

### Not receiving replies
- Ensure webhook is configured correctly
- Check if replies appear in Chatwoot but not PostFlow
- Verify IMAP/POP3 settings in Chatwoot email inbox

## Integration Features

Once configured, PostFlow can:
- Send guest post emails through Chatwoot
- Track email delivery status
- Monitor publisher responses
- Create conversations for each outreach
- Link conversations to orders and workflows
- View all communication history in one place

## Next Steps

After successful setup:
1. The Email Template step in workflows will show a "Send via Chatwoot" option
2. All sent emails will be tracked in the order details
3. Publisher responses will automatically update order status
4. You can manage all conversations from Chatwoot's unified inbox