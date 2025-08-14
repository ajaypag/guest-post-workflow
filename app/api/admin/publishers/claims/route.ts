import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherClaimingService } from '@/lib/services/publisherClaimingService';

// GET /api/admin/publishers/claims - Get all pending claims for review
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const pendingClaims = await publisherClaimingService.getPendingClaims();
    
    return NextResponse.json({
      success: true,
      data: pendingClaims
    });
    
  } catch (error) {
    console.error('Error fetching pending claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending claims' },
      { status: 500 }
    );
  }
}