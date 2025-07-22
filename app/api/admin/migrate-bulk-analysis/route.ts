import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    // Check if bulk_analysis_domains table exists
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bulk_analysis_domains'
      );
    `);
    
    const exists = result.rows[0]?.exists || false;
    
    if (exists) {
      // Get count of domains
      const countResult = await db.execute(`
        SELECT COUNT(*) as count FROM bulk_analysis_domains;
      `);
      
      return NextResponse.json({
        exists: true,
        domainCount: parseInt((countResult.rows[0] as any)?.count || '0'),
        message: 'Bulk analysis domains table exists'
      });
    }
    
    return NextResponse.json({
      exists: false,
      message: 'Bulk analysis domains table does not exist'
    });
    
  } catch (error: any) {
    console.error('❌ Error checking bulk analysis table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check table status', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating bulk analysis domains table...');
    
    // Create the bulk_analysis_domains table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bulk_analysis_domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        qualification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        target_page_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        keyword_count INTEGER DEFAULT 0,
        checked_by UUID REFERENCES users(id),
        checked_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_id 
      ON bulk_analysis_domains(client_id);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_domain 
      ON bulk_analysis_domains(domain);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bulk_analysis_domains_status 
      ON bulk_analysis_domains(qualification_status);
    `);
    
    // Create unique constraint to prevent duplicate domains per client
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_analysis_domains_client_domain 
      ON bulk_analysis_domains(client_id, domain);
    `);
    
    console.log('✅ Bulk analysis domains table created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Bulk analysis domains table created successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const confirmParam = request.nextUrl.searchParams.get('confirm');
    
    if (confirmParam !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add ?confirm=true to proceed.' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Removing bulk analysis domains table...');
    
    // Drop indexes first
    await db.execute(`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_domain;
    `);
    
    await db.execute(`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_status;
    `);
    
    await db.execute(`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_domain;
    `);
    
    await db.execute(`
      DROP INDEX IF EXISTS idx_bulk_analysis_domains_client_id;
    `);
    
    // Drop the table
    await db.execute(`
      DROP TABLE IF EXISTS bulk_analysis_domains CASCADE;
    `);
    
    console.log('✅ Bulk analysis domains table removed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Bulk analysis domains table removed successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Rollback error:', error);
    
    return NextResponse.json(
      { 
        error: 'Rollback failed', 
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}