import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    // First check if table already exists
    const checkResult = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_security_logs'
      ) as exists;
    `);

    if (checkResult.rows[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: 'webhook_security_logs table already exists - no migration needed'
      });
    }

    // Run the migration
    const migrationSQL = `
      -- Create webhook_security_logs table for tracking webhook requests
      CREATE TABLE IF NOT EXISTS webhook_security_logs (
          id SERIAL PRIMARY KEY,
          webhook_id VARCHAR(255),
          ip_address VARCHAR(45) NOT NULL,
          user_agent TEXT,
          signature_valid BOOLEAN DEFAULT false,
          signature_provided VARCHAR(255),
          timestamp_valid BOOLEAN DEFAULT false,
          ip_allowed BOOLEAN DEFAULT false,
          rate_limit_key VARCHAR(255),
          requests_in_window INTEGER DEFAULT 1,
          allowed BOOLEAN DEFAULT false,
          rejection_reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Add indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_webhook_id ON webhook_security_logs(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_ip_address ON webhook_security_logs(ip_address);
      CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created_at ON webhook_security_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_allowed ON webhook_security_logs(allowed);

      -- Add composite index for rate limiting queries
      CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_rate_limit 
          ON webhook_security_logs(rate_limit_key, created_at DESC);
    `;

    await db.execute(migrationSQL);

    // Verify the table was created
    const verifyResult = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_security_logs'
      ) as exists;
    `);

    if (!verifyResult.rows[0]?.exists) {
      throw new Error('Table creation failed - verification check failed');
    }

    // Count indexes created
    const indexResult = await db.execute(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes 
      WHERE tablename = 'webhook_security_logs';
    `);

    const indexCount = indexResult.rows[0]?.index_count || 0;

    return NextResponse.json({
      success: true,
      message: `Migration completed successfully!\n\n✅ webhook_security_logs table created\n✅ ${indexCount} indexes created\n✅ Webhook security logging now available`
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    }, { status: 500 });
  }
}