import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Create password_reset_tokens table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on token for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
      ON password_reset_tokens(token)
    `);

    // Create index on user_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
      ON password_reset_tokens(user_id)
    `);

    // Create index on expires_at for cleanup queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
      ON password_reset_tokens(expires_at)
    `);

    return NextResponse.json({
      success: true,
      message: 'Password reset tokens table created successfully',
      tables: ['password_reset_tokens'],
      indexes: [
        'idx_password_reset_tokens_token',
        'idx_password_reset_tokens_user_id',
        'idx_password_reset_tokens_expires_at'
      ]
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: error.message,
      details: error
    }, { status: 500 });
  }
}