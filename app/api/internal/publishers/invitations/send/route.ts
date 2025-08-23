import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishers, websites, publisherWebsiteRelationships } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publisherIds, testMode = false } = await request.json();

    if (!publisherIds || !Array.isArray(publisherIds) || publisherIds.length === 0) {
      return NextResponse.json({ error: 'Publisher IDs required' }, { status: 400 });
    }

    // Limit batch size to prevent overwhelming the email service
    if (publisherIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 invitations per batch' }, { status: 400 });
    }

    // Get publishers
    const publishersToInvite = await db
      .select()
      .from(publishers)
      .where(
        and(
          inArray(publishers.id, publisherIds),
          eq(publishers.accountStatus, 'shadow')
        )
      );

    if (publishersToInvite.length === 0) {
      return NextResponse.json({ error: 'No valid publishers found' }, { status: 404 });
    }

    const results = {
      sent: [] as string[],
      failed: [] as { id: string; error: string }[],
      skipped: [] as { id: string; reason: string }[]
    };

    // Process each publisher
    for (const publisher of publishersToInvite) {
      try {
        // Skip if already invited
        if (publisher.invitationSentAt) {
          results.skipped.push({
            id: publisher.id,
            reason: 'Already invited'
          });
          continue;
        }

        // Get publisher's websites for the email
        const publisherWebsites = await db
          .select({
            domain: websites.domain,
            url: websites.url
          })
          .from(publisherWebsiteRelationships)
          .innerJoin(websites, eq(websites.id, publisherWebsiteRelationships.websiteId))
          .where(eq(publisherWebsiteRelationships.publisherId, publisher.id))
          .limit(5);

        // Generate secure invitation token
        const invitationToken = crypto.randomBytes(32).toString('base64url');
        const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/publisher/claim?token=${invitationToken}`;

        // Create email content
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're Invited to Join Our Publisher Network</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 14px 35px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: 600; }
    .button:hover { background: #5558e3; }
    .websites { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
    .website-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
    .website-item:last-child { border-bottom: none; }
    .benefits { margin: 25px 0; }
    .benefit-item { padding: 12px 0; display: flex; align-items: flex-start; }
    .benefit-icon { color: #10b981; margin-right: 12px; font-size: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px; font-weight: 700;">Welcome to Our Publisher Network!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Your exclusive invitation awaits</p>
    </div>
    <div class="content">
      <p style="font-size: 18px; color: #1f2937;">Hello ${publisher.contactName || 'Publisher'},</p>
      
      <p>We've been successfully working with ${publisher.companyName ? `<strong>${publisher.companyName}</strong>` : 'your websites'} and are excited to invite you to join our exclusive publisher platform.</p>
      
      ${publisherWebsites.length > 0 ? `
      <div class="websites">
        <strong style="color: #1f2937; font-size: 16px;">Your Registered Websites:</strong>
        ${publisherWebsites.map(w => `
        <div class="website-item">🌐 ${w.domain}</div>
        `).join('')}
        ${publisherWebsites.length === 5 ? '<div class="website-item" style="font-style: italic;">...and more websites in your portfolio</div>' : ''}
      </div>
      ` : ''}
      
      <div class="benefits">
        <h3 style="color: #1f2937; margin-bottom: 15px;">By claiming your account, you'll unlock:</h3>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <div><strong>Complete Control:</strong> Manage all your website listings and guest post offerings in one place</div>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <div><strong>Set Your Terms:</strong> Define your own pricing, requirements, and content guidelines</div>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <div><strong>Analytics Dashboard:</strong> Track performance, views, and conversion metrics</div>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <div><strong>Direct Opportunities:</strong> Receive pre-qualified guest post requests from verified clients</div>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✓</span>
          <div><strong>Faster Payments:</strong> Automated invoicing and streamlined payment processing</div>
        </div>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${claimUrl}" class="button" style="color: white;">Claim Your Publisher Account →</a>
        <p style="color: #6b7280; font-size: 13px; margin: 10px 0 0 0;">
          Takes less than 2 minutes to complete
        </p>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⏰ Limited Time:</strong> This exclusive invitation link will expire in 30 days. 
          Claim your account now to secure your publisher profile.
        </p>
      </div>
      
      <div class="footer">
        <p style="margin-bottom: 10px;"><strong>Need help?</strong> Simply reply to this email and our team will assist you.</p>
        <p>Best regards,<br><strong>The Guest Post Workflow Team</strong></p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          You're receiving this because your websites are part of our publisher network. 
          If you believe this email was sent in error, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const emailText = `
Welcome to Our Publisher Network!

Hello ${publisher.contactName || 'Publisher'},

We've been successfully working with ${publisher.companyName || 'your websites'} and are excited to invite you to join our exclusive publisher platform.

${publisherWebsites.length > 0 ? `Your Registered Websites:
${publisherWebsites.map(w => `- ${w.domain}`).join('\n')}
${publisherWebsites.length === 5 ? '...and more websites in your portfolio' : ''}
` : ''}

By claiming your account, you'll unlock:

✓ Complete Control: Manage all your website listings and guest post offerings in one place
✓ Set Your Terms: Define your own pricing, requirements, and content guidelines  
✓ Analytics Dashboard: Track performance, views, and conversion metrics
✓ Direct Opportunities: Receive pre-qualified guest post requests from verified clients
✓ Faster Payments: Automated invoicing and streamlined payment processing

Claim Your Publisher Account:
${claimUrl}

Takes less than 2 minutes to complete.

⏰ Limited Time: This exclusive invitation link will expire in 30 days. 
Claim your account now to secure your publisher profile.

Need help? Simply reply to this email and our team will assist you.

Best regards,
The Guest Post Workflow Team

You're receiving this because your websites are part of our publisher network. 
If you believe this email was sent in error, you can safely ignore it.
`;

        // Send email (or simulate in test mode)
        if (testMode) {
          console.log(`[TEST MODE] Would send invitation to ${publisher.email}`);
          results.sent.push(publisher.id);
        } else {
          if (!process.env.RESEND_API_KEY) {
            throw new Error('Email service not configured');
          }

          const emailResult = await resend.emails.send({
            from: 'Guest Post Workflow <info@linkio.com>',
            to: publisher.email,
            subject: `${publisher.contactName ? publisher.contactName + ', you\'re' : 'You\'re'} invited to join our Publisher Network`,
            html: emailHtml,
            text: emailText,
            replyTo: 'info@linkio.com'
          });

          if (emailResult.error) {
            throw new Error(emailResult.error.message);
          }

          // Update publisher record with invitation details
          await db
            .update(publishers)
            .set({
              invitationToken,
              invitationSentAt: new Date(),
              invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              updatedAt: new Date()
            })
            .where(eq(publishers.id, publisher.id));

          results.sent.push(publisher.id);
        }

        // Add delay between emails to avoid rate limiting
        if (!testMode && results.sent.length < publishersToInvite.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }

      } catch (error) {
        console.error(`Failed to send invitation to ${publisher.email}:`, error);
        results.failed.push({
          id: publisher.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate summary
    const summary = {
      requested: publisherIds.length,
      processed: publishersToInvite.length,
      sent: results.sent.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      testMode
    };

    return NextResponse.json({
      success: results.failed.length === 0,
      summary,
      results
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}