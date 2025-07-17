import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Diagnosing outline generation issues...');

    const diagnosis: any = {
      timestamp: new Date().toISOString(),
      schema: {
        tableExists: false,
        columns: []
      },
      columnIssues: [],
      sampleSessions: [],
      recommendations: []
    };

    // Check if table exists
    try {
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'outline_sessions'
        ) as table_exists
      `);
      
      diagnosis.schema.tableExists = tableCheck.rows[0]?.table_exists || false;
      
      if (diagnosis.schema.tableExists) {
        // Get column info
        const columns = await db.execute(sql`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'outline_sessions'
          ORDER BY ordinal_position
        `);
        
        diagnosis.schema.columns = columns.rows;
        
        // Check for column size issues
        columns.rows.forEach((col: any) => {
          // AI-generated content columns should be TEXT or large VARCHAR
          const aiContentColumns = [
            'outline_prompt', 
            'clarification_answers', 
            'final_outline', 
            'error_message'
          ];
          
          if (aiContentColumns.includes(col.column_name)) {
            if (col.data_type === 'character varying' && col.character_maximum_length < 255) {
              diagnosis.columnIssues.push({
                column: col.column_name,
                issue: 'VARCHAR size too small for AI-generated content',
                current: `VARCHAR(${col.character_maximum_length})`,
                recommended: 'TEXT'
              });
            }
          }
          
          // Status columns can be smaller
          if (col.column_name === 'status' && col.data_type === 'character varying') {
            if (col.character_maximum_length !== 50) {
              diagnosis.columnIssues.push({
                column: col.column_name,
                issue: 'Status column size not optimal',
                current: `VARCHAR(${col.character_maximum_length})`,
                recommended: 'VARCHAR(50)'
              });
            }
          }
        });
        
        // Get sample sessions
        try {
          const sessions = await db.select()
            .from(outlineSessions)
            .orderBy(desc(outlineSessions.createdAt))
            .limit(5);
            
          diagnosis.sampleSessions = sessions;
        } catch (err) {
          console.error('Error fetching sample sessions:', err);
        }
      } else {
        diagnosis.recommendations.push(
          'Table does not exist. Run migration from /admin/database-migration'
        );
      }
    } catch (dbError: any) {
      console.error('Database check error:', dbError);
      diagnosis.error = dbError.message;
    }

    // Generate recommendations
    if (diagnosis.columnIssues.length > 0) {
      diagnosis.recommendations.push(
        'Column size issues detected. Click "Fix Column Sizes" to resolve.'
      );
    }
    
    if (diagnosis.schema.tableExists && diagnosis.columnIssues.length === 0) {
      diagnosis.recommendations.push(
        'Schema looks good. If experiencing issues, try "Test AI Insert" to verify.'
      );
    }

    console.log('✅ Diagnosis completed');

    return NextResponse.json(diagnosis);

  } catch (error: any) {
    console.error('❌ Diagnosis error:', error);
    
    return NextResponse.json({
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}