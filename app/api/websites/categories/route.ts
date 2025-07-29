import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database configuration
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: false, // Coolify PostgreSQL doesn't use SSL
});

export async function GET() {
  try {
    // Get all unique categories from websites
    const result = await pool.query(`
      SELECT DISTINCT unnest(categories) as category
      FROM websites
      WHERE categories IS NOT NULL AND categories != '{}'
      ORDER BY category
    `);

    const categories = result.rows.map(row => row.category);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}