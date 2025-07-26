import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if the data source tracking fields exist
    const result = await db.execute(sql`
      SELECT 
        column_name,
        data_type 
      FROM information_schema.columns 
      WHERE 
        table_name = 'bulk_analysis_domains' 
        AND column_name IN (
          'has_dataforseo_results',
          'dataforseo_last_analyzed', 
          'ai_qualification_reasoning',
          'ai_qualified_at',
          'was_manually_qualified',
          'manually_qualified_by',
          'manually_qualified_at'
        )
    `);

    const existingColumns = result.rows.map(row => row.column_name);
    const expectedColumns = [
      'has_dataforseo_results',
      'dataforseo_last_analyzed',
      'ai_qualification_reasoning', 
      'ai_qualified_at',
      'was_manually_qualified',
      'manually_qualified_by',
      'manually_qualified_at'
    ];
    
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    const allFieldsExist = missingColumns.length === 0;

    return NextResponse.json({
      success: true,
      allFieldsExist,
      existingColumns,
      missingColumns,
      message: allFieldsExist 
        ? 'All data source tracking fields exist' 
        : `Missing fields: ${missingColumns.join(', ')}`
    });

  } catch (error: any) {
    console.error('Error checking data source fields:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check data source fields',
      allFieldsExist: false
    }, { status: 500 });
  }
}