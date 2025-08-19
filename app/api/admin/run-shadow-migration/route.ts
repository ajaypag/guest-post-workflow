import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle status check
    if (body.action === 'check_status') {
      const logs: string[] = [];
      const status: any = {};
      
      try {
        // Check if migration 55 fields exist
        const publisherCheck = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'publishers' 
          AND column_name IN ('account_status', 'source', 'invitation_token', 'confidence_score')
        `);
        
        status.migration55Applied = publisherCheck.rows.length >= 4;
        status.publishersReady = publisherCheck.rows.length >= 4;
        
        // Check if migration 56 tables exist
        const tablesCheck = await db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN (
            'email_processing_logs', 
            'email_review_queue', 
            'publisher_automation_logs',
            'shadow_publisher_websites'
          )
        `);
        
        status.migration56Applied = tablesCheck.rows.length >= 4;
        status.emailTablesReady = tablesCheck.rows.length >= 4;
        
        // Get counts
        if (status.emailTablesReady) {
          const counts = await Promise.all([
            db.execute(sql`SELECT COUNT(*) as count FROM email_processing_logs`),
            db.execute(sql`SELECT COUNT(*) as count FROM email_review_queue`),
          ]).catch(() => []);
          
          status.details = {
            emailLogs: counts[0]?.rows[0]?.count || 0,
            reviewQueue: counts[1]?.rows[0]?.count || 0,
          };
        }
        
        return NextResponse.json(status);
        
      } catch (error) {
        return NextResponse.json({
          migration55Applied: false,
          migration56Applied: false,
          publishersReady: false,
          emailTablesReady: false,
          error: error instanceof Error ? error.message : 'Status check failed'
        });
      }
    }
    
    const { migration } = body;
    
    // Only allow the two specific migrations
    if (migration !== '0055_shadow_publisher_support.sql' && 
        migration !== '0056_email_processing_infrastructure.sql') {
      return NextResponse.json({ error: 'Invalid migration' }, { status: 400 });
    }

    const logs: string[] = [];
    logs.push(`📁 Reading migration file: ${migration}`);
    
    // Read the migration file
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const filePath = path.join(migrationsDir, migration);
    
    const content = await fs.readFile(filePath, 'utf-8');
    logs.push(`📄 File loaded: ${content.length} characters`);
    
    // Parse SQL statements
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    logs.push(`🔍 Found ${statements.length} SQL statements to execute`);
    
    // Execute the migration
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      // Get operation type
      const operationType = statement.match(/^(CREATE|ALTER|UPDATE|INSERT|DROP|DELETE)/i)?.[1] || 'UNKNOWN';
      logs.push(`  Statement ${i + 1}: ${operationType} operation`);
      
      try {
        await db.execute(sql.raw(statement + ';'));
        successCount++;
        logs.push(`  ✅ Statement ${i + 1} completed`);
      } catch (dbError: any) {
        // Check if it's just "already exists" errors
        if (dbError.message?.includes('already exists') || 
            dbError.message?.includes('duplicate key')) {
          skipCount++;
          logs.push(`  ⏭️  Statement ${i + 1} skipped (already exists)`);
        } else {
          logs.push(`  ❌ Statement ${i + 1} failed: ${dbError.message}`);
          return NextResponse.json({ 
            success: false,
            error: dbError.message,
            logs,
            successCount,
            skipCount
          }, { status: 500 });
        }
      }
    }
    
    logs.push(`✅ Migration completed: ${successCount} executed, ${skipCount} skipped`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Migration ${migration} completed successfully`,
      logs,
      successCount,
      skipCount
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Migration failed',
        logs: [`❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      },
      { status: 500 }
    );
  }
}