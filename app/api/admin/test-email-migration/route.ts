import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  const steps: any[] = [];
  
  try {
    // Step 1: Test database connection
    steps.push({ step: 'db_connection', status: 'testing' });
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    steps.push({ step: 'db_connection', status: 'success', result: testQuery });
    
    // Step 2: Check current tables
    steps.push({ step: 'list_tables', status: 'testing' });
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    steps.push({ step: 'list_tables', status: 'success', count: tables.rows.length });
    
    // Step 3: Check if email_logs exists
    steps.push({ step: 'check_email_logs', status: 'testing' });
    const emailLogsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_logs'
      ) as exists
    `) as any;
    steps.push({ 
      step: 'check_email_logs', 
      status: 'success', 
      exists: emailLogsExists[0]?.exists || false 
    });
    
    // Step 4: Try to create a simple test table
    steps.push({ step: 'create_test_table', status: 'testing' });
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_migration_test (
          id SERIAL PRIMARY KEY,
          test_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      steps.push({ step: 'create_test_table', status: 'success' });
      
      // Clean up test table
      await db.execute(sql`DROP TABLE IF EXISTS email_migration_test`);
      steps.push({ step: 'cleanup_test_table', status: 'success' });
    } catch (createError: any) {
      steps.push({ 
        step: 'create_test_table', 
        status: 'error', 
        error: createError.message,
        detail: createError.detail 
      });
    }
    
    // Step 5: Check update_updated_at_column function
    steps.push({ step: 'check_trigger_function', status: 'testing' });
    const functionExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
      ) as exists
    `) as any;
    steps.push({ 
      step: 'check_trigger_function', 
      status: 'success', 
      exists: functionExists[0]?.exists || false 
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test completed',
      steps,
      summary: {
        database_connected: true,
        total_tables: tables.rows.length,
        email_logs_exists: emailLogsExists[0]?.exists || false,
        can_create_tables: steps.find(s => s.step === 'create_test_table' && s.status === 'success') !== undefined,
        trigger_function_exists: functionExists[0]?.exists || false
      }
    });
    
  } catch (error: any) {
    console.error('[Test Email Migration] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed',
      detail: error.detail || undefined,
      steps
    }, { status: 500 });
  }
}

// Test creating the email_logs table directly
export async function POST() {
  try {
    console.log('[Test Email Migration] Attempting direct table creation...');
    
    // Drop table if exists (for testing)
    await db.execute(sql`DROP TABLE IF EXISTS email_logs CASCADE`);
    console.log('[Test Email Migration] Dropped existing table if any');
    
    // Create table with minimal structure
    const createResult = await db.execute(sql`
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        recipients TEXT[] NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[Test Email Migration] Table created successfully');
    
    // Verify table was created
    const verifyResult = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Email logs table created successfully in test',
      createResult,
      columns: verifyResult.rows
    });
    
  } catch (error: any) {
    console.error('[Test Email Migration] Direct creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Direct creation failed',
      detail: error.detail || undefined,
      hint: error.hint || undefined,
      code: error.code || undefined
    }, { status: 500 });
  }
}