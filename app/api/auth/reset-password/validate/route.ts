import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Hash the token to match what's stored in database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists, is not used, and not expired
    const result = await db.execute(sql`
      SELECT 
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used_at,
        u.email,
        u.name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ${hashedToken}
        AND prt.used_at IS NULL
        AND prt.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    return NextResponse.json({
      valid: true,
      email: result.rows[0].email
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}