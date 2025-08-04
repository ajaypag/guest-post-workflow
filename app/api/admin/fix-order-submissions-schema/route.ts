import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Auth check - admin only
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fixing order_site_submissions table schema...');

    // Check if column already exists
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_site_submissions' 
        AND column_name = 'client_reviewed_by'
      ) as exists
    `);

    if (columnExists.rows[0]?.exists) {
      return NextResponse.json({
        message: 'Column client_reviewed_by already exists',
        alreadyFixed: true
      });
    }

    // Add the missing column
    console.log('Adding client_reviewed_by column...');
    
    await db.execute(sql`
      ALTER TABLE order_site_submissions 
      ADD COLUMN client_reviewed_by UUID REFERENCES users(id)
    `);

    console.log('Column added successfully');

    // Verify the column was added
    const verifyResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_site_submissions' 
      AND column_name = 'client_reviewed_by'
    `);

    if (verifyResult.rows.length === 0) {
      throw new Error('Column was not added successfully');
    }

    return NextResponse.json({
      message: 'Successfully added client_reviewed_by column to order_site_submissions table',
      success: true
    });

  } catch (error: any) {
    console.error('Error fixing schema:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix schema', 
        details: error?.message || 'Unknown error',
        hint: 'You may need to run this SQL manually: ALTER TABLE order_site_submissions ADD COLUMN client_reviewed_by UUID REFERENCES users(id);'
      },
      { status: 500 }
    );
  }
}