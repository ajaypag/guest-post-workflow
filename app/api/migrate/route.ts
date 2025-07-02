import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export async function POST() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const pool = new Pool({
      connectionString,
      ssl: false, // Coolify PostgreSQL doesn't use SSL
    });

    const db = drizzle(pool);

    // Run migrations
    await migrate(db, { migrationsFolder: './lib/db/migrations' });

    await pool.end();

    return NextResponse.json({ 
      success: true, 
      message: 'Migrations completed successfully' 
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}