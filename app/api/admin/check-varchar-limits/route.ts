import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const analysis: any = {
      timestamp: new Date().toISOString(),
      findings: [],
      recommendations: [],
      tableAnalysis: {}
    };

    // Check formatting_qa_checks table specifically
    const formattingQaChecksColumns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'formatting_qa_checks'
      AND data_type = 'character varying'
      ORDER BY ordinal_position
    `);

    analysis.tableAnalysis.formatting_qa_checks = {
      varcharColumns: formattingQaChecksColumns.rows
    };

    // Check for potentially problematic columns
    const problematicColumns = formattingQaChecksColumns.rows.filter((col: any) => {
      const length = col.character_maximum_length;
      const columnName = col.column_name;
      
      // These columns might need more space for AI-generated content
      const aiGeneratedColumns = ['check_description', 'issues_found', 'location_details', 'fix_suggestions'];
      
      if (aiGeneratedColumns.includes(columnName) && length && length < 500) {
        return true;
      }
      
      // Check for very short limits that might cause issues
      if (length && length < 100 && columnName !== 'check_type' && columnName !== 'status') {
        return true;
      }
      
      return false;
    });

    if (problematicColumns.length > 0) {
      analysis.findings.push({
        severity: 'HIGH',
        table: 'formatting_qa_checks',
        issue: 'VARCHAR columns may be too short for AI-generated content',
        columns: problematicColumns.map((col: any) => ({
          name: col.column_name,
          currentLength: col.character_maximum_length,
          recommended: col.column_name === 'check_type' ? 255 : 
                      col.column_name === 'status' ? 50 : 
                      ['check_description', 'issues_found', 'location_details', 'fix_suggestions'].includes(col.column_name) ? 2000 : 1000
        }))
      });
    }

    // Check other related tables
    const otherTables = ['formatting_qa_sessions', 'audit_sections', 'polish_sections'];
    
    for (const tableName of otherTables) {
      try {
        const tableColumns = await db.execute(sql`
          SELECT 
            column_name,
            data_type,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          AND data_type = 'character varying'
          ORDER BY ordinal_position
        `);

        analysis.tableAnalysis[tableName] = {
          varcharColumns: tableColumns.rows
        };

        // Check for short VARCHAR columns in these tables too
        const shortColumns = tableColumns.rows.filter((col: any) => {
          const length = col.character_maximum_length;
          const columnName = col.column_name;
          
          // Skip ID and enum-type columns
          if (columnName.includes('_id') || columnName === 'status' || columnName === 'step_id') {
            return false;
          }
          
          return length && length < 500;
        });

        if (shortColumns.length > 0) {
          analysis.findings.push({
            severity: 'MEDIUM',
            table: tableName,
            issue: 'VARCHAR columns may be too short',
            columns: shortColumns.map((col: any) => ({
              name: col.column_name,
              currentLength: col.character_maximum_length
            }))
          });
        }
      } catch (e) {
        // Table might not exist
      }
    }

    // Generate recommendations
    if (analysis.findings.length > 0) {
      analysis.recommendations.push({
        priority: 'HIGH',
        action: 'Increase VARCHAR column sizes for AI-generated content',
        details: 'The formatting QA feature generates longer text than current column limits allow',
        suggestedSizes: {
          'check_description': 'TEXT or VARCHAR(2000)',
          'issues_found': 'TEXT or VARCHAR(2000)', 
          'location_details': 'TEXT or VARCHAR(2000)',
          'fix_suggestions': 'TEXT or VARCHAR(2000)',
          'check_type': 'VARCHAR(255)',
          'status': 'VARCHAR(50)'
        }
      });
    }

    // Add migration SQL suggestions
    const migrationSql = [];
    
    for (const finding of analysis.findings) {
      if (finding.table === 'formatting_qa_checks') {
        for (const col of finding.columns) {
          const newSize = col.recommended;
          const dataType = newSize > 1000 ? 'TEXT' : `VARCHAR(${newSize})`;
          migrationSql.push(`ALTER TABLE formatting_qa_checks ALTER COLUMN ${col.name} TYPE ${dataType};`);
        }
      }
    }

    analysis.migrationSql = migrationSql;

    return NextResponse.json(analysis, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'VARCHAR analysis failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'fix_varchar_sizes') {
      const results = [];
      
      // Fix the most common problematic columns
      const fixes = [
        { column: 'check_description', type: 'TEXT' },
        { column: 'issues_found', type: 'TEXT' },
        { column: 'location_details', type: 'TEXT' },
        { column: 'fix_suggestions', type: 'TEXT' }
      ];
      
      for (const fix of fixes) {
        try {
          await db.execute(sql`
            ALTER TABLE formatting_qa_checks 
            ALTER COLUMN ${sql.raw(fix.column)} TYPE ${sql.raw(fix.type)}
          `);
          results.push({ 
            column: fix.column, 
            success: true, 
            message: `Changed to ${fix.type}` 
          });
        } catch (error: any) {
          results.push({ 
            column: fix.column, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'VARCHAR column fixes applied',
        results
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'VARCHAR fix failed',
      details: error.message
    }, { status: 500 });
  }
}