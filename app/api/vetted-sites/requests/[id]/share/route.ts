import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { VettedSitesEmailService } from '@/lib/services/vettedSitesEmailService';

// POST /api/vetted-sites/requests/[id]/share - Generate share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { 
      expiresInDays, 
      recipientEmail, 
      recipientName, 
      customMessage, 
      sendEmail = false 
    } = await request.json();

    // Get the request and verify it exists and is fulfilled
    const vettedRequest = await db
      .select()
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.id, id))
      .limit(1);
    
    if (vettedRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestRecord = vettedRequest[0];

    if (requestRecord.status !== 'fulfilled') {
      return NextResponse.json({ 
        error: 'Request must be fulfilled before sharing' 
      }, { status: 400 });
    }

    // Generate share token and expiry
    const shareToken = uuidv4();
    const shareExpiresAt = new Date();
    shareExpiresAt.setDate(shareExpiresAt.getDate() + (expiresInDays || 30));

    // Update request with share token
    await db
      .update(vettedSitesRequests)
      .set({
        shareToken,
        shareExpiresAt,
        updatedAt: new Date()
      })
      .where(eq(vettedSitesRequests.id, id));

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3004';
    const shareUrl = `${baseUrl}/vetted-sites/claim/${shareToken}`;

    // Send email if requested
    let emailResult = null;
    if (sendEmail && recipientEmail && recipientName) {
      try {
        emailResult = await VettedSitesEmailService.sendShareEmail(
          id,
          recipientEmail,
          recipientName,
          customMessage
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the whole request if email fails
        emailResult = { success: false, error: 'Email sending failed' };
      }
    }

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt: shareExpiresAt,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error
    });

  } catch (error) {
    console.error('Error generating share link:', error);
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}

// DELETE /api/vetted-sites/requests/[id]/share - Revoke share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Remove share token from request
    await db
      .update(vettedSitesRequests)
      .set({
        shareToken: null,
        shareExpiresAt: null,
        proposalVideoUrl: null,
        proposalMessage: null,
        updatedAt: new Date()
      })
      .where(eq(vettedSitesRequests.id, id));

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}