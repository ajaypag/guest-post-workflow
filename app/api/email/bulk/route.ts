import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { ContactOutreachEmail } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth system is implemented

    const body = await request.json();
    const { type, recipients, templateData } = body;

    // Validate required fields
    if (!type || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipients (array)' },
        { status: 400 }
      );
    }

    // Limit bulk sends to prevent abuse
    if (recipients.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 recipients allowed per bulk send' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'contact-outreach-bulk':
        result = await EmailService.sendBulk(
          'contact-outreach',
          recipients,
          (recipientData) => ({
            subject: recipientData.subject || templateData.defaultSubject || 'Collaboration Opportunity',
            template: ContactOutreachEmail({
              contactName: recipientData.contactName,
              websiteDomain: recipientData.websiteDomain,
              websiteMetrics: recipientData.websiteMetrics || templateData.defaultMetrics,
              outreachType: recipientData.outreachType || templateData.defaultOutreachType,
              message: recipientData.message || templateData.defaultMessage,
              senderName: recipientData.senderName || templateData.senderName,
              senderEmail: recipientData.senderEmail || templateData.senderEmail,
              replyToEmail: recipientData.replyToEmail || templateData.replyToEmail,
            }),
          })
        );
        break;

      default:
        return NextResponse.json(
          { error: `Bulk sending not supported for type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: recipients.length,
        sent: result.sent,
        failed: result.failed,
      },
      results: result.results,
    });
  } catch (error: any) {
    console.error('Bulk email API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}