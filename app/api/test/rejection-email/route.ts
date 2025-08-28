import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { VettedSitesRejectionEmail } from '@/lib/email/templates/VettedSitesRejectionEmail';
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

    console.log('[TEST] Testing rejection email template...');

    // Send the test email
    const emailResult = await EmailService.sendWithTemplate(
      'notification' as any,
      testEmail,
      {
        subject: 'TEST: Update on your vetted sites request',
        template: VettedSitesRejectionEmail({
          recipientName: 'Test User',
          targetUrls: ['https://example.com', 'https://test.com'],
          replyEmail: 'info@linkio.com',
        }),
      }
    );

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test rejection email sent successfully to ${testEmail}`,
        emailId: emailResult.id,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send test rejection email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[TEST] Error sending test rejection email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test rejection email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}