import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Direct SQL query
    const result = await db.execute(sql`
      SELECT 
        id, email, company_name, account_status, source
      FROM publishers
      WHERE account_status = 'shadow'
      LIMIT 5
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM publishers
      WHERE account_status = 'shadow'
    `);

    return NextResponse.json({
      success: true,
      total: countResult.rows[0]?.total || 0,
      sample: result.rows,
    });
  } catch (error) {
    console.error('Test publishers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishers', details: String(error) },
      { status: 500 }
    );
  }
}