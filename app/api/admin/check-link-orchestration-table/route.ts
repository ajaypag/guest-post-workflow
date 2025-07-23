import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if link_orchestration_sessions table exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'link_orchestration_sessions'
      ) as exists
    `);

    const exists = (result as any).rows ? (result as any).rows[0].exists : (result as any)[0].exists;

    if (exists) {
      // Check the structure of the table
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'link_orchestration_sessions'
        ORDER BY ordinal_position
      `);

      return NextResponse.json({
        exists: true,
        message: 'Link orchestration table exists',
        columns: (columnsResult as any).rows || columnsResult
      });
    } else {
      return NextResponse.json({
        exists: false,
        message: 'Link orchestration table does not exist'
      });
    }
  } catch (error) {
    console.error('Error checking link orchestration table:', error);
    return NextResponse.json({
      error: 'Failed to check link orchestration table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}