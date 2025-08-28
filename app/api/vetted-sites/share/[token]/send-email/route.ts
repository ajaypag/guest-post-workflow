import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { VettedSitesEmailService } from '@/lib/services/vettedSitesEmailService';

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> }
) {
  try {
    // Await params for Next.js 15 compatibility
    const params = await paramsPromise;
    
    // Verify authentication
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { recipientEmail, recipientName, customMessage } = body;
    
    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { error: 'Recipient email and name are required' }, 
        { status: 400 }
      );
    }

    // Find the vetted sites request by share token
    const [vettedRequest] = await db
      .select()
      .from(vettedSitesRequests)
      .where(
        and(
          eq(vettedSitesRequests.shareToken, params.token),
          eq(vettedSitesRequests.status, 'fulfilled') // Only fulfilled requests can be shared
        )
      )
      .limit(1);

    if (!vettedRequest) {
      return NextResponse.json({ error: 'Share token not found or request not fulfilled' }, { status: 404 });
    }

    // Send email using the existing service
    const shareUrl = `${request.nextUrl.origin}/vetted-sites/claim/${params.token}`;
    
    try {
      await VettedSitesEmailService.sendShareEmail(
        vettedRequest.id,
        recipientEmail,
        recipientName,
        customMessage
      );

      // Update the request with latest email info (optional - could track multiple emails)
      await db
        .update(vettedSitesRequests)
        .set({
          shareRecipientEmail: recipientEmail,
          shareRecipientName: recipientName,
          shareCustomMessage: customMessage,
          shareEmailSentAt: new Date()
        })
        .where(eq(vettedSitesRequests.id, vettedRequest.id));

      return NextResponse.json({ 
        success: true,
        message: `Email sent successfully to ${recipientEmail}`
      });

    } catch (emailError: any) {
      console.error('Error sending vetted sites share email:', emailError);
      return NextResponse.json({ 
        error: `Failed to send email: ${emailError.message}` 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in vetted sites share email endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}