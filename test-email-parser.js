// Test the email parser with your actual test data
// Run this with: OPENAI_API_KEY=your_key node test-email-parser.js

const testEmails = [
  {
    from: 'editor@premiumsite.com',
    subject: 'Re: Guest posting opportunity on premiumsite.com',
    content: `Hello,

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
  {
    from: 'justjay@thehypemagazine.com',
    subject: 'Re: Guest posting opportunity on thehypemagazine.com',
    content: `Thank you for your email regarding sponsored posts on thehypemagazine.com. We do accept sponsored content and link insertions.

Our agency rate per post is $450, discounted to $200 per post for bulk orders of 10 or more.

Agency Rate Casino/Gambling Post: $550 

Link insertions: $150

TAT: 12 - 24 Hours After Receiving the Submission 

No sex or dating-related articles or links are accepted.

The rate for our LGBT outlet www.raynbowaffair.com is $150

Best regards,
Jameelah Wilkerson
CEO & Publisher
The Hype Magazine`
  }
];

// Simple OpenAI call for testing
async function testBasicExtraction(email) {
  const emailDomain = email.from.split('@')[1] || '';
  
  const prompt = `Extract the following information from this email response:
    
Email from: ${email.from}
Subject: ${email.subject}
Content: ${email.content}

Extract:
1. Sender's name (if mentioned)
2. Company/website name
3. Website URL(s) they manage - CRITICAL: 
   - Look carefully for ANY domain mentioned in the email content
   - Check for domains in phrases like "on [domain.com]", "for [domain.com]", "[domain.com] rates"  
   - Look in email signatures for website URLs
   - If the email is about guest posting services, the domain they're offering services for is their website
   - As last resort, if no domain found in content, use the email domain "${emailDomain}" (but avoid generic email providers)
4. Contact email (if different from sender)

Return as JSON with this structure:
{
  "name": "sender name or null",
  "company": "company name or null",
  "websites": ["domain1.com", "domain2.com"],
  "email": "contact email or sender email"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('Raw AI Response:', content);
    
    const parsed = JSON.parse(content);
    return parsed;
    
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

async function runTest() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  for (const email of testEmails) {
    console.log(`\n=== Testing ${email.from} ===`);
    console.log(`Subject: ${email.subject}`);
    
    const result = await testBasicExtraction(email);
    if (result) {
      console.log('Extracted websites:', result.websites);
      console.log('Extracted company:', result.company);
      console.log('Extracted name:', result.name);
    }
    
    console.log('---');
  }
}

runTest().catch(console.error);