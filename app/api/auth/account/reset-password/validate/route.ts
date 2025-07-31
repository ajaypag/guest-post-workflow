import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resetTokens } from '../../forgot-password/route';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      );
    }

    // Hash the token to look it up
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Check if token exists and is not expired
    const resetToken = resetTokens.get(hashedToken);
    
    if (!resetToken) {
      return NextResponse.json({
        error: 'Invalid or expired reset token',
        valid: false
      }, { status: 400 });
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      // Remove expired token
      resetTokens.delete(hashedToken);
      return NextResponse.json({
        error: 'Reset token has expired',
        valid: false
      }, { status: 400 });
    }
    
    return NextResponse.json({
      valid: true
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token', valid: false },
      { status: 500 }
    );
  }
}