import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { VettedSitesApprovalEmail } from '@/lib/email/templates/VettedSitesApprovalEmail';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and internal
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get test email from query params
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email') || 'test@example.com';

    console.log('[TEST] Testing approval email template...');

    // Send the test email
    const emailResult = await EmailService.sendWithTemplate(
      'notification' as any,
      testEmail,
      {
        subject: 'TEST: Your vetted sites request has been approved ✅',
        template: VettedSitesApprovalEmail({
          recipientName: 'Test User',
          targetUrls: ['https://example.com', 'https://test.com'],
          statusUrl: `${process.env.NEXTAUTH_URL}/vetted-sites?test=true`,
        }),
      }
    );

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test approval email sent successfully to ${testEmail}`,
        emailId: emailResult.id,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send test approval email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[TEST] Error sending test approval email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test approval email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}