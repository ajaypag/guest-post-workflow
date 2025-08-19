import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all migration files from the migrations directory
    const migrationsDir = path.join(process.cwd(), 'migrations');
    let migrationFiles: string[] = [];
    
    try {
      const files = await fs.readdir(migrationsDir);
      migrationFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort(); // Sort by filename (which includes timestamp)
    } catch (error) {
      console.warn('Migrations directory not found or empty');
    }

    // Ensure migrations table exists first
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        hash VARCHAR(64),
        applied_at TIMESTAMP DEFAULT NOW(),
        executed_by VARCHAR(255),
        execution_time_ms INTEGER,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        rollback_sql TEXT
      )
    `);

    // Get applied migrations from database
    let appliedMigrations: any;
    try {
      appliedMigrations = await db.execute(sql`
        SELECT filename, name, hash, applied_at, status, error_message
        FROM migration_history
        ORDER BY applied_at DESC
      `);
    } catch (error) {
      console.log('Migration history table might be empty or have issues, continuing...');
      appliedMigrations = { rows: [] };
    }

    type AppliedMigration = {
      appliedAt: string;
      hash: string;
      status: string;
      error: string | null;
    };
    
    const appliedMap = new Map<string, AppliedMigration>(
      appliedMigrations.rows.map((row: any) => [
        row.filename as string, 
        {
          appliedAt: row.applied_at as string,
          hash: row.hash as string,
          status: row.status as string,
          error: row.error_message as string | null
        }
      ])
    );

    // Build migrations list
    const migrations = await Promise.all(
      migrationFiles.map(async (filename) => {
        const applied = appliedMap.get(filename);
        const name = extractMigrationName(filename);
        
        // Calculate file hash for integrity check
        let hash = '';
        try {
          const content = await fs.readFile(path.join(migrationsDir, filename), 'utf-8');
          hash = crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
          console.error(`Failed to read migration file ${filename}:`, error);
        }

        return {
          filename,
          name,
          applied: !!applied,
          appliedAt: applied?.appliedAt || null,
          hash,
          hashMatch: !applied || applied?.hash === hash,
          status: applied?.status || 'pending',
          error: applied?.error || null
        };
      })
    );

    // Get database version info
    const dbVersion = await db.execute(sql`SELECT version()`);
    const tableCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    // Build status summary
    const status = {
      databaseVersion: (dbVersion.rows[0]?.version as string)?.split(' ')[1] || 'Unknown',
      totalMigrations: migrations.length,
      appliedMigrations: migrations.filter(m => m.applied).length,
      pendingMigrations: migrations.filter(m => !m.applied).length,
      lastMigration: appliedMigrations.rows[0]?.filename as string || null,
      lastMigrationDate: appliedMigrations.rows[0]?.applied_at 
        ? new Date(appliedMigrations.rows[0].applied_at as string).toLocaleString()
        : null,
      tableCount: parseInt(tableCount.rows[0]?.count as string || '0')
    };

    return NextResponse.json({
      migrations,
      status,
      success: true
    });

  } catch (error) {
    console.error('Failed to fetch migrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migrations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractMigrationName(filename: string): string {
  // Remove timestamp prefix and .sql extension
  const nameWithExt = filename.replace(/^\d{4}_/, '');
  const name = nameWithExt.replace('.sql', '');
  // Convert underscores to spaces and capitalize
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}