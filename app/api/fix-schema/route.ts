import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
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
      ssl: false, // Coolify PostgreSQL doesn't use SSL
    });

    // Check if description column exists and add it if missing
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'description';
    `);

    if (columnCheck.rows.length === 0) {
      // Add the description column if it doesn't exist
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN description TEXT DEFAULT '';
      `);
    } else {
      // If it exists, just set the default
      await pool.query(`
        ALTER TABLE clients 
        ALTER COLUMN description SET DEFAULT '';
      `);

      // Update existing null descriptions to empty string
      await pool.query(`
        UPDATE clients 
        SET description = '' 
        WHERE description IS NULL;
      `);
    }

    await pool.end();

    return NextResponse.json({ 
      success: true, 
      message: 'Schema fixed successfully' 
    });
  } catch (error) {
    console.error('Schema fix error:', error);
    return NextResponse.json(
      { error: `Schema fix failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}