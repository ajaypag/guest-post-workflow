import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check current column types
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'v2_agent_sessions'
      AND data_type = 'character varying'
      ORDER BY ordinal_position;
    `);
    
    const varcharColumns = columns.rows.map((col: any) => ({
      name: col.column_name,
      currentType: `VARCHAR(${col.character_maximum_length})`,
      recommendedFix: shouldConvertToText(col.column_name) ? 'TEXT' : null
    })).filter((col: any) => col.recommendedFix);
    
    return NextResponse.json({
      varcharColumns,
      needsFix: varcharColumns.length > 0,
      message: varcharColumns.length > 0 
        ? `Found ${varcharColumns.length} columns that should be converted to TEXT`
        : 'All columns are properly sized'
    });
    
  } catch (error: any) {
    console.error('Error checking V2 columns:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing V2 column sizes...');
    
    // Convert any VARCHAR columns that might store AI content to TEXT
    const fixes = [
      // These columns might store AI-generated content or long text
      { column: 'outline', type: 'TEXT' },
      { column: 'final_article', type: 'TEXT' },
      { column: 'error_message', type: 'TEXT' }
    ];
    
    let fixedCount = 0;
    
    for (const fix of fixes) {
      try {
        // Check if column exists and is VARCHAR
        const checkResult = await db.execute(sql`
          SELECT data_type 
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'v2_agent_sessions'
          AND column_name = ${fix.column};
        `);
        
        if (checkResult.rows[0]?.data_type === 'character varying') {
          // Convert to TEXT
          await db.execute(sql`
            ALTER TABLE v2_agent_sessions 
            ALTER COLUMN ${sql.identifier(fix.column)} TYPE TEXT;
          `);
          
          console.log(`✅ Converted ${fix.column} to TEXT`);
          fixedCount++;
        }
      } catch (colError) {
        console.warn(`Could not fix column ${fix.column}:`, colError);
      }
    }
    
    // Also ensure status and step_id are adequate size
    const varcharFixes = [
      { column: 'status', minSize: 50 },
      { column: 'step_id', minSize: 50 }
    ];
    
    for (const fix of varcharFixes) {
      try {
        const checkResult = await db.execute(sql`
          SELECT character_maximum_length 
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'v2_agent_sessions'
          AND column_name = ${fix.column}
          AND data_type = 'character varying';
        `);
        
        const currentSize = Number(checkResult.rows[0]?.character_maximum_length);
        if (currentSize && currentSize < fix.minSize) {
          await db.execute(sql`
            ALTER TABLE v2_agent_sessions 
            ALTER COLUMN ${sql.identifier(fix.column)} TYPE VARCHAR(${fix.minSize});
          `);
          
          console.log(`✅ Expanded ${fix.column} to VARCHAR(${fix.minSize})`);
          fixedCount++;
        }
      } catch (colError) {
        console.warn(`Could not fix column ${fix.column}:`, colError);
      }
    }
    
    return NextResponse.json({ 
      success: true,
      fixedCount,
      message: `Fixed ${fixedCount} column(s) in v2_agent_sessions table`
    });
    
  } catch (error: any) {
    console.error('Error fixing V2 columns:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

function shouldConvertToText(columnName: string): boolean {
  // Columns that might store AI-generated content should be TEXT
  const textColumns = ['outline', 'final_article', 'error_message'];
  return textColumns.includes(columnName);
}