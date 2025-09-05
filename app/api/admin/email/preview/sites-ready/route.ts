import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { SitesReadyForReviewEmail } from '@/lib/email/templates';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and internal
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get test email from query params or use session email
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email') || session.email;

    // Sample sites data for testing
    const sampleSites = [
      {
        domain: 'techblog.com',
        domainRating: 72,
        traffic: 125000,
        price: '$450.00',
        niche: 'Technology & Software',
      },
      {
        domain: 'marketinginsights.net',
        domainRating: 68,
        traffic: 85000,
        price: '$380.00',
        niche: 'Digital Marketing',
      },
      {
        domain: 'businessjournal.org',
        domainRating: 75,
        traffic: 195000,
        price: '$525.00',
        niche: 'Business & Finance',
      },
      {
        domain: 'healthwellness.blog',
        domainRating: 64,
        traffic: 62000,
        price: '$320.00',
        niche: 'Health & Wellness',
      },
      {
        domain: 'startupnews.io',
        domainRating: 70,
        traffic: 110000,
        price: '$410.00',
        niche: 'Startups & Entrepreneurship',
      },
      {
        domain: 'devtutorials.com',
        domainRating: 66,
        traffic: 78000,
        price: '$350.00',
        niche: 'Programming & Development',
      },
      {
        domain: 'creativeblog.design',
        domainRating: 62,
        traffic: 45000,
        price: '$290.00',
        niche: 'Design & Creative',
      },
    ];

    // Calculate estimated completion date (14 days from now)
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 14);
    const estimatedCompletionDate = estimatedDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Send the test email
    const emailResult = await EmailService.sendWithTemplate(
      'sites_ready',
      testEmail,
      {
        subject: `7 Sites Ready for Your Review - Test Order`,
        template: SitesReadyForReviewEmail({
          recipientName: 'Test User',
          companyName: 'Acme Corp',
          orderNumber: 'TEST-ORDER-123',
          sitesCount: 7,
          totalAmount: '$2,685.00',
          sites: sampleSites,
          reviewUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3002'}/orders/test-order-123`,
          estimatedCompletionDate,
          accountManagerName: session.name || 'Account Manager',
          accountManagerEmail: session.email || 'info@linkio.com',
        }),
      }
    );

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        emailId: emailResult.id,
        details: {
          to: testEmail,
          sitesCount: sampleSites.length,
          totalAmount: '$2,685.00',
          estimatedCompletion: estimatedCompletionDate,
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        message: 'Failed to send test email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}