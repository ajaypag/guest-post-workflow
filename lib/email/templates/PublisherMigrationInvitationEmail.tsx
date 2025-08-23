import React from 'react';

interface PublisherMigrationInvitationEmailProps {
  publisherName: string;
  companyName: string;
  websites: Array<{
    domain: string;
    currentRate?: number;
    estimatedTurnaround?: number;
  }>;
  claimUrl: string;
  totalWebsites: number;
  estimatedMonthlyValue?: number;
}

export function PublisherMigrationInvitationEmail({
  publisherName,
  companyName,
  websites,
  claimUrl,
  totalWebsites,
  estimatedMonthlyValue
}: PublisherMigrationInvitationEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Claim Your Publisher Account - Linkio Marketplace</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: #1a202c;
          }
          .highlight-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .benefit-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
          }
          .benefit-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
            padding-left: 24px;
          }
          .benefit-list li:before {
            content: '✓';
            color: #48bb78;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          .benefit-list li:last-child {
            border-bottom: none;
          }
          .websites-preview {
            background: #f8fafc;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
          }
          .website-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .website-item:last-child {
            border-bottom: none;
          }
          .website-domain {
            font-weight: 500;
            color: #2d3748;
          }
          .website-rate {
            color: #48bb78;
            font-weight: 600;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .stats-row {
            display: flex;
            justify-content: space-around;
            margin: 24px 0;
            text-align: center;
          }
          .stat-item {
            flex: 1;
          }
          .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
            display: block;
          }
          .stat-label {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .urgency-note {
            background: #fff5f5;
            border-left: 4px solid #fed7d7;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
          }
          .footer {
            background: #f7fafc;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 4px 0;
            font-size: 14px;
            color: #718096;
          }
          .small-text {
            font-size: 12px;
            color: #a0aec0;
            line-height: 1.4;
          }
          @media (max-width: 600px) {
            .container {
              margin: 0;
              border-radius: 0;
            }
            .stats-row {
              flex-direction: column;
              gap: 16px;
            }
            .website-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1>Welcome to Linkio Marketplace</h1>
            <p>Your publisher account is ready to claim</p>
          </div>

          {/* Main Content */}
          <div className="content">
            <div className="greeting">
              Hello {publisherName},
            </div>

            <p>
              You've previously worked with us (or Outreach Labs) on guest posting opportunities. 
              We're excited to introduce <strong>Linkio Marketplace</strong> - our new streamlined 
              platform that makes managing guest post orders easier than ever.
            </p>

            {/* Value Proposition */}
            <div className="highlight-box">
              <h3 style={{ margin: '0 0 16px 0', color: '#2d3748' }}>
                Why Join Linkio Marketplace?
              </h3>
              <ul className="benefit-list">
                <li>Automated order management and tracking</li>
                <li>Faster payments with transparent pricing</li>
                <li>Reduced back-and-forth communication</li>
                <li>Real-time performance metrics</li>
                <li>Priority access to high-value orders</li>
                <li>Professional publisher dashboard</li>
              </ul>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-number">{totalWebsites}</span>
                <span className="stat-label">Your Websites</span>
              </div>
              {estimatedMonthlyValue && (
                <div className="stat-item">
                  <span className="stat-number">${estimatedMonthlyValue.toLocaleString()}</span>
                  <span className="stat-label">Est. Monthly Value</span>
                </div>
              )}
              <div className="stat-item">
                <span className="stat-number">&lt; 5min</span>
                <span className="stat-label">Setup Time</span>
              </div>
            </div>

            {/* Website Preview */}
            <h3 style={{ color: '#2d3748', marginBottom: '12px' }}>
              We've created a profile for {companyName}:
            </h3>
            
            <div className="websites-preview">
              {websites.slice(0, 3).map((website, index) => (
                <div key={index} className="website-item">
                  <span className="website-domain">{website.domain}</span>
                  {website.currentRate && (
                    <span className="website-rate">${website.currentRate}</span>
                  )}
                </div>
              ))}
              {totalWebsites > 3 && (
                <div className="website-item">
                  <span style={{ color: '#718096', fontStyle: 'italic' }}>
                    ... and {totalWebsites - 3} more websites
                  </span>
                </div>
              )}
            </div>

            {/* CTA Section */}
            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <p style={{ fontSize: '18px', marginBottom: '24px', color: '#2d3748' }}>
                <strong>Claim your account to:</strong>
              </p>
              
              <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                <li>✓ Verify your current rates and terms</li>
                <li>✓ Update service offerings and availability</li>
                <li>✓ Set payment preferences</li>
                <li>✓ Start receiving orders immediately</li>
              </ul>

              <a href={claimUrl} className="cta-button">
                Claim Your Publisher Account
              </a>
              
              <p className="small-text">
                This secure link expires in 30 days and can only be used once.
              </p>
            </div>

            {/* Urgency/FOMO */}
            <div className="urgency-note">
              <p style={{ margin: '0', fontWeight: '500' }}>
                <strong>Don't miss out!</strong> Publishers who join in the first 30 days get:
              </p>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Featured placement in search results</li>
                <li>Priority for high-value orders</li>
                <li>Dedicated onboarding support</li>
              </ul>
            </div>

            {/* Social Proof */}
            <div style={{ 
              background: '#f0fff4', 
              border: '1px solid #9ae6b4', 
              borderRadius: '8px', 
              padding: '16px', 
              margin: '20px 0',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0', color: '#2d3748' }}>
                <em>"The new marketplace has streamlined our entire workflow. 
                We're processing 40% more orders with half the admin time."</em>
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#68d391' }}>
                — Sarah M., Digital Content Pro
              </p>
            </div>

            {/* Support Info */}
            <p style={{ marginTop: '32px', fontSize: '14px', color: '#718096' }}>
              Questions? Reply to this email or contact our team at 
              <a href="mailto:publishers@linkio.com" style={{ color: '#667eea' }}>
                publishers@linkio.com
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="footer">
            <p><strong>Linkio</strong></p>
            <p>The Professional Guest Post Marketplace</p>
            <p className="small-text">
              You're receiving this because you've worked with us previously. 
              This is a one-time setup invitation.
            </p>
            <p className="small-text">
              © 2024 Linkio. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

// Plain text version for email clients that don't support HTML
export function PublisherMigrationInvitationEmailPlainText({
  publisherName,
  companyName,
  websites,
  claimUrl,
  totalWebsites,
  estimatedMonthlyValue
}: PublisherMigrationInvitationEmailProps) {
  return `
WELCOME TO LINKIO MARKETPLACE
============================

Hello ${publisherName},

You've previously worked with us (or Outreach Labs) on guest posting opportunities. We're excited to introduce Linkio Marketplace - our new streamlined platform that makes managing guest post orders easier than ever.

WHY JOIN LINKIO MARKETPLACE?
- Automated order management and tracking
- Faster payments with transparent pricing  
- Reduced back-and-forth communication
- Real-time performance metrics
- Priority access to high-value orders
- Professional publisher dashboard

YOUR PROFILE OVERVIEW:
Company: ${companyName}
Websites: ${totalWebsites}${estimatedMonthlyValue ? `\nEstimated Monthly Value: $${estimatedMonthlyValue.toLocaleString()}` : ''}
Setup Time: Less than 5 minutes

WE'VE CREATED A PROFILE WITH YOUR WEBSITES:
${websites.slice(0, 5).map(w => `- ${w.domain}${w.currentRate ? ` ($${w.currentRate})` : ''}`).join('\n')}${totalWebsites > 5 ? `\n... and ${totalWebsites - 5} more websites` : ''}

CLAIM YOUR ACCOUNT TO:
✓ Verify your current rates and terms
✓ Update service offerings and availability  
✓ Set payment preferences
✓ Start receiving orders immediately

CLAIM YOUR ACCOUNT:
${claimUrl}

(This secure link expires in 30 days and can only be used once)

EARLY ADOPTER BENEFITS:
Publishers who join in the first 30 days get:
- Featured placement in search results
- Priority for high-value orders  
- Dedicated onboarding support

Questions? Reply to this email or contact our team at publishers@linkio.com

Best regards,
The Linkio Team

---
© 2024 Linkio. All rights reserved.
You're receiving this because you've worked with us previously. This is a one-time setup invitation.
`;
}

export default PublisherMigrationInvitationEmail;