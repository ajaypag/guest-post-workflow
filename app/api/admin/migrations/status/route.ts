import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

export async function GET(request: NextRequest) {
  try {
    // Check if migrations table exists
    const migrationTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    let appliedMigrations: any[] = [];
    if (migrationTableExists.rows[0].exists) {
      // Get applied migrations
      const migrationsResult = await pool.query(`
        SELECT * FROM migrations 
        ORDER BY applied_at DESC
      `);
      appliedMigrations = migrationsResult.rows;
    }

    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    let availableMigrations: string[] = [];
    
    try {
      const files = await fs.readdir(migrationsDir);
      availableMigrations = files.filter(f => f.endsWith('.sql'));
    } catch (error) {
      console.log('No migrations directory found');
    }

    // Map migrations with their status
    const migrations = availableMigrations.map(filename => {
      const id = filename.replace('.sql', '');
      const applied = appliedMigrations.find(m => m.name === id);
      
      return {
        id,
        name: formatMigrationName(id),
        description: getMigrationDescription(id),
        status: applied ? 'completed' : 'pending',
        appliedAt: applied?.applied_at,
        error: applied?.error
      };
    });

    // Get Airtable sync tables info
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
      FROM (
        SELECT 
          table_name,
          query_to_xml(format('SELECT COUNT(*) as cnt FROM %I', table_name), false, true, '') as xml_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN (
          'websites', 
          'website_contacts', 
          'website_qualifications',
          'website_sync_logs',
          'airtable_sync_config',
          'airtable_webhook_events'
        )
      ) t;
    `);

    // Get column info for each table
    const tables = await Promise.all(
      tablesResult.rows.map(async (table) => {
        const columnsResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        return {
          name: table.table_name,
          rowCount: parseInt(table.row_count),
          columns: columnsResult.rows.map(r => r.column_name)
        };
      })
    );

    return NextResponse.json({
      migrations,
      tables,
      databaseStatus: 'connected'
    });
  } catch (error: any) {
    console.error('Migration status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error.message,
        migrations: [],
        tables: [],
        databaseStatus: 'error'
      },
      { status: 500 }
    );
  }
}

function formatMigrationName(id: string): string {
  // Extract name from migration ID (e.g., "0013_add_airtable_sync_tables" -> "Add Airtable Sync Tables")
  const parts = id.split('_');
  if (parts.length > 1) {
    return parts.slice(1).join(' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  return id;
}

function getMigrationDescription(id: string): string {
  const descriptions: Record<string, string> = {
    '0013_add_airtable_sync_tables': 'Creates websites, contacts, qualifications, and sync tracking tables for local Airtable data',
    '0014_add_cron_jobs_table': 'Adds table for tracking scheduled sync jobs and automation tasks'
  };
  
  return descriptions[id] || 'Database schema migration';
}