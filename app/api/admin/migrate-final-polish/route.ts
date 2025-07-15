import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking final polish support status...');

    // Check if audit_type column exists (indicator of final polish support)
    const auditTypeExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions' 
      AND column_name = 'audit_type'
    `);

    // Check if proceed/cleanup columns exist
    const polishColumnsExist = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sections' 
      AND column_name IN ('proceed_content', 'cleanup_content', 'brand_compliance_score')
    `);

    const hasAuditType = (auditTypeExists as unknown as any[]).length > 0;
    const hasPolishColumns = (polishColumnsExist as unknown as any[]).length >= 3;
    const isFullySupported = hasAuditType && hasPolishColumns;

    return NextResponse.json({
      success: true,
      supported: isFullySupported,
      details: isFullySupported ? {
        auditTypeSupported: hasAuditType,
        polishColumnsSupported: hasPolishColumns,
        newFeatures: [
          'audit_type column for workflow differentiation',
          'proceed/cleanup progress tracking',
          'brand compliance scoring',
          'two-prompt workflow support'
        ]
      } : {
        auditTypeSupported: hasAuditType,
        polishColumnsSupported: hasPolishColumns,
        missing: 'Final polish support columns not fully configured'
      }
    });

  } catch (error) {
    console.error('Error checking final polish status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check server logs for full error details'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('Starting final polish database migration...');

    // Add new columns to audit_sessions table for final polish support
    console.log('Adding polish-specific columns to audit_sessions...');
    
    // Check if auditType column exists
    const auditTypeExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions' 
      AND column_name = 'audit_type'
    `);

    if ((auditTypeExists as unknown as any[]).length === 0) {
      await db.execute(sql`
        ALTER TABLE audit_sessions 
        ADD COLUMN audit_type VARCHAR(50) DEFAULT 'semantic_seo'
      `);
      console.log('✅ Added audit_type column');
    } else {
      console.log('✅ audit_type column already exists');
    }

    // Check and add proceed/cleanup progress columns
    const proceedColumnsExist = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions' 
      AND column_name IN ('total_proceed_steps', 'completed_proceed_steps', 'total_cleanup_steps', 'completed_cleanup_steps')
    `);

    if ((proceedColumnsExist as unknown as any[]).length < 4) {
      await db.execute(sql`
        ALTER TABLE audit_sessions 
        ADD COLUMN IF NOT EXISTS total_proceed_steps INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_proceed_steps INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_cleanup_steps INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_cleanup_steps INTEGER DEFAULT 0
      `);
      console.log('✅ Added proceed/cleanup progress columns');
    } else {
      console.log('✅ Proceed/cleanup progress columns already exist');
    }

    // Add new columns to audit_sections table for final polish support
    console.log('Adding polish-specific columns to audit_sections...');
    
    const polishColumnsExist = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sections' 
      AND column_name IN ('proceed_content', 'cleanup_content', 'proceed_status', 'cleanup_status', 'brand_compliance_score')
    `);

    if ((polishColumnsExist as unknown as any[]).length < 5) {
      await db.execute(sql`
        ALTER TABLE audit_sections 
        ADD COLUMN IF NOT EXISTS proceed_content TEXT,
        ADD COLUMN IF NOT EXISTS cleanup_content TEXT,
        ADD COLUMN IF NOT EXISTS proceed_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS cleanup_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS brand_compliance_score INTEGER
      `);
      console.log('✅ Added polish-specific section columns');
    } else {
      console.log('✅ Polish-specific section columns already exist');
    }

    // Verify the migration
    console.log('Verifying migration...');
    
    const sessionColumns = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions' 
      ORDER BY ordinal_position
    `);

    const sectionColumns = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sections' 
      ORDER BY ordinal_position
    `);

    console.log('audit_sessions columns:', (sessionColumns as unknown as any[]).length);
    console.log('audit_sections columns:', (sectionColumns as unknown as any[]).length);

    // Test table access
    const testSession = await db.execute(sql`SELECT COUNT(*) as count FROM audit_sessions LIMIT 1`);
    const testSection = await db.execute(sql`SELECT COUNT(*) as count FROM audit_sections LIMIT 1`);
    
    console.log('✅ Tables are accessible');
    console.log(`audit_sessions has ${(testSession as any)[0]?.count || 0} records`);
    console.log(`audit_sections has ${(testSection as any)[0]?.count || 0} records`);

    return NextResponse.json({
      success: true,
      message: 'Final polish database migration completed successfully',
      details: {
        sessionColumns: (sessionColumns as unknown as any[]).length,
        sectionColumns: (sectionColumns as unknown as any[]).length,
        newFeatures: [
          'audit_type column for workflow differentiation',
          'proceed/cleanup progress tracking',
          'brand compliance scoring',
          'two-prompt workflow support'
        ]
      }
    });

  } catch (error) {
    console.error('Final polish migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown migration error',
      details: 'Check server logs for full error details'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('Starting final polish rollback...');

    // Remove final polish specific columns from audit_sessions
    console.log('Removing polish-specific columns from audit_sessions...');
    
    await db.execute(sql`
      ALTER TABLE audit_sessions 
      DROP COLUMN IF EXISTS audit_type,
      DROP COLUMN IF EXISTS total_proceed_steps,
      DROP COLUMN IF EXISTS completed_proceed_steps,
      DROP COLUMN IF EXISTS total_cleanup_steps,
      DROP COLUMN IF EXISTS completed_cleanup_steps
    `);
    console.log('✅ Removed polish session columns');

    // Remove final polish specific columns from audit_sections
    console.log('Removing polish-specific columns from audit_sections...');
    
    await db.execute(sql`
      ALTER TABLE audit_sections 
      DROP COLUMN IF EXISTS proceed_content,
      DROP COLUMN IF EXISTS cleanup_content,
      DROP COLUMN IF EXISTS proceed_status,
      DROP COLUMN IF EXISTS cleanup_status,
      DROP COLUMN IF EXISTS brand_compliance_score
    `);
    console.log('✅ Removed polish section columns');

    // Verify rollback
    console.log('Verifying rollback...');
    
    const sessionColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sessions' 
      ORDER BY ordinal_position
    `);

    const sectionColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_sections' 
      ORDER BY ordinal_position
    `);

    console.log('audit_sessions columns after rollback:', (sessionColumns as unknown as any[]).length);
    console.log('audit_sections columns after rollback:', (sectionColumns as unknown as any[]).length);

    return NextResponse.json({
      success: true,
      message: 'Final polish support rollback completed successfully',
      details: {
        sessionColumns: (sessionColumns as unknown as any[]).length,
        sectionColumns: (sectionColumns as unknown as any[]).length,
        removedFeatures: [
          'audit_type column removed',
          'proceed/cleanup progress tracking removed',
          'brand compliance scoring removed',
          'two-prompt workflow support removed'
        ]
      }
    });

  } catch (error) {
    console.error('Final polish rollback error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown rollback error',
      details: 'Check server logs for full error details'
    }, { status: 500 });
  }
}