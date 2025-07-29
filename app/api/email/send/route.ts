import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { 
  WelcomeEmail, 
  WorkflowCompletedEmail, 
  ContactOutreachEmail 
} from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth system is implemented

    const body = await request.json();
    const { type, recipient, data } = body;

    // Validate required fields
    if (!type || !recipient) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipient' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await EmailService.sendWithTemplate('welcome', recipient, {
          subject: 'Welcome to PostFlow',
          template: WelcomeEmail({
            userName: data.userName || 'User',
            userEmail: data.userEmail || recipient,
            loginUrl: data.loginUrl,
          }),
        });
        break;

      case 'workflow-completed':
        result = await EmailService.sendWithTemplate('workflow-completed', recipient, {
          subject: `Workflow "${data.workflowName}" Completed`,
          template: WorkflowCompletedEmail({
            userName: data.userName,
            workflowName: data.workflowName,
            clientName: data.clientName,
            completedSteps: data.completedSteps,
            totalSteps: data.totalSteps,
            completedAt: data.completedAt,
            viewUrl: data.viewUrl,
          }),
        });
        break;

      case 'contact-outreach':
        result = await EmailService.sendWithTemplate('contact-outreach', recipient, {
          subject: data.subject || 'Collaboration Opportunity',
          template: ContactOutreachEmail({
            contactName: data.contactName,
            websiteDomain: data.websiteDomain,
            websiteMetrics: data.websiteMetrics,
            outreachType: data.outreachType,
            message: data.message,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            replyToEmail: data.replyToEmail,
          }),
        });
        break;

      case 'custom':
        // For custom HTML/text emails
        result = await EmailService.send('notification', {
          to: recipient,
          subject: data.subject,
          html: data.html,
          text: data.text,
          from: data.from,
          replyTo: data.replyTo,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        id: result.id,
        message: 'Email sent successfully',
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send email' 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}