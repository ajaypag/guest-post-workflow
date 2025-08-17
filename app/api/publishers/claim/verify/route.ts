import { NextRequest, NextResponse } from 'next/server';
import { publisherClaimingService } from '@/lib/services/publisherClaimingService';
import { z } from 'zod';

// POST /api/publishers/claim/verify - Verify claim by token
const verifyClaimSchema = z.object({
  token: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifyClaimSchema.parse(body);
    
    const claim = await publisherClaimingService.verifyClaim(token);
    
    return NextResponse.json({
      success: true,
      message: 'Website claim verified successfully',
      data: claim
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    console.error('Error verifying claim:', error);
    return NextResponse.json(
      { error: 'Failed to verify claim' },
      { status: 500 }
    );
  }
}