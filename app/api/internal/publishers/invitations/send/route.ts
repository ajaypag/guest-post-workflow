import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers, websites } from '@/lib/db/schema';
import { publisherWebsites } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
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

        // Get publisher's websites with pricing info for the email
        const publisherWebsitesList = await db
          .select({
            domain: websites.domain,
            basePrice: publisherOfferings.basePrice,
            turnaroundDays: publisherOfferings.turnaroundDays,
            offeringType: publisherOfferings.offeringType
          })
          .from(publisherWebsites)
          .innerJoin(websites, eq(websites.id, publisherWebsites.websiteId))
          .leftJoin(
            publisherOfferingRelationships,
            eq(publisherOfferingRelationships.websiteId, websites.id)
          )
          .leftJoin(
            publisherOfferings,
            and(
              eq(publisherOfferings.id, publisherOfferingRelationships.offeringId),
              eq(publisherOfferings.publisherId, publisher.id)
            )
          )
          .where(eq(publisherWebsites.publisherId, publisher.id))
          .limit(5);

        // Generate secure invitation token
        const invitationToken = crypto.randomBytes(32).toString('base64url');
        const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/publisher/claim?token=${invitationToken}`;

        // Create email content with better template
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're Invited to Join Linkio Publishers</title>
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
      <h1 style="margin: 0; font-size: 28px; font-weight: 600;">You're Invited to Join Linkio Publishers</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px; margin-top: 0;">Hi ${publisher.contactName || 'there'},</p>
      
      <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0;"><strong>Why are you receiving this email?</strong></p>
        <p style="margin: 10px 0;">
          We're Linkio, a link building agency that helps businesses improve their SEO through high-quality guest posts. 
          Over the past few months, we've reached out to various publishers about guest posting opportunities, and 
          you responded to one of our outreach emails with pricing and availability for your website(s).
        </p>
        <p style="margin: 10px 0 0 0;">
          We're now streamlining how we work with publishers like you through our new Publisher Portal, 
          which will make it easier for you to receive and manage guest post orders from us.
        </p>
      </div>

      <h2 style="font-size: 20px; margin-top: 30px; margin-bottom: 20px;">Here's What We Have On File For You:</h2>
      
      ${publisherWebsitesList.length > 0 ? `
      ${publisherWebsitesList.map((w: any) => `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
        <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 10px;">${w.domain}</div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Guest Post Rate</div>
            <div style="font-size: 16px; color: #1f2937; font-weight: 500; margin-top: 4px;">
              ${w.basePrice ? `$${w.basePrice}` : 'To be confirmed'}
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Turnaround Time</div>
            <div style="font-size: 16px; color: #1f2937; font-weight: 500; margin-top: 4px;">
              ${w.turnaroundDays ? `${w.turnaroundDays} days` : 'To be confirmed'}
            </div>
          </div>
        </div>
      </div>
      `).join('')}
      ${publisherWebsitesList.length === 5 ? '<p style="text-align: center; color: #6b7280; font-size: 14px; margin: 10px 0;">+ more websites on file</p>' : ''}
      ` : ''}
      
      <div style="background: #dbeafe; border: 1px solid #60a5fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">
          <strong>Is this information still accurate?</strong><br>
          You can update your rates, turnaround times, and website details anytime in your publisher dashboard.
        </p>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">🎯 What's In It For You?</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li style="color: #78350f; margin: 8px 0;"><strong>Regular Orders:</strong> Get consistent guest post requests from our clients</li>
          <li style="color: #78350f; margin: 8px 0;"><strong>Quick Payment:</strong> Fast, reliable payments for completed posts</li>
          <li style="color: #78350f; margin: 8px 0;"><strong>No More Email Back-and-Forth:</strong> Manage everything in one dashboard</li>
          <li style="color: #78350f; margin: 8px 0;"><strong>Set Your Own Terms:</strong> Control your pricing, turnaround times, and availability</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 40px 0;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>Ready to start receiving orders?</strong><br>
          Your account is already set up - just confirm your details:
        </p>
        <a href="${claimUrl}" class="button" style="color: white;">Activate Your Publisher Account →</a>
        <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
          Takes less than 2 minutes
        </p>
      </div>
      
      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 40px;">
        <p style="font-size: 14px; color: #6b7280;">
          <strong>Questions?</strong> Simply reply to this email and we'll help you get set up.
        </p>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
        <strong>Linkio</strong> - Publisher Network Management Platform
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
        © 2025 Linkio. All rights reserved.
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">
        You're receiving this because you previously expressed interest in accepting guest posts.<br>
        If this was sent in error, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;

        const emailText = `
You're Invited to Join Linkio Publishers

Hi ${publisher.contactName || 'there'},

=== Why are you receiving this email? ===

We're Linkio, a link building agency that helps businesses improve their SEO through high-quality guest posts. Over the past few months, we've reached out to various publishers about guest posting opportunities, and you responded to one of our outreach emails with pricing and availability for your website(s).

We're now streamlining how we work with publishers like you through our new Publisher Portal, which will make it easier for you to receive and manage guest post orders from us.

=== Here's What We Have On File For You ===

${publisherWebsitesList.map((w: any) => `
• ${w.domain}
  - Guest Post Rate: ${w.basePrice ? `$${w.basePrice}` : 'To be confirmed'}
  - Turnaround Time: ${w.turnaroundDays ? `${w.turnaroundDays} days` : 'To be confirmed'}
`).join('')}
${publisherWebsitesList.length === 5 ? '\n+ more websites on file\n' : ''}

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
            subject: `Action Required: Confirm your guest post rates for ${publisher.companyName || 'your websites'}`,
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