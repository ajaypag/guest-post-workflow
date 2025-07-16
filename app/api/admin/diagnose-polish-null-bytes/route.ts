import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { polishSessions, polishSections } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      databaseInfo: {
        tableExists: false,
        columnInfo: {} as any,
        sampleData: [] as any[]
      },
      nullByteAnalysis: {
        affectedSessions: [] as any[],
        affectedSections: [] as any[],
        totalAffectedRecords: 0,
        sampleProblematicData: [] as any[]
      },
      characterAnalysis: {
        controlCharacters: [] as any[],
        unicodeIssues: [] as any[]
      },
      recommendations: [] as string[],
      testResults: {
        canInsertCleanData: false,
        canUpdateWithNullBytes: false,
        postgresError: null as string | null
      }
    };

    // Check if tables exist
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sessions'
      ) as exists
    `);
    
    diagnostics.databaseInfo.tableExists = tableCheck.rows[0].exists as boolean;

    if (!diagnostics.databaseInfo.tableExists) {
      diagnostics.recommendations.push('Polish tables do not exist. Run migration first.');
      return NextResponse.json({ success: false, diagnostics });
    }

    // Get column information
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'polish_sessions'
      ORDER BY ordinal_position
    `);

    diagnostics.databaseInfo.columnInfo = columnInfo.rows.reduce((acc: any, col: any) => {
      acc[col.column_name] = {
        type: col.data_type,
        maxLength: col.character_maximum_length,
        nullable: col.is_nullable === 'YES'
      };
      return acc;
    }, {});

    // Check for null bytes in polish_metadata - use bytea conversion to avoid UTF8 errors
    const nullByteCheck = await db.execute(sql`
      SELECT 
        id,
        workflow_id,
        version,
        status,
        LENGTH(polish_metadata::text) as metadata_length,
        POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) as null_byte_position,
        CASE 
          WHEN POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) > 0 
          THEN 'Contains null bytes - cannot display'
          ELSE LEFT(polish_metadata::text, 200)
        END as sample_data
      FROM polish_sessions
      WHERE polish_metadata IS NOT NULL
    `);

    // Analyze results
    for (const row of nullByteCheck.rows) {
      if ((row.null_byte_position as number) > 0) {
        diagnostics.nullByteAnalysis.affectedSessions.push({
          sessionId: row.id as string,
          workflowId: row.workflow_id as string,
          version: row.version as number,
          status: row.status as string,
          nullBytePosition: row.null_byte_position as number,
          metadataLength: row.metadata_length as number,
          sampleData: row.sample_data as string
        });
      }
    }

    // Check polish_sections for similar issues - use bytea conversion to avoid UTF8 errors
    const sectionsCheck = await db.execute(sql`
      SELECT 
        id,
        polish_session_id,
        section_number,
        title,
        LENGTH(original_content) as original_length,
        LENGTH(polished_content) as polished_length,
        POSITION('\\x00'::bytea IN CAST(COALESCE(original_content, '') AS bytea)) as orig_null_pos,
        POSITION('\\x00'::bytea IN CAST(COALESCE(polished_content, '') AS bytea)) as polish_null_pos
      FROM polish_sections
      WHERE original_content IS NOT NULL OR polished_content IS NOT NULL
    `);

    for (const row of sectionsCheck.rows) {
      if ((row.orig_null_pos as number) > 0 || (row.polish_null_pos as number) > 0) {
        diagnostics.nullByteAnalysis.affectedSections.push({
          sectionId: row.id as string,
          sessionId: row.polish_session_id as string,
          sectionNumber: row.section_number as number,
          title: row.title as string,
          hasNullInOriginal: (row.orig_null_pos as number) > 0,
          hasNullInPolished: (row.polish_null_pos as number) > 0
        });
      }
    }

    diagnostics.nullByteAnalysis.totalAffectedRecords = 
      diagnostics.nullByteAnalysis.affectedSessions.length + 
      diagnostics.nullByteAnalysis.affectedSections.length;

    // Check for other problematic control characters - safer query
    const controlCharCheck = await db.execute(sql`
      SELECT 
        id,
        CASE 
          WHEN POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) > 0
          THEN 'Contains null bytes - cannot process'
          ELSE regexp_replace(polish_metadata::text, '[\x01-\x1F]', '<CTRL>', 'g')
        END as cleaned_sample,
        CASE
          WHEN POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) > 0
          THEN -1
          ELSE LENGTH(polish_metadata::text) - LENGTH(regexp_replace(polish_metadata::text, '[\x01-\x1F]', '', 'g'))
        END as control_char_count
      FROM polish_sessions
      WHERE polish_metadata IS NOT NULL
      LIMIT 5
    `);

    diagnostics.characterAnalysis.controlCharacters = controlCharCheck.rows.map((row: any) => ({
      sessionId: row.id as string,
      controlCharCount: row.control_char_count as number,
      cleanedSample: (row.cleaned_sample as string).substring(0, 100)
    }));

    // Test if we can insert clean data
    try {
      await db.execute(sql`
        INSERT INTO polish_sessions (id, workflow_id, version, status, polish_metadata, created_at, updated_at)
        VALUES (
          'test-' || gen_random_uuid(),
          'test-workflow',
          999,
          'test',
          '{"test": "clean data without null bytes"}',
          NOW(),
          NOW()
        )
      `);
      diagnostics.testResults.canInsertCleanData = true;
      
      // Clean up test
      await db.execute(sql`DELETE FROM polish_sessions WHERE workflow_id = 'test-workflow'`);
    } catch (error: any) {
      diagnostics.testResults.canInsertCleanData = false;
      diagnostics.testResults.postgresError = error.message;
    }

    // Test if null bytes cause failure
    try {
      await db.execute(sql`
        INSERT INTO polish_sessions (id, workflow_id, version, status, polish_metadata, created_at, updated_at)
        VALUES (
          'test-null-' || gen_random_uuid(),
          'test-null-workflow',
          998,
          'test',
          '{"test": "data with null byte: \u0000"}',
          NOW(),
          NOW()
        )
      `);
      diagnostics.testResults.canUpdateWithNullBytes = true;
      await db.execute(sql`DELETE FROM polish_sessions WHERE workflow_id = 'test-null-workflow'`);
    } catch (error: any) {
      diagnostics.testResults.canUpdateWithNullBytes = false;
      if (error.message.includes('NUL') || error.message.includes('0x00')) {
        diagnostics.recommendations.push('Confirmed: PostgreSQL rejects null bytes in JSON/TEXT fields');
        diagnostics.recommendations.push('Solution: Strip all \\u0000 characters before database operations');
      }
    }

    // Get sample of problematic data - skip this since we can't safely read null byte data
    if (diagnostics.nullByteAnalysis.affectedSessions.length > 0) {
      diagnostics.nullByteAnalysis.sampleProblematicData.push({
        sessionId: diagnostics.nullByteAnalysis.affectedSessions[0].sessionId,
        contextBefore: 'Cannot safely extract context',
        contextAfter: 'Data contains null bytes',
        characterCodes: [0] // Null byte
      });
    }

    // Generate recommendations
    if (diagnostics.nullByteAnalysis.totalAffectedRecords > 0) {
      diagnostics.recommendations.push(`Found ${diagnostics.nullByteAnalysis.totalAffectedRecords} records with null bytes`);
      diagnostics.recommendations.push('Use the "Fix Null Bytes" button to clean affected records');
      diagnostics.recommendations.push('Update agenticFinalPolishService.ts to sanitize data before saving');
    } else {
      diagnostics.recommendations.push('No null byte issues detected in current data');
    }

    return NextResponse.json({ 
      success: true, 
      diagnostics,
      summary: {
        hasNullByteIssues: diagnostics.nullByteAnalysis.totalAffectedRecords > 0,
        affectedRecords: diagnostics.nullByteAnalysis.totalAffectedRecords,
        canFixAutomatically: true
      }
    });

  } catch (error: any) {
    console.error('Polish diagnostics error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      diagnostics: {
        error: error.message,
        stack: error.stack,
        hint: 'Check if polish tables exist and have proper permissions'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'fix-null-bytes') {
      // Fix polish_sessions - use convert_from to handle encoding issues
      const sessionsFix = await db.execute(sql`
        UPDATE polish_sessions
        SET polish_metadata = jsonb(
              regexp_replace(
                convert_from(CAST(polish_metadata::text AS bytea), 'UTF8'), 
                E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', 
                '', 
                'g'
              )::json
            ),
            updated_at = NOW()
        WHERE POSITION('\\x00'::bytea IN CAST(polish_metadata::text AS bytea)) > 0
        RETURNING id
      `);

      // Fix polish_sections original_content
      const sectionsOrigFix = await db.execute(sql`
        UPDATE polish_sections
        SET original_content = regexp_replace(
              convert_from(CAST(original_content AS bytea), 'UTF8'),
              E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', 
              '', 
              'g'
            ),
            updated_at = NOW()
        WHERE POSITION('\\x00'::bytea IN CAST(COALESCE(original_content, '') AS bytea)) > 0
        RETURNING id
      `);

      // Fix polish_sections polished_content
      const sectionsPolishFix = await db.execute(sql`
        UPDATE polish_sections
        SET polished_content = regexp_replace(
              convert_from(CAST(polished_content AS bytea), 'UTF8'),
              E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', 
              '', 
              'g'
            ),
            updated_at = NOW()
        WHERE POSITION('\\x00'::bytea IN CAST(COALESCE(polished_content, '') AS bytea)) > 0
        RETURNING id
      `);

      return NextResponse.json({
        success: true,
        fixedRecords: {
          sessions: sessionsFix.rows.length,
          sectionsOriginal: sectionsOrigFix.rows.length,
          sectionsPolished: sectionsPolishFix.rows.length,
          total: sessionsFix.rows.length + sectionsOrigFix.rows.length + sectionsPolishFix.rows.length
        },
        message: 'Successfully removed null bytes from affected records'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' });

  } catch (error: any) {
    console.error('Polish fix error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Database fix operation failed'
    });
  }
}