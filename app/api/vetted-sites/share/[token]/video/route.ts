import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { vettedSitesRequests } from '@/lib/db/vettedSitesRequestSchema';
import { eq } from 'drizzle-orm';

// POST /api/vetted-sites/share/[token]/video - Add video to share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const { videoUrl, message } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Find the request by share token
    const vettedRequest = await db
      .select()
      .from(vettedSitesRequests)
      .where(eq(vettedSitesRequests.shareToken, token))
      .limit(1);
    
    if (vettedRequest.length === 0) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const requestRecord = vettedRequest[0];

    // Check if share link is still valid
    if (requestRecord.shareExpiresAt && new Date() > new Date(requestRecord.shareExpiresAt)) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 400 });
    }

    // Update request with video details
    await db
      .update(vettedSitesRequests)
      .set({
        proposalVideoUrl: videoUrl,
        proposalMessage: message || null,
        updatedAt: new Date()
      })
      .where(eq(vettedSitesRequests.shareToken, token));

    return NextResponse.json({
      success: true,
      message: 'Video added successfully'
    });

  } catch (error) {
    console.error('Error adding video to share link:', error);
    return NextResponse.json(
      { error: 'Failed to add video' },
      { status: 500 }
    );
  }
}