import React from 'react';

interface PublisherInvitationEmailProps {
  publisherName: string;
  companyName: string;
  email: string;
  websites: Array<{
    domain: string;
    currentRate?: number;
    estimatedTurnaround?: number;
  }>;
  claimUrl: string;
  totalWebsites: number;
  estimatedMonthlyValue?: number;
}

export default function PublisherInvitationEmailV2({
  publisherName,
  companyName,
  email,
  websites,
  claimUrl,
  totalWebsites,
  estimatedMonthlyValue
}: PublisherInvitationEmailProps) {
  // Show up to 3 websites, then indicate if there are more
  const displayWebsites = websites.slice(0, 3);
  const hasMoreWebsites = websites.length > 3;
  
  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .intro-box {
            background: #f3f4f6;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .website-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
          }
          .website-domain {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .website-details {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
          }
          .detail-item {
            flex: 1;
          }
          .detail-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .detail-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 500;
            margin-top: 4px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 30px 0;
          }
          .benefits-list {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          .benefits-list h3 {
            color: #92400e;
            margin-top: 0;
            font-size: 16px;
          }
          .benefits-list ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .benefits-list li {
            color: #78350f;
            margin: 8px 0;
          }
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
          }
          .update-notice {
            background: #dbeafe;
            border: 1px solid #60a5fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .update-notice p {
            margin: 5px 0;
            color: #1e40af;
            font-size: 14px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>You're Invited to Join Linkio Publishers</h1>
          </div>
          
          <div className="content">
            <p style={{ fontSize: '18px', marginTop: 0 }}>
              Hi {publisherName || 'there'},
            </p>
            
            <div className="intro-box">
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Why are you receiving this email?</strong>
              </p>
              <p style={{ margin: '10px 0' }}>
                We're Linkio, a link building agency that helps businesses improve their SEO through high-quality guest posts. 
                Over the past few months, we've reached out to various publishers about guest posting opportunities, and 
                you responded to one of our outreach emails with pricing and availability for your website(s).
              </p>
              <p style={{ margin: '10px 0 0 0' }}>
                We're now streamlining how we work with publishers like you through our new Publisher Portal, 
                which will make it easier for you to receive and manage guest post orders from us.
              </p>
            </div>

            <h2 style={{ fontSize: '20px', marginTop: '30px', marginBottom: '20px' }}>
              Here's What We Have On File For You:
            </h2>
            
            {displayWebsites.map((website, index) => (
              <div key={index} className="website-card">
                <div className="website-domain">{website.domain}</div>
                <div className="website-details">
                  <div className="detail-item">
                    <div className="detail-label">Guest Post Rate</div>
                    <div className="detail-value">
                      {website.currentRate ? `$${website.currentRate}` : 'To be confirmed'}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Turnaround Time</div>
                    <div className="detail-value">
                      {website.estimatedTurnaround ? `${website.estimatedTurnaround} days` : 'To be confirmed'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMoreWebsites && (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', margin: '10px 0' }}>
                + {websites.length - 3} more website{websites.length - 3 > 1 ? 's' : ''} on file
              </p>
            )}
            
            <div className="update-notice">
              <p>
                <strong>Is this information still accurate?</strong>
              </p>
              <p>
                You can update your rates, turnaround times, and website details anytime in your publisher dashboard.
              </p>
            </div>

            <div className="benefits-list">
              <h3>🎯 What's In It For You?</h3>
              <ul>
                <li><strong>Regular Orders:</strong> Get consistent guest post requests from our clients</li>
                <li><strong>Quick Payment:</strong> Fast, reliable payments for completed posts</li>
                <li><strong>No More Email Back-and-Forth:</strong> Manage everything in one dashboard</li>
                <li><strong>Set Your Own Terms:</strong> Control your pricing, turnaround times, and availability</li>
              </ul>
            </div>

            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                <strong>Ready to start receiving orders?</strong><br />
                Your account is already set up - just confirm your details:
              </p>
              <a href={claimUrl} className="cta-button">
                Activate Your Publisher Account →
              </a>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '15px' }}>
                Takes less than 2 minutes
              </p>
            </div>

            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', marginTop: '40px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                <strong>Questions?</strong> Simply reply to this email and we'll help you get set up.
              </p>
            </div>
          </div>
          
          <div className="footer">
            <p>
              <strong>Linkio</strong> - Publisher Network Management Platform
            </p>
            <p>
              © 2025 Linkio. All rights reserved.
            </p>
            <p style={{ fontSize: '12px', marginTop: '15px' }}>
              You're receiving this because you previously expressed interest in accepting guest posts.
              If this was sent in error, please ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

export function PublisherInvitationEmailV2PlainText({
  publisherName,
  companyName,
  email,
  websites,
  claimUrl,
  totalWebsites,
  estimatedMonthlyValue
}: PublisherInvitationEmailProps) {
  const displayWebsites = websites.slice(0, 3);
  const hasMoreWebsites = websites.length > 3;
  
  return `
You're Invited to Join Linkio Publishers

Hi ${publisherName || 'there'},

=== Why are you receiving this email? ===

We're Linkio, a link building agency that helps businesses improve their SEO through high-quality guest posts. Over the past few months, we've reached out to various publishers about guest posting opportunities, and you responded to one of our outreach emails with pricing and availability for your website(s).

We're now streamlining how we work with publishers like you through our new Publisher Portal, which will make it easier for you to receive and manage guest post orders from us.

=== Here's What We Have On File For You ===

${displayWebsites.map(website => `
• ${website.domain}
  - Guest Post Rate: ${website.currentRate ? `$${website.currentRate}` : 'To be confirmed'}
  - Turnaround Time: ${website.estimatedTurnaround ? `${website.estimatedTurnaround} days` : 'To be confirmed'}
`).join('')}
${hasMoreWebsites ? `\n+ ${websites.length - 3} more website${websites.length - 3 > 1 ? 's' : ''} on file\n` : ''}

Is this information still accurate?
You can update your rates, turnaround times, and website details anytime in your publisher dashboard.

=== What's In It For You? ===

✓ Regular Orders: Get consistent guest post requests from our clients
✓ Quick Payment: Fast, reliable payments for completed posts  
✓ No More Email Back-and-Forth: Manage everything in one dashboard
✓ Set Your Own Terms: Control your pricing, turnaround times, and availability

=== Ready to start receiving orders? ===

Your account is already set up - just confirm your details:

${claimUrl}

(Takes less than 2 minutes)

---

Questions? Simply reply to this email and we'll help you get set up.

Linkio - Publisher Network Management Platform
© 2025 Linkio. All rights reserved.

You're receiving this because you previously expressed interest in accepting guest posts.
If this was sent in error, please ignore this email.
`.trim();
}