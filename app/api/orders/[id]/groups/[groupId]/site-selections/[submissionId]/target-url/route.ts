import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Update target URL association for a domain submission
 * Allows flexible reassignment of domains to different target URLs
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string; submissionId: string }> }
) {
  try {
    const { submissionId, groupId } = await params;
    const body = await request.json();
    const { targetPageUrl, anchorText } = body;

    // Authenticate user
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both internal and account users can update target URLs
    if (session.userType !== 'internal' && session.userType !== 'account') {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 403 });
    }

    // Verify the submission exists and belongs to this order group
    const submission = await db.query.orderSiteSubmissions.findFirst({
      where: and(
        eq(orderSiteSubmissions.id, submissionId),
        eq(orderSiteSubmissions.orderGroupId, groupId)
      )
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Update the submission metadata
    const updatedMetadata = {
      ...submission.metadata,
      targetPageUrl: targetPageUrl || null,
      anchorText: anchorText || submission.metadata?.anchorText || null,
      // Track the update
      lastUpdatedBy: session.userId,
      lastUpdatedAt: new Date().toISOString(),
      // Add to history if it exists
      ...(submission.metadata?.statusHistory ? {
        statusHistory: [
          ...(submission.metadata.statusHistory as any[]),
          {
            status: 'target_url_updated',
            timestamp: new Date().toISOString(),
            updatedBy: session.userId,
            notes: `Target URL ${targetPageUrl ? 'assigned' : 'removed'}`
          }
        ]
      } : {})
    };

    // Update the submission
    await db
      .update(orderSiteSubmissions)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date()
      })
      .where(eq(orderSiteSubmissions.id, submissionId));

    return NextResponse.json({
      success: true,
      message: targetPageUrl 
        ? 'Target URL assigned successfully' 
        : 'Target URL removed successfully'
    });

  } catch (error) {
    console.error('Error updating target URL:', error);
    return NextResponse.json(
      { error: 'Failed to update target URL' },
      { status: 500 }
    );
  }
}