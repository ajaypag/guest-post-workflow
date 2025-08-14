import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { publisherClaimingService } from '@/lib/services/publisherClaimingService';
import { z } from 'zod';

// POST /api/publishers/claim - Initiate website claim
const initiateClaimSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { email } = initiateClaimSchema.parse(body);
    
    const publisherId = session.userId;
    
    // Find and create claims for claimable websites
    const claims = await publisherClaimingService.initiateClaim(publisherId, email);
    
    if (claims.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No claimable websites found for this email',
        data: []
      });
    }
    
    // Send verification emails for each claim
    const emailPromises = claims.map(claim => 
      publisherClaimingService.sendVerificationEmail(claim.id)
    );
    
    await Promise.all(emailPromises);
    
    return NextResponse.json({
      success: true,
      message: `Found ${claims.length} claimable website(s). Verification emails have been sent.`,
      data: claims
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    console.error('Error initiating claim:', error);
    return NextResponse.json(
      { error: 'Failed to initiate claim' },
      { status: 500 }
    );
  }
}

// GET /api/publishers/claim - Get publisher's claims
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized - Publisher access required' },
        { status: 401 }
      );
    }
    
    const publisherId = session.userId;
    const claims = await publisherClaimingService.getPublisherClaims(publisherId);
    
    return NextResponse.json({
      success: true,
      data: claims
    });
    
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}