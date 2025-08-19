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
    
    // Special handling for migration 56 which might already be partially applied
    if (migration === '0056_email_processing_infrastructure.sql') {
      // Check if main tables already exist
      const tableCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_processing_logs'
      `);
      
      if (parseInt(tableCheck.rows[0]?.count as string || '0') > 0) {
        logs.push(`✅ Tables already exist - migration 56 already applied`);
        return NextResponse.json({ 
          success: true, 
          message: 'Migration already applied',
          logs
        });
      }
    }
    
    // Read the migration file
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const filePath = path.join(migrationsDir, migration);
    
    const content = await fs.readFile(filePath, 'utf-8');
    logs.push(`📄 File loaded: ${content.length} characters`);
    
    // Execute the migration
    logs.push(`🔍 Executing migration...`);
    
    try {
      // For migration 56, we need to handle the PL/pgSQL function separately
      if (migration === '0056_email_processing_infrastructure.sql') {
        // Split at the function definition
        const parts = content.split('-- Step 10:');
        const mainPart = parts[0];
        const functionPart = parts[1] ? '-- Step 10:' + parts[1] : '';
        
        // Execute main part
        logs.push(`📝 Creating tables and indexes...`);
        await db.execute(sql.raw(mainPart));
        logs.push(`✅ Tables created successfully`);
        
        // Try to execute function part if it exists
        if (functionPart) {
          try {
            logs.push(`📝 Creating auto-approval function...`);
            await db.execute(sql.raw(functionPart));
            logs.push(`✅ Function created successfully`);
          } catch (funcError: any) {
            logs.push(`⚠️  Function creation skipped (may already exist)`);
          }
        }
      } else {
        // For migration 55, execute normally
        await db.execute(sql.raw(content));
      }
      
      logs.push(`✅ Migration completed successfully`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Migration ${migration} completed successfully`,
        logs
      });
      
    } catch (dbError: any) {
      // Check if it's just "already exists" errors
      if (dbError.message?.includes('already exists') || 
          dbError.message?.includes('duplicate key')) {
        logs.push(`⏭️  Migration skipped (tables/columns already exist)`);
        logs.push(`✅ Migration already applied`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Migration already applied',
          logs
        });
      } else {
        logs.push(`❌ Migration failed: ${dbError.message}`);
        return NextResponse.json({ 
          success: false,
          error: dbError.message,
          logs
        }, { status: 500 });
      }
    }

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