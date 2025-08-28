import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { VettedSitesFulfillmentEmail } from '@/lib/email/templates/VettedSitesFulfillmentEmail';
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

    console.log('[TEST] Testing fulfillment email template...');

    // Mock domain data for testing
    const mockDomains = [
      {
        domain: 'example.com',
        directKeywords: 25,
        relatedKeywords: 18,
        avgPosition: 15,
        dr: 85,
        traffic: 125000,
        cost: 450,
        reasoning: 'High-authority domain with strong keyword overlap and consistent traffic patterns'
      },
      {
        domain: 'test.com',
        directKeywords: 18,
        relatedKeywords: 22,
        avgPosition: 12,
        dr: 72,
        traffic: 89000,
        cost: 325,
        reasoning: 'Well-established site with relevant content and good engagement metrics'
      }
    ];

    // Send the test email
    const emailResult = await EmailService.sendWithTemplate(
      'notification' as any,
      testEmail,
      {
        subject: 'TEST: Your vetted sites analysis is ready! 🎯',
        template: VettedSitesFulfillmentEmail({
          recipientName: 'Test User',
          totalQualified: 47,
          topDomains: mockDomains,
          resultsUrl: `${process.env.NEXTAUTH_URL}/vetted-sites?test=true`,
          clientWebsite: 'example-client.com',
          avgKeywordOverlap: 21.5,
          strongAuthorityPercentage: 68,
        }),
      }
    );

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test fulfillment email sent successfully to ${testEmail}`,
        emailId: emailResult.id,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send test fulfillment email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[TEST] Error sending test fulfillment email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test fulfillment email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}