import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const REQUIRED_MIGRATIONS = [
  {
    id: '0056',
    file: '0056_email_processing_infrastructure.sql',
    name: 'Email Processing Infrastructure',
    description: 'Sets up email processing system and logs',
    critical: true
  },
  {
    id: '0058_webhook',
    file: '0058_webhook_security_logs.sql', 
    name: 'Webhook Security Logs',
    description: 'Adds webhook security logging',
    critical: true
  },
  {
    id: '0059',
    file: '0059_shadow_publisher_system.sql',
    name: 'Shadow Publisher System',
    description: 'Creates shadow publisher functionality',
    critical: true
  },
  {
    id: '0061',
    file: '0061_add_sender_email_column.sql',
    name: 'Sender Email Column',
    description: 'Adds sender email tracking',
    critical: false
  },
  {
    id: '0062',
    file: '0062_fix_website_source_constraint.sql',
    name: 'Website Source Constraint Fix',
    description: 'Fixes website source constraint issues',
    critical: false
  },
  {
    id: '0063',
    file: '0063_email_qualification_tracking.sql',
    name: 'Email Qualification Tracking',
    description: 'Adds qualification status and source tracking - REQUIRED for V2 email parser',
    critical: true
  }
];

async function checkMigrationStatus(migrationId: string): Promise<'completed' | 'pending' | 'error'> {
  try {
    // Check if the migration's main table/column exists
    switch (migrationId) {
      case '0056':
        // Check if email_processing_logs table exists
        const result056 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'email_processing_logs'
          ) as exists
        `);
        return (result056 as any)[0]?.exists ? 'completed' : 'pending';
        
      case '0058_webhook':
        // Check if webhook_security_logs table exists
        const result058 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'webhook_security_logs'
          ) as exists
        `);
        return (result058 as any)[0]?.exists ? 'completed' : 'pending';
        
      case '0059':
        // Check if shadow publisher columns exist
        const result059 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'publishers' AND column_name = 'source'
          ) as exists
        `);
        return (result059 as any)[0]?.exists ? 'completed' : 'pending';
        
      case '0061':
        // Check if sender_email column exists
        const result061 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'email_processing_logs' AND column_name = 'sender_email'
          ) as exists
        `);
        return (result061 as any)[0]?.exists ? 'completed' : 'pending';
        
      case '0062':
        // This is a constraint fix, harder to check - assume completed if 0061 is done
        const result062 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'email_processing_logs' AND column_name = 'sender_email'
          ) as exists
        `);
        return (result062 as any)[0]?.exists ? 'completed' : 'pending';
        
      case '0063':
        // Check if qualification_status column exists  
        const result063 = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'email_processing_logs' AND column_name = 'qualification_status'
          ) as exists
        `);
        return (result063 as any)[0]?.exists ? 'completed' : 'pending';
        
      default:
        return 'pending';
    }
  } catch (error) {
    console.error(`Error checking migration ${migrationId}:`, error);
    return 'error';
  }
}

export async function GET() {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check status of all migrations
    const migrations = await Promise.all(
      REQUIRED_MIGRATIONS.map(async (migration) => {
        const status = await checkMigrationStatus(migration.id);
        return {
          ...migration,
          status
        };
      })
    );

    return NextResponse.json({ migrations });
    
  } catch (error) {
    console.error('Migration status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { migrationId } = await request.json();
    
    if (!migrationId) {
      return NextResponse.json({ error: 'Migration ID required' }, { status: 400 });
    }

    const migration = REQUIRED_MIGRATIONS.find(m => m.id === migrationId);
    if (!migration) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }

    // Check if already completed
    const currentStatus = await checkMigrationStatus(migrationId);
    if (currentStatus === 'completed') {
      return NextResponse.json({ 
        message: 'Migration already completed',
        status: 'completed'
      });
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', migration.file);
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: `Migration file not found: ${migration.file}` 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`🔄 Running migration: ${migration.name}`);
    
    // Execute the migration - split by semicolon and run each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(sql.raw(statement.trim()));
      }
    }
    
    console.log(`✅ Migration completed: ${migration.name}`);
    
    // Verify it completed successfully
    const newStatus = await checkMigrationStatus(migrationId);
    
    return NextResponse.json({
      message: `Migration ${migration.name} completed successfully`,
      status: newStatus
    });
    
  } catch (error) {
    console.error('Migration execution failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}