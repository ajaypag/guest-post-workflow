import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, websites } from '@/lib/db/schema';
import { publisherWebsites } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publisherId } = await request.json();

    if (!publisherId) {
      return NextResponse.json({ error: 'Publisher ID required' }, { status: 400 });
    }

    // Get publisher details
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 });
    }

    // Get publisher's websites
    const publisherWebsitesList = await db
      .select({
        domain: websites.domain
      })
      .from(publisherWebsites)
      .innerJoin(websites, eq(websites.id, publisherWebsites.websiteId))
      .where(eq(publisherWebsites.publisherId, publisherId))
      .limit(5); // Show first 5 websites in preview

    // Generate invitation token (would be real in production)
    const invitationToken = Buffer.from(`${publisherId}-${Date.now()}`).toString('base64');
    const claimUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3002'}/publisher/claim?token=${invitationToken}`;

    // Create email HTML template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're Invited to Join Our Publisher Network</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .websites { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .website-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .website-item:last-child { border-bottom: none; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Welcome to Our Publisher Network!</h1>
    </div>
    <div class="content">
      <p>Hello ${publisher.contactName || 'Publisher'},</p>
      
      <p>We've been working with your ${publisher.companyName ? `company ${publisher.companyName}` : 'websites'} and would love to invite you to join our publisher platform.</p>
      
      ${publisherWebsitesList.length > 0 ? `
      <div class="websites">
        <strong>Your Websites:</strong>
        ${publisherWebsitesList.map((w: any) => `
        <div class="website-item">${w.domain}</div>
        `).join('')}
        ${publisherWebsitesList.length === 5 ? '<div class="website-item">...and more</div>' : ''}
      </div>
      ` : ''}
      
      <p>By claiming your account, you'll be able to:</p>
      <ul>
        <li>Manage your website listings and offerings</li>
        <li>Set your own pricing and requirements</li>
        <li>Track performance and analytics</li>
        <li>Receive direct guest post opportunities</li>
        <li>Get paid faster with automated invoicing</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${claimUrl}" class="button">Claim Your Account</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        This invitation link is unique to you and will expire in 30 days. 
        If you have any questions, please don't hesitate to reach out.
      </p>
      
      <div class="footer">
        <p>Best regards,<br>The Guest Post Workflow Team</p>
        <p style="font-size: 12px; color: #9ca3af;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Create plain text version
    const emailText = `
Welcome to Our Publisher Network!

Hello ${publisher.contactName || 'Publisher'},

We've been working with your ${publisher.companyName ? `company ${publisher.companyName}` : 'websites'} and would love to invite you to join our publisher platform.

${publisherWebsitesList.length > 0 ? `Your Websites:
${publisherWebsitesList.map((w: any) => `- ${w.domain}`).join('\n')}
${publisherWebsitesList.length === 5 ? '...and more' : ''}
` : ''}

By claiming your account, you'll be able to:
- Manage your website listings and offerings
- Set your own pricing and requirements
- Track performance and analytics
- Receive direct guest post opportunities
- Get paid faster with automated invoicing

Claim Your Account: ${claimUrl}

This invitation link is unique to you and will expire in 30 days.
If you have any questions, please don't hesitate to reach out.

Best regards,
The Guest Post Workflow Team

If you didn't expect this email, you can safely ignore it.
`;

    return NextResponse.json({
      subject: `${publisher.contactName || 'You\'re'} invited to join our Publisher Network`,
      html: emailHtml,
      text: emailText,
      previewData: {
        publisherName: publisher.contactName || publisher.companyName || 'Publisher',
        email: publisher.email,
        websiteCount: publisherWebsitesList.length,
        claimUrl
      }
    });
  } catch (error) {
    console.error('Error generating email preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate email preview' },
      { status: 500 }
    );
  }
}