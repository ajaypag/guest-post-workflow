import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MigrationStatus {
  migration: string;
  version: string;
  description: string;
  status: 'not_run' | 'completed' | 'failed' | 'running';
  appliedAt?: string;
  error?: string;
  tableExists: boolean;
  columnCheck: {
    hasOrderId: boolean;
    hasChangeType: boolean;
    hasPreviousValue: boolean;
    hasNewValue: boolean;
    hasBatchId: boolean;
    hasMetadata: boolean;
  };
  rowCount: number;
  lastChange?: string;
}

const MIGRATIONS = [
  {
    version: '0057a',
    file: '0057a_add_order_id_column.sql',
    description: 'Add order_id column to line_item_changes'
  },
  {
    version: '0057b',
    file: '0057b_add_change_type_column.sql',
    description: 'Add and populate change_type column'
  },
  {
    version: '0057c',
    file: '0057c_add_previous_value_column.sql',
    description: 'Add and populate previous_value JSONB column'
  },
  {
    version: '0057d',
    file: '0057d_add_metadata_columns.sql',
    description: 'Add batch_id and metadata columns'
  },
  {
    version: '0057e',
    file: '0057e_drop_old_columns.sql',
    description: 'Drop old field_name and old_value columns'
  },
  {
    version: '0057f',
    file: '0057f_add_indexes_and_constraints.sql',
    description: 'Add indexes and foreign key constraints'
  },
  {
    version: '0058',
    file: '0058_update_line_item_changes_schema.sql', 
    description: 'Enhanced schema with backup and migration'
  },
  {
    version: '0059',
    file: '0059_fix_line_item_changes_columns.sql',
    description: 'Add missing columns to line_item_changes table'
  }
];

export async function GET() {
  try {
    // Log database URL for debugging (hide password)
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('🔗 Admin API Database URL:', maskedUrl);
    
    const migrations: MigrationStatus[] = [];

    for (const migration of MIGRATIONS) {
      // Check if migration was applied - try both possible migration table schemas
      let migrationRecord;
      try {
        migrationRecord = await db.execute(sql`
          SELECT applied_at FROM migrations 
          WHERE name = ${migration.file} OR version = ${migration.version}
          ORDER BY applied_at DESC
          LIMIT 1
        `);
      } catch (e) {
        // Try alternative migration table schema
        try {
          migrationRecord = await db.execute(sql`
            SELECT executed_at as applied_at FROM migration_history 
            WHERE migration_name = ${migration.file}
            ORDER BY executed_at DESC
            LIMIT 1
          `);
        } catch (e2) {
          // No migration table found, assume not run
          migrationRecord = { rows: [] };
        }
      }

      // Check if table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'line_item_changes'
        )
      `);

      let columnCheck = {
        hasOrderId: false,
        hasChangeType: false,
        hasPreviousValue: false,
        hasNewValue: false,
        hasBatchId: false,
        hasMetadata: false
      };

      let rowCount = 0;
      let lastChange: string | undefined;

      if (tableExists.rows[0]?.exists) {
        // Check columns exist
        const columns = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'line_item_changes'
        `);

        const columnNames = columns.rows.map(row => row.column_name);
        
        columnCheck = {
          hasOrderId: columnNames.includes('order_id'),
          hasChangeType: columnNames.includes('change_type'),
          hasPreviousValue: columnNames.includes('previous_value'),
          hasNewValue: columnNames.includes('new_value') || columnNames.includes('new_value_json'),
          hasBatchId: columnNames.includes('batch_id'),
          hasMetadata: columnNames.includes('metadata')
        };

        // Get row count
        const countResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM line_item_changes
        `);
        rowCount = parseInt(countResult.rows[0]?.count || '0');

        // Get last change
        try {
          const lastChangeResult = await db.execute(sql`
            SELECT changed_at FROM line_item_changes 
            ORDER BY changed_at DESC 
            LIMIT 1
          `);
          if (lastChangeResult.rows[0]?.changed_at) {
            lastChange = lastChangeResult.rows[0].changed_at.toISOString();
          }
        } catch (e) {
          // Column might not exist yet
        }
      }

      const status: MigrationStatus = {
        migration: migration.file,
        version: migration.version,
        description: migration.description,
        status: migrationRecord.rows.length > 0 ? 'completed' : 'not_run',
        appliedAt: migrationRecord.rows[0]?.applied_at?.toISOString(),
        tableExists: tableExists.rows[0]?.exists || false,
        columnCheck,
        rowCount,
        lastChange
      };

      migrations.push(status);
    }

    return NextResponse.json({ migrations });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { version, action } = await request.json();

    if (!version || !action) {
      return NextResponse.json(
        { error: 'Version and action are required' },
        { status: 400 }
      );
    }

    const migration = MIGRATIONS.find(m => m.version === version);
    if (!migration) {
      return NextResponse.json(
        { error: 'Migration not found' },
        { status: 404 }
      );
    }

    // Check if already applied - try both migration table schemas
    let existingMigration;
    try {
      existingMigration = await db.execute(sql`
        SELECT applied_at FROM migrations 
        WHERE name = ${migration.file} OR version = ${migration.version}
        LIMIT 1
      `);
    } catch (e) {
      try {
        existingMigration = await db.execute(sql`
          SELECT executed_at as applied_at FROM migration_history 
          WHERE migration_name = ${migration.file}
          LIMIT 1
        `);
      } catch (e2) {
        existingMigration = { rows: [] };
      }
    }

    if (existingMigration.rows.length > 0 && action === 'run') {
      return NextResponse.json({
        success: false,
        message: 'Migration already applied',
        details: { appliedAt: existingMigration.rows[0].applied_at }
      });
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', migration.file);
    let migrationSQL: string;
    
    try {
      migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Migration file not found',
        error: `Could not read ${migration.file}`
      });
    }

    if (action === 'dry-run') {
      // For dry run, just validate the SQL and return analysis
      return NextResponse.json({
        success: true,
        message: 'Dry run completed successfully',
        details: {
          migrationFile: migration.file,
          sqlStatements: migrationSQL.split(';').filter(s => s.trim()).length,
          preview: migrationSQL.substring(0, 500) + (migrationSQL.length > 500 ? '...' : '')
        }
      });
    }

    if (action === 'run') {
      // Check prerequisites
      if (version === '0058') {
        let prereq;
        try {
          prereq = await db.execute(sql`
            SELECT applied_at FROM migrations 
            WHERE version = '0057' OR name LIKE '%0057%'
            LIMIT 1
          `);
        } catch (e) {
          try {
            prereq = await db.execute(sql`
              SELECT executed_at as applied_at FROM migration_history 
              WHERE migration_name LIKE '%0057%'
              LIMIT 1
            `);
          } catch (e2) {
            prereq = { rows: [] };
          }
        }
        if (prereq.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'Prerequisite migration 0057 must be completed first'
          });
        }
      }

      if (version === '0059') {
        let prereq;
        try {
          prereq = await db.execute(sql`
            SELECT applied_at FROM migrations 
            WHERE version = '0058' OR name LIKE '%0058%'
            LIMIT 1
          `);
        } catch (e) {
          try {
            prereq = await db.execute(sql`
              SELECT executed_at as applied_at FROM migration_history 
              WHERE migration_name LIKE '%0058%'
              LIMIT 1
            `);
          } catch (e2) {
            prereq = { rows: [] };
          }
        }
        if (prereq.rows.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'Prerequisite migration 0058 must be completed first'
          });
        }
      }

      try {
        // Execute migration in a transaction
        await db.transaction(async (tx) => {
          // Split SQL into statements and execute each
          const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

          for (const statement of statements) {
            if (statement.trim()) {
              await tx.execute(sql.raw(statement));
            }
          }

          // Record migration as applied - try both migration table schemas
          try {
            await tx.execute(sql`
              INSERT INTO migrations (name, version, description, applied_at) 
              VALUES (${migration.file}, ${migration.version}, ${migration.description}, NOW())
              ON CONFLICT (name) DO UPDATE SET applied_at = NOW()
            `);
          } catch (e) {
            try {
              await tx.execute(sql`
                INSERT INTO migration_history (migration_name, success) 
                VALUES (${migration.file}, true)
                ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW()
              `);
            } catch (e2) {
              console.warn('Could not record migration in either migrations table format:', e2);
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: `Migration ${version} completed successfully`,
          details: {
            migrationFile: migration.file,
            appliedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`Migration ${version} failed:`, error);
        
        // Record failure
        try {
          await db.execute(sql`
            INSERT INTO migrations (name, version, description, applied_at, error) 
            VALUES (${migration.file}, ${migration.version}, ${migration.description}, NOW(), ${error instanceof Error ? error.message : 'Unknown error'})
            ON CONFLICT (name) DO UPDATE SET 
              applied_at = NOW(), 
              error = ${error instanceof Error ? error.message : 'Unknown error'}
          `);
        } catch (recordError) {
          console.error('Failed to record migration error:', recordError);
        }

        return NextResponse.json({
          success: false,
          message: `Migration ${version} failed`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "run" or "dry-run"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json(
      { error: 'Failed to run migration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}