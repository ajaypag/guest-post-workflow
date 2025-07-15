import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Adding final polish columns to existing tables...');
    
    // Add missing columns to audit_sessions
    console.log('Adding columns to audit_sessions...');
    const sessionsColumns = [
      'audit_type VARCHAR(50) DEFAULT NULL',
      'total_proceed_steps INTEGER DEFAULT 0',
      'completed_proceed_steps INTEGER DEFAULT 0',
      'total_cleanup_steps INTEGER DEFAULT 0', 
      'completed_cleanup_steps INTEGER DEFAULT 0',
      'original_article TEXT',
      'research_outline TEXT'
    ];
    
    for (const column of sessionsColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE audit_sessions ADD COLUMN IF NOT EXISTS ${column}`));
        console.log(`✅ Added column: ${column}`);
      } catch (error) {
        console.log(`⚠️ Column might already exist: ${column}`, error instanceof Error ? error.message : error);
      }
    }
    
    // Add missing columns to audit_sections  
    console.log('Adding columns to audit_sections...');
    const sectionsColumns = [
      'proceed_content TEXT',
      'cleanup_content TEXT',
      'proceed_status VARCHAR(50) DEFAULT \'pending\'',
      'cleanup_status VARCHAR(50) DEFAULT \'pending\'',
      'brand_compliance_score INTEGER DEFAULT NULL'
    ];
    
    for (const column of sectionsColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE audit_sections ADD COLUMN IF NOT EXISTS ${column}`));
        console.log(`✅ Added column: ${column}`);
      } catch (error) {
        console.log(`⚠️ Column might already exist: ${column}`, error instanceof Error ? error.message : error);
      }
    }
    
    console.log('Final polish columns added successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Final polish columns added successfully',
      details: {
        sessionsColumnsAdded: sessionsColumns.length,
        sectionsColumnsAdded: sectionsColumns.length
      }
    });
    
  } catch (error) {
    console.error('Error adding final polish columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}