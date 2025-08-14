import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherClaimingService } from '@/lib/services/publisherClaimingService';
import { z } from 'zod';

// POST /api/admin/publishers/claims/[id]/reject - Reject a claim
const rejectClaimSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required')
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthServiceServer.getSession(request);
    const { id } = await params;
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const claimId = id;
    const body = await request.json();
    const { reason } = rejectClaimSchema.parse(body);
    
    const claim = await publisherClaimingService.rejectClaim(claimId, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Claim rejected successfully',
      data: claim
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }
    
    console.error('Error rejecting claim:', error);
    return NextResponse.json(
      { error: 'Failed to reject claim' },
      { status: 500 }
    );
  }
}