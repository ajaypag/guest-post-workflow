import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('[Email Logs Migration Direct] Starting direct migration...');
  const log: string[] = [];
  
  try {
    // TODO: Add authentication check when auth system is implemented
    
    log.push('Starting email logs migration...');
    
    // Step 1: Check if table exists
    log.push('Checking if email_logs table already exists...');
    const tableCheckResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
      ) as exists
    `) as any;
    
    // Handle both array and object with rows property
    const tableCheck = Array.isArray(tableCheckResult) ? tableCheckResult : (tableCheckResult.rows || []);
    
    if (tableCheck[0]?.exists) {
      log.push('Table already exists, skipping creation');
      return NextResponse.json({
        success: true,
        message: 'Email logs table already exists',
        log
      });
    }
    
    // Step 2: Create the table
    log.push('Creating email_logs table...');
    await db.execute(sql`
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        recipients TEXT[] NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP,
        error TEXT,
        resend_id VARCHAR(255),
        metadata JSONB,
        sent_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log.push('✓ Table created successfully');
    
    // Step 3: Create indexes one by one with error handling
    const indexes = [
      { name: 'idx_email_logs_type', column: 'type' },
      { name: 'idx_email_logs_status', column: 'status' },
      { name: 'idx_email_logs_sent_at', column: 'sent_at' },
      { name: 'idx_email_logs_created_at', column: 'created_at' },
      { name: 'idx_email_logs_resend_id', column: 'resend_id' }
    ];
    
    for (const index of indexes) {
      try {
        log.push(`Creating index ${index.name}...`);
        await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ${index.name} ON email_logs(${index.column})`));
        log.push(`✓ Index ${index.name} created`);
      } catch (indexError: any) {
        log.push(`⚠ Index ${index.name} failed: ${indexError.message}`);
      }
    }
    
    // Step 4: Create GIN index for array column
    try {
      log.push('Creating GIN index for recipients array...');
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_logs_recipients ON email_logs USING GIN(recipients)`);
      log.push('✓ GIN index created');
    } catch (ginError: any) {
      log.push(`⚠ GIN index failed: ${ginError.message}`);
    }
    
    // Step 5: Create or verify trigger function exists
    try {
      log.push('Checking for trigger function...');
      const functionCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'update_updated_at_column'
        ) as exists
      `) as any;
      
      if (!functionCheck[0]?.exists) {
        log.push('Creating trigger function...');
        await db.execute(sql`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql'
        `);
        log.push('✓ Trigger function created');
      } else {
        log.push('✓ Trigger function already exists');
      }
      
      // Create trigger
      log.push('Creating update trigger...');
      await db.execute(sql`
        CREATE OR REPLACE TRIGGER update_email_logs_updated_at 
        BEFORE UPDATE ON email_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      log.push('✓ Trigger created');
    } catch (triggerError: any) {
      log.push(`⚠ Trigger creation failed: ${triggerError.message}`);
    }
    
    // Step 6: Add table comment
    try {
      log.push('Adding table comment...');
      await db.execute(sql`
        COMMENT ON TABLE email_logs IS 'Tracks all email sending activity through Resend'
      `);
      log.push('✓ Comment added');
    } catch (commentError: any) {
      log.push(`⚠ Comment failed: ${commentError.message}`);
    }
    
    // Step 7: Verify table was created
    log.push('Verifying table creation...');
    const verify = await db.execute(sql`
      SELECT 
        COUNT(*) as column_count,
        array_agg(column_name ORDER BY ordinal_position) as columns
      FROM information_schema.columns 
      WHERE table_name = 'email_logs'
    `) as any;
    
    if (verify[0]?.column_count > 0) {
      log.push(`✓ Table verified with ${verify[0].column_count} columns`);
      log.push(`✓ Columns: ${verify[0].columns.join(', ')}`);
    } else {
      throw new Error('Table creation could not be verified');
    }
    
    log.push('✅ Email logs migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Email logs table created successfully',
      log,
      summary: {
        table_created: true,
        columns: verify[0]?.columns || [],
        column_count: verify[0]?.column_count || 0
      }
    });
    
  } catch (error: any) {
    console.error('[Email Logs Migration Direct] Error:', error);
    log.push(`❌ Error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      detail: error.detail || undefined,
      hint: error.hint || undefined,
      log
    }, { status: 500 });
  }
}

// Rollback endpoint
export async function DELETE() {
  const log: string[] = [];
  
  try {
    log.push('Starting rollback...');
    
    // Drop trigger first
    log.push('Dropping trigger...');
    await db.execute(sql`DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs`);
    log.push('✓ Trigger dropped');
    
    // Drop table
    log.push('Dropping table...');
    await db.execute(sql`DROP TABLE IF EXISTS email_logs CASCADE`);
    log.push('✓ Table dropped');
    
    return NextResponse.json({
      success: true,
      message: 'Email logs table removed successfully',
      log
    });
    
  } catch (error: any) {
    console.error('[Email Logs Migration Direct] Rollback error:', error);
    log.push(`❌ Error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Rollback failed',
      log
    }, { status: 500 });
  }
}