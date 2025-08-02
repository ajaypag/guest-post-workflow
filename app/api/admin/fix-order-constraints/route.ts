import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find the existing constraint name for account_id
    const existingConstraintsResult = await db.execute(sql`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'orders'
        AND kcu.column_name = 'account_id'
        AND tc.table_schema = 'public';
    `);

    const existingConstraints = existingConstraintsResult.rows as any[];

    let droppedConstraint = null;
    let createdConstraint = null;

    // Drop existing constraint if it references users table
    const wrongConstraint = existingConstraints.find(c => c.foreign_table_name === 'users');
    if (wrongConstraint) {
      await db.execute(sql.raw(`
        ALTER TABLE orders 
        DROP CONSTRAINT ${wrongConstraint.constraint_name};
      `));
      droppedConstraint = wrongConstraint.constraint_name;
    }

    // Check if correct constraint already exists
    const correctConstraint = existingConstraints.find(c => c.foreign_table_name === 'accounts');
    
    if (!correctConstraint) {
      // Create new foreign key constraint to accounts table
      // Note: We're making it a nullable foreign key, so NULL values are allowed
      await db.execute(sql`
        ALTER TABLE orders 
        ADD CONSTRAINT orders_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES accounts(id)
        ON DELETE SET NULL;
      `);
      createdConstraint = 'orders_account_id_fkey';
    }

    return NextResponse.json({
      success: true,
      droppedConstraint,
      createdConstraint,
      message: correctConstraint 
        ? 'Correct constraint already exists' 
        : 'Constraint fixed successfully',
    });

  } catch (error) {
    console.error('Error fixing constraints:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix constraints' },
      { status: 500 }
    );
  }
}