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
    
    diagnostics.databaseInfo.tableExists = tableCheck.rows[0].exists;

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

    // Check for null bytes in polish_metadata
    const nullByteCheck = await db.execute(sql`
      SELECT 
        id,
        workflow_id,
        version,
        status,
        LENGTH(polish_metadata::text) as metadata_length,
        POSITION(E'\\x00' IN polish_metadata::text) as null_byte_position,
        LEFT(polish_metadata::text, 200) as sample_data
      FROM polish_sessions
      WHERE polish_metadata IS NOT NULL
    `);

    // Analyze results
    for (const row of nullByteCheck.rows) {
      if (row.null_byte_position > 0) {
        diagnostics.nullByteAnalysis.affectedSessions.push({
          sessionId: row.id,
          workflowId: row.workflow_id,
          version: row.version,
          status: row.status,
          nullBytePosition: row.null_byte_position,
          metadataLength: row.metadata_length,
          sampleData: row.sample_data
        });
      }
    }

    // Check polish_sections for similar issues
    const sectionsCheck = await db.execute(sql`
      SELECT 
        id,
        polish_session_id,
        section_number,
        title,
        LENGTH(original_content) as original_length,
        LENGTH(polished_content) as polished_length,
        POSITION(E'\\x00' IN COALESCE(original_content, '')) as orig_null_pos,
        POSITION(E'\\x00' IN COALESCE(polished_content, '')) as polish_null_pos
      FROM polish_sections
      WHERE original_content IS NOT NULL OR polished_content IS NOT NULL
    `);

    for (const row of sectionsCheck.rows) {
      if (row.orig_null_pos > 0 || row.polish_null_pos > 0) {
        diagnostics.nullByteAnalysis.affectedSections.push({
          sectionId: row.id,
          sessionId: row.polish_session_id,
          sectionNumber: row.section_number,
          title: row.title,
          hasNullInOriginal: row.orig_null_pos > 0,
          hasNullInPolished: row.polish_null_pos > 0
        });
      }
    }

    diagnostics.nullByteAnalysis.totalAffectedRecords = 
      diagnostics.nullByteAnalysis.affectedSessions.length + 
      diagnostics.nullByteAnalysis.affectedSections.length;

    // Check for other problematic control characters
    const controlCharCheck = await db.execute(sql`
      SELECT 
        id,
        regexp_replace(polish_metadata::text, '[\x00-\x1F]', '<CTRL>', 'g') as cleaned_sample,
        LENGTH(polish_metadata::text) - LENGTH(regexp_replace(polish_metadata::text, '[\x00-\x1F]', '', 'g')) as control_char_count
      FROM polish_sessions
      WHERE polish_metadata IS NOT NULL
      LIMIT 5
    `);

    diagnostics.characterAnalysis.controlCharacters = controlCharCheck.rows.map((row: any) => ({
      sessionId: row.id,
      controlCharCount: row.control_char_count,
      cleanedSample: row.cleaned_sample.substring(0, 100)
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

    // Get sample of problematic data
    if (diagnostics.nullByteAnalysis.affectedSessions.length > 0) {
      const sampleSession = await db.execute(sql`
        SELECT 
          id,
          polish_metadata::text as raw_metadata
        FROM polish_sessions
        WHERE id = ${diagnostics.nullByteAnalysis.affectedSessions[0].sessionId}
        LIMIT 1
      `);

      if (sampleSession.rows.length > 0) {
        const rawData = sampleSession.rows[0].raw_metadata;
        // Find the specific problematic part
        const nullByteIndex = rawData.indexOf('\u0000');
        if (nullByteIndex > -1) {
          diagnostics.nullByteAnalysis.sampleProblematicData.push({
            sessionId: sampleSession.rows[0].id,
            contextBefore: rawData.substring(Math.max(0, nullByteIndex - 50), nullByteIndex),
            contextAfter: rawData.substring(nullByteIndex + 1, Math.min(rawData.length, nullByteIndex + 51)),
            characterCodes: rawData.substring(nullByteIndex - 10, nullByteIndex + 10).split('').map(c => c.charCodeAt(0))
          });
        }
      }
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
      // Fix polish_sessions
      const sessionsFix = await db.execute(sql`
        UPDATE polish_sessions
        SET polish_metadata = jsonb(regexp_replace(polish_metadata::text, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g')::json),
            updated_at = NOW()
        WHERE POSITION(E'\\x00' IN polish_metadata::text) > 0
        RETURNING id
      `);

      // Fix polish_sections original_content
      const sectionsOrigFix = await db.execute(sql`
        UPDATE polish_sections
        SET original_content = regexp_replace(original_content, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'),
            updated_at = NOW()
        WHERE POSITION(E'\\x00' IN COALESCE(original_content, '')) > 0
        RETURNING id
      `);

      // Fix polish_sections polished_content
      const sectionsPolishFix = await db.execute(sql`
        UPDATE polish_sections
        SET polished_content = regexp_replace(polished_content, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'),
            updated_at = NOW()
        WHERE POSITION(E'\\x00' IN COALESCE(polished_content, '')) > 0
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