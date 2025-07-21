import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    // Check if bulk qualification tables exist
    const checkTables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('qualification_jobs', 'qualification_sites', 'site_rankings')
    `);

    const existingTables = checkTables.rows.map((row: any) => row.table_name);
    const requiredTables = ['qualification_jobs', 'qualification_sites', 'site_rankings'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    // Check column sizes if tables exist
    let columnIssues: any[] = [];
    if (existingTables.length > 0) {
      const columnCheck = await db.execute(`
        SELECT 
          table_name,
          column_name, 
          data_type,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name IN ('qualification_jobs', 'qualification_sites', 'site_rankings')
        AND data_type = 'character varying'
        AND character_maximum_length < 255
      `);
      
      columnIssues = columnCheck.rows;
    }

    return NextResponse.json({
      exists: missingTables.length === 0,
      missingTables,
      existingTables,
      columnIssues,
      status: missingTables.length === 0 ? 'ready' : 'needs_migration'
    });
  } catch (error) {
    console.error('Failed to check bulk qualification tables:', error);
    return NextResponse.json({ 
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}