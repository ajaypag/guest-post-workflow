import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking column sizes for all varchar columns...');
    
    // Get all varchar columns and their sizes
    const columnInfo = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('polish_sessions', 'polish_sections', 'audit_sessions', 'audit_sections')
      AND (data_type = 'character varying' OR data_type LIKE 'varchar%')
      ORDER BY table_name, ordinal_position
    `);
    
    // Format the results for easy copying
    const formattedResults = (columnInfo as any).rows?.map((col: any) => ({
      table: col.table_name,
      column: col.column_name,
      type: col.data_type,
      max_length: col.character_maximum_length,
      nullable: col.is_nullable,
      default: col.column_default
    })) || columnInfo;
    
    // Group by table
    const byTable: Record<string, any[]> = {};
    formattedResults.forEach((col: any) => {
      if (!byTable[col.table]) byTable[col.table] = [];
      byTable[col.table].push(col);
    });
    
    // Create a text summary
    let textSummary = "=== VARCHAR COLUMN SIZES ===\n\n";
    
    Object.entries(byTable).forEach(([table, columns]) => {
      textSummary += `TABLE: ${table}\n`;
      textSummary += "─".repeat(50) + "\n";
      columns.forEach((col: any) => {
        textSummary += `  ${col.column}: varchar(${col.max_length || 'unlimited'})\n`;
      });
      textSummary += "\n";
    });
    
    // Check specific problematic columns
    textSummary += "=== SPECIFIC COLUMNS TO CHECK ===\n\n";
    
    const problemColumns = [
      { table: 'polish_sections', column: 'polish_approach', expected: 255 },
      { table: 'polish_sections', column: 'title', expected: 500 },
      { table: 'audit_sections', column: 'editing_pattern', expected: 100 },
      { table: 'audit_sections', column: 'title', expected: 255 }
    ];
    
    for (const check of problemColumns) {
      const result = formattedResults.find((col: any) => 
        col.table === check.table && col.column === check.column
      );
      
      if (result) {
        const status = result.max_length >= check.expected ? "✅ OK" : "❌ TOO SMALL";
        textSummary += `${check.table}.${check.column}: varchar(${result.max_length}) - Expected: varchar(${check.expected}) ${status}\n`;
      } else {
        textSummary += `${check.table}.${check.column}: NOT FOUND\n`;
      }
    }
    
    // Return both JSON and text
    return new NextResponse(textSummary, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
    
  } catch (error: any) {
    console.error('Error checking column sizes:', error);
    return NextResponse.json({
      error: 'Failed to check column sizes',
      details: error.message
    }, { status: 500 });
  }
}