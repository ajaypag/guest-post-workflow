import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🔧 Fixing outline generation column sizes...');

    const fixes = [
      { 
        column: 'outline_prompt', 
        type: 'TEXT',
        reason: 'AI outline prompts can be very long' 
      },
      { 
        column: 'clarification_answers', 
        type: 'TEXT',
        reason: 'User answers to clarification questions' 
      },
      { 
        column: 'final_outline', 
        type: 'TEXT',
        reason: 'Complete AI-generated outlines are lengthy' 
      },
      { 
        column: 'error_message', 
        type: 'TEXT',
        reason: 'Error messages and stack traces' 
      }
    ];

    const results = [];

    for (const fix of fixes) {
      try {
        console.log(`🔄 Fixing column: ${fix.column} → ${fix.type}`);
        
        await db.execute(sql`
          ALTER TABLE outline_sessions 
          ALTER COLUMN ${sql.identifier(fix.column)} TYPE ${sql.raw(fix.type)}
        `);
        
        results.push({
          column: fix.column,
          success: true,
          message: `Changed to ${fix.type}`
        });
        
        console.log(`✅ Fixed ${fix.column}`);
      } catch (error: any) {
        console.error(`❌ Failed to fix ${fix.column}:`, error);
        
        results.push({
          column: fix.column,
          success: false,
          error: error.message
        });
      }
    }

    // Verify the changes
    const verifyQuery = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'outline_sessions'
        AND column_name IN ('outline_prompt', 'clarification_answers', 'final_outline', 'error_message')
      ORDER BY ordinal_position
    `);

    console.log('✅ Column size fixes completed');

    return NextResponse.json({
      success: true,
      fixes: results,
      verification: verifyQuery.rows
    });

  } catch (error: any) {
    console.error('❌ Column fix error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}