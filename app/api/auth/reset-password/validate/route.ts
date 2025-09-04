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
    // First try to get the token with metadata
    const tokenResult = await db.execute(sql`
      SELECT 
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used_at,
        prt.metadata
      FROM password_reset_tokens prt
      WHERE prt.token = ${hashedToken}
        AND prt.used_at IS NULL
        AND prt.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `);

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    const tokenData = tokenResult.rows[0];
    let email, name;

    // Parse metadata to determine user type
    if (tokenData.metadata) {
      const metadata = typeof tokenData.metadata === 'string' 
        ? JSON.parse(tokenData.metadata) 
        : tokenData.metadata;
      
      if (metadata.user_type === 'account' && metadata.account_id) {
        // For account users, get email from accounts table
        const accountResult = await db.execute(sql`
          SELECT email, contact_name as name
          FROM accounts
          WHERE id = ${metadata.account_id}
          LIMIT 1
        `);
        
        if (accountResult.rows.length > 0) {
          email = accountResult.rows[0].email;
          name = accountResult.rows[0].name;
        }
      } else {
        // For internal users, get from users table
        const userResult = await db.execute(sql`
          SELECT email, name
          FROM users
          WHERE id = ${tokenData.user_id}
          LIMIT 1
        `);
        
        if (userResult.rows.length > 0) {
          email = userResult.rows[0].email;
          name = userResult.rows[0].name;
        }
      }
    } else {
      // Legacy tokens without metadata - assume internal user
      const userResult = await db.execute(sql`
        SELECT email, name
        FROM users
        WHERE id = ${tokenData.user_id}
        LIMIT 1
      `);
      
      if (userResult.rows.length > 0) {
        email = userResult.rows[0].email;
        name = userResult.rows[0].name;
      }
    }

    if (!email) {
      return NextResponse.json({
        valid: false,
        error: 'User not found for this token'
      });
    }

    return NextResponse.json({
      valid: true,
      email: email
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}