import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Test 1: Check if migration was applied
    const schemaCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'target_pages'
      AND column_name IN ('owner_user_id', 'workflow_id', 'source_type', 'created_in_workflow', 'expires_at')
      ORDER BY column_name
    `);

    // Test 2: Check if clientId is nullable
    const clientIdCheck = await db.execute(sql`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'target_pages'
      AND column_name = 'client_id'
    `);

    // Test 3: Try to insert an orphan URL (test data)
    let insertTest = { success: false, error: null };
    try {
      const testResult = await db.execute(sql`
        INSERT INTO target_pages (
          id, client_id, url, domain, status, 
          owner_user_id, workflow_id, source_type, 
          created_in_workflow, expires_at, added_at
        ) VALUES (
          gen_random_uuid(),
          NULL,
          'https://test-orphan-url.com/test',
          'test-orphan-url.com',
          'active',
          ${session.user.id},
          NULL,
          'user_orphan',
          false,
          NULL,
          NOW()
        )
        RETURNING id
      `);
      
      insertTest.success = true;
      
      // Clean up test data
      if (testResult.rows[0]) {
        await db.execute(sql`
          DELETE FROM target_pages WHERE id = ${testResult.rows[0].id}
        `);
      }
    } catch (error) {
      insertTest.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test 4: Check indexes
    const indexCheck = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'target_pages'
      AND indexname IN ('idx_target_pages_orphan', 'idx_target_pages_workflow')
    `);

    return NextResponse.json({
      success: true,
      tests: {
        newColumns: {
          found: schemaCheck.rows.length,
          expected: 5,
          passed: schemaCheck.rows.length === 5,
          columns: schemaCheck.rows
        },
        clientIdNullable: {
          isNullable: clientIdCheck.rows[0]?.is_nullable === 'YES',
          passed: clientIdCheck.rows[0]?.is_nullable === 'YES'
        },
        orphanUrlInsert: insertTest,
        indexes: {
          found: indexCheck.rows.length,
          expected: 2,
          passed: indexCheck.rows.length === 2,
          indexes: indexCheck.rows
        }
      },
      summary: {
        migrationApplied: schemaCheck.rows.length === 5 && clientIdCheck.rows[0]?.is_nullable === 'YES',
        readyForFeature: schemaCheck.rows.length === 5 && 
                        clientIdCheck.rows[0]?.is_nullable === 'YES' && 
                        insertTest.success &&
                        indexCheck.rows.length === 2
      }
    });

  } catch (error) {
    console.error('Bulk URL feature test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}