import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const session = AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fix orders that have status='draft' but state='configuring'
    // These orders should have state=null to show delete button
    const result = await db.execute(sql`
      UPDATE orders
      SET state = NULL,
          updated_at = NOW()
      WHERE status = 'draft' 
      AND state = 'configuring'
      RETURNING id, status, state
    `);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${result.rowCount} draft orders`,
      updatedOrders: result.rows
    });
  } catch (error) {
    console.error('Error fixing draft orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}