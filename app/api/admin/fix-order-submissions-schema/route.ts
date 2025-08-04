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

    // Check for all potentially missing columns
    const missingColumns = [];
    
    // Check client_reviewed_by
    const clientReviewedByExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_site_submissions' 
        AND column_name = 'client_reviewed_by'
      ) as exists
    `);
    
    if (!clientReviewedByExists.rows[0]?.exists) {
      missingColumns.push({
        name: 'client_reviewed_by',
        sql: 'ADD COLUMN client_reviewed_by UUID REFERENCES users(id)'
      });
    }

    // Check completed_at
    const completedAtExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_site_submissions' 
        AND column_name = 'completed_at'
      ) as exists
    `);
    
    if (!completedAtExists.rows[0]?.exists) {
      missingColumns.push({
        name: 'completed_at',
        sql: 'ADD COLUMN completed_at TIMESTAMP'
      });
    }

    if (missingColumns.length === 0) {
      return NextResponse.json({
        message: 'All columns already exist',
        alreadyFixed: true
      });
    }

    // Add all missing columns
    const addedColumns = [];
    for (const column of missingColumns) {
      console.log(`Adding ${column.name} column...`);
      
      try {
        await db.execute(sql.raw(`ALTER TABLE order_site_submissions ${column.sql}`));
        addedColumns.push(column.name);
        console.log(`Successfully added ${column.name}`);
      } catch (colError: any) {
        console.error(`Failed to add ${column.name}:`, colError);
        // Continue with other columns even if one fails
      }
    }

    if (addedColumns.length === 0) {
      throw new Error('No columns were successfully added');
    }

    return NextResponse.json({
      message: `Successfully added ${addedColumns.length} column(s): ${addedColumns.join(', ')}`,
      addedColumns,
      success: true
    });

  } catch (error: any) {
    console.error('Error fixing schema:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix schema', 
        details: error?.message || 'Unknown error',
        hint: 'You may need to run these SQL commands manually:\n' +
              'ALTER TABLE order_site_submissions ADD COLUMN client_reviewed_by UUID REFERENCES users(id);\n' +
              'ALTER TABLE order_site_submissions ADD COLUMN completed_at TIMESTAMP;'
      },
      { status: 500 }
    );
  }
}