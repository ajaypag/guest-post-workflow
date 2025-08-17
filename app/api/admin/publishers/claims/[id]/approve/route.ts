import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherClaimingService } from '@/lib/services/publisherClaimingService';

// POST /api/admin/publishers/claims/[id]/approve - Approve a claim
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
    const adminId = session.userId;
    
    const claim = await publisherClaimingService.approveClaim(claimId, adminId);
    
    return NextResponse.json({
      success: true,
      message: 'Claim approved successfully',
      data: claim
    });
    
  } catch (error) {
    console.error('Error approving claim:', error);
    return NextResponse.json(
      { error: 'Failed to approve claim' },
      { status: 500 }
    );
  }
}