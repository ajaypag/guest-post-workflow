// Test ManyReach webhook locally
const fetch = require('node-fetch');

const testPayload = {
  "eventId": "prospect_replied",
  "campaignId": "local-test-" + Date.now(),
  "campaignName": "Local Test - Shadow Publisher System",
  "campaignType": "outreach",
  "email": {
    "from": "editor@premiumsite.com",
    "to": "outreach@linkio.com",
    "subject": "Re: Guest posting opportunity on premiumsite.com",
    "messageId": "local-test-" + Date.now() + "@test.com",
    "receivedAt": new Date().toISOString(),
    "content": `Hello,

Thank you for reaching out. Here are our rates:

Standard Guest Post: $500
Finance/Crypto content: $750 (+50% surcharge)
Casino/Gambling: $800 
CBD/Cannabis: $650

We do NOT accept:
- Adult/Dating content
- Essay writing services
- Illegal content
- Payday loans

All posts include 2 dofollow links. Additional links are $75 each.

Bulk discount: 5+ posts get 15% off
Payment terms: 50% upfront, 50% on publication

Turnaround: 3-5 business days

Regards,
Sarah
Editor-in-Chief`
  },
  "metadata": {
    "prospectName": "Premium Site Publisher",
    "prospectCompany": "Premium Site",
    "originalWebsite": "premiumsite.com",
    "threadId": "local-test-thread-" + Date.now()
  }
};

async function testWebhook() {
  const webhookSecret = '3887a69b42ecb8761207150640db1b96d61edd6832bca7ae27f57725c2e84668';
  const url = `http://localhost:3002/api/webhooks/manyreach/${webhookSecret}`;
  
  console.log('Testing webhook at:', url);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testWebhook();