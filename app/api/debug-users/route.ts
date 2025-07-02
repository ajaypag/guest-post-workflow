import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: false,
    });

    // Check what users exist
    const usersResult = await pool.query('SELECT id, email, name FROM users ORDER BY created_at');
    
    // Check if the specific user exists
    const specificUserId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
    const specificUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [specificUserId]);
    
    // Check table constraints
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'workflows' AND tc.constraint_type = 'FOREIGN KEY';
    `);

    await pool.end();

    return NextResponse.json({
      allUsers: usersResult.rows,
      specificUserExists: specificUserResult.rows.length > 0,
      specificUser: specificUserResult.rows[0] || null,
      foreignKeyConstraints: constraintsResult.rows
    });
  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}