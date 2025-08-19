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
      if (migration === '0056_email_processing_infrastructure.sql') {
        // Execute each CREATE TABLE statement separately for migration 56
        logs.push(`📝 Creating tables one by one...`);
        
        // Table 1: email_processing_logs
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS email_processing_logs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              webhook_id VARCHAR(255),
              campaign_id VARCHAR(255),
              campaign_name VARCHAR(255),
              campaign_type VARCHAR(50),
              email_from VARCHAR(255) NOT NULL,
              email_to VARCHAR(255),
              email_subject VARCHAR(500),
              email_message_id VARCHAR(255),
              received_at TIMESTAMP,
              raw_content TEXT NOT NULL,
              html_content TEXT,
              parsed_data JSONB DEFAULT '{}',
              confidence_score DECIMAL(3,2),
              parsing_errors TEXT[],
              status VARCHAR(50) DEFAULT 'pending',
              error_message TEXT,
              processed_at TIMESTAMP,
              processing_duration_ms INTEGER,
              thread_id VARCHAR(255),
              reply_count INTEGER DEFAULT 0,
              is_auto_reply BOOLEAN DEFAULT FALSE,
              original_outreach_id UUID REFERENCES email_processing_logs(id),
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          `);
          logs.push(`  ✅ email_processing_logs created`);
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            logs.push(`  ⏭️ email_processing_logs already exists`);
          } else throw e;
        }
        
        // Table 2: email_review_queue
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS email_review_queue (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              log_id UUID REFERENCES email_processing_logs(id) ON DELETE CASCADE,
              publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
              priority INTEGER DEFAULT 50,
              status VARCHAR(50) DEFAULT 'pending',
              queue_reason VARCHAR(100),
              suggested_actions JSONB DEFAULT '{}',
              missing_fields TEXT[],
              review_notes TEXT,
              corrections_made JSONB DEFAULT '{}',
              assigned_to UUID REFERENCES users(id),
              reviewed_by UUID REFERENCES users(id),
              reviewed_at TIMESTAMP,
              auto_approve_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          `);
          logs.push(`  ✅ email_review_queue created`);
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            logs.push(`  ⏭️ email_review_queue already exists`);
          } else throw e;
        }
        
        // Table 3: publisher_automation_logs
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS publisher_automation_logs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email_log_id UUID REFERENCES email_processing_logs(id),
              publisher_id UUID REFERENCES publishers(id),
              action VARCHAR(100) NOT NULL,
              action_status VARCHAR(50) DEFAULT 'success',
              previous_data JSONB,
              new_data JSONB,
              fields_updated TEXT[],
              confidence DECIMAL(3,2),
              match_method VARCHAR(50),
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP DEFAULT NOW()
            )
          `);
          logs.push(`  ✅ publisher_automation_logs created`);
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            logs.push(`  ⏭️ publisher_automation_logs already exists`);
          } else throw e;
        }
        
        // Table 4: shadow_publisher_websites
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS shadow_publisher_websites (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              publisher_id UUID REFERENCES publishers(id) NOT NULL,
              website_id UUID REFERENCES websites(id) NOT NULL,
              confidence DECIMAL(3,2),
              source VARCHAR(50),
              extraction_method VARCHAR(100),
              verified BOOLEAN DEFAULT FALSE,
              verified_by UUID REFERENCES users(id),
              verified_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT NOW(),
              CONSTRAINT unique_shadow_publisher_website UNIQUE(publisher_id, website_id)
            )
          `);
          logs.push(`  ✅ shadow_publisher_websites created`);
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            logs.push(`  ⏭️ shadow_publisher_websites already exists`);
          } else throw e;
        }
        
        // Create indexes (ignore errors, they might exist)
        logs.push(`📝 Creating indexes...`);
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_processing_logs(status)',
          'CREATE INDEX IF NOT EXISTS idx_email_logs_email_from ON email_processing_logs(LOWER(email_from))',
          'CREATE INDEX IF NOT EXISTS idx_review_queue_status ON email_review_queue(status)',
          'CREATE INDEX IF NOT EXISTS idx_automation_logs_publisher ON publisher_automation_logs(publisher_id)',
        ];
        
        for (const idx of indexes) {
          try {
            await db.execute(sql.raw(idx));
          } catch (e) {
            // Ignore index errors
          }
        }
        logs.push(`  ✅ Indexes created`);
        
      } else {
        // For migration 55, execute in parts
        logs.push(`📝 Adding shadow publisher columns...`);
        
        const alterStatements = [
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'unclaimed'`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255)`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP`,
          `ALTER TABLE publishers ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2)`,
        ];
        
        for (const stmt of alterStatements) {
          try {
            await db.execute(sql.raw(stmt));
          } catch (e: any) {
            if (!e.message?.includes('already exists')) {
              logs.push(`  ⚠️ Column may already exist`);
            }
          }
        }
        logs.push(`  ✅ Shadow publisher columns added`);
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