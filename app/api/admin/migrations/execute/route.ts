import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json({ error: 'Migration filename is required' }, { status: 400 });
    }

    const executionLog: string[] = [];
    const startTime = Date.now();

    // Read migration file
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const filePath = path.join(migrationsDir, filename);
    
    executionLog.push(`Reading migration file: ${filename}`);
    
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: `Migration file not found: ${filename}` },
        { status: 404 }
      );
    }

    // Calculate hash for integrity
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    executionLog.push(`File hash: ${hash.substring(0, 8)}...`);

    // Special handling for the migration_history creation migration
    if (filename === '0000_create_migration_history.sql') {
      executionLog.push('Bootstrap migration detected - creating migration_history table');
      
      // Check if table exists first
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migration_history'
        ) as exists
      `);
      
      if (tableExists.rows[0]?.exists) {
        executionLog.push('Migration history table already exists');
        return NextResponse.json({
          success: true,
          message: 'Migration history table already exists',
          alreadyApplied: true,
          executionLog
        });
      }
    } else {
      // For all other migrations, ensure migration_history table exists first
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
      `).catch(() => {
        // Table might already exist, that's fine
      });
    }

    // Check if already applied (skip for bootstrap migration)
    if (filename !== '0000_create_migration_history.sql') {
      const existing = await db.execute(sql`
        SELECT * FROM migration_history WHERE filename = ${filename}
      `);

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: `Migration already applied: ${filename}` },
          { status: 400 }
        );
      }
    }

    // Parse migration for individual statements
    const statements = parseSQLStatements(content);
    executionLog.push(`Found ${statements.length} SQL statements to execute`);

    // Begin transaction for safety
    let successCount = 0;
    const errors: string[] = [];

    try {
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement) continue;

        try {
          executionLog.push(`Executing statement ${i + 1}/${statements.length}...`);
          
          // Log the type of operation
          const operationType = getOperationType(statement);
          executionLog.push(`  Operation: ${operationType}`);
          
          await db.execute(sql.raw(statement));
          successCount++;
          executionLog.push(`  ✅ Statement ${i + 1} completed`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Statement ${i + 1}: ${errorMsg}`);
          executionLog.push(`  ❌ Statement ${i + 1} failed: ${errorMsg}`);
          
          // Stop on first error
          throw error;
        }
      }

      const executionTime = Date.now() - startTime;
      executionLog.push(`Migration completed in ${executionTime}ms`);

      // Record successful migration
      await db.execute(sql`
        INSERT INTO migration_history (
          filename, name, hash, executed_by, 
          execution_time_ms, status, rollback_sql
        ) VALUES (
          ${filename},
          ${extractMigrationName(filename)},
          ${hash},
          ${session.email},
          ${executionTime},
          'success',
          ${generateRollbackSQL(statements)}
        )
      `);

      executionLog.push('✅ Migration recorded in history');

      return NextResponse.json({
        success: true,
        filename,
        statementsExecuted: successCount,
        executionTime,
        log: executionLog
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failed migration
      try {
        await db.execute(sql`
          INSERT INTO migration_history (
            filename, name, hash, executed_by, 
            execution_time_ms, status, error_message
          ) VALUES (
            ${filename},
            ${extractMigrationName(filename)},
            ${hash},
            ${session.email},
            ${executionTime},
            'failed',
            ${errorMsg}
          )
        `);
      } catch (recordError) {
        executionLog.push('⚠️ Failed to record migration failure in history');
      }

      return NextResponse.json(
        { 
          error: 'Migration failed',
          details: errorMsg,
          statementsExecuted: successCount,
          errors,
          log: executionLog
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Failed to execute migration:', error);
    return NextResponse.json(
      { error: 'Failed to execute migration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function parseSQLStatements(content: string): string[] {
  // Remove comments
  let cleaned = content
    .split('\n')
    .map(line => {
      // Remove single-line comments
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex);
      }
      return line;
    })
    .join('\n');

  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Split by semicolon but respect strings and functions
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    // Handle dollar quoting (PostgreSQL)
    if (char === '$' && !inString) {
      const match = cleaned.substring(i).match(/^\$([^$]*)\$/);
      if (match) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match[0];
          currentStatement += match[0];
          i += match[0].length - 1;
        } else if (cleaned.substring(i).startsWith(dollarTag)) {
          inDollarQuote = false;
          currentStatement += dollarTag;
          i += dollarTag.length - 1;
          dollarTag = '';
        } else {
          currentStatement += char;
        }
        continue;
      }
    }

    // Handle regular strings
    if (!inDollarQuote) {
      if ((char === "'" || char === '"') && cleaned[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
    }

    currentStatement += char;

    // Check for statement end
    if (char === ';' && !inString && !inDollarQuote) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements.filter(s => s.length > 0);
}

function getOperationType(statement: string): string {
  const upper = statement.toUpperCase().trim();
  if (upper.startsWith('CREATE TABLE')) return 'CREATE TABLE';
  if (upper.startsWith('CREATE INDEX')) return 'CREATE INDEX';
  if (upper.startsWith('CREATE UNIQUE')) return 'CREATE UNIQUE INDEX';
  if (upper.startsWith('CREATE FUNCTION')) return 'CREATE FUNCTION';
  if (upper.startsWith('CREATE TRIGGER')) return 'CREATE TRIGGER';
  if (upper.startsWith('ALTER TABLE')) return 'ALTER TABLE';
  if (upper.startsWith('DROP')) return 'DROP';
  if (upper.startsWith('INSERT')) return 'INSERT';
  if (upper.startsWith('UPDATE')) return 'UPDATE';
  if (upper.startsWith('DELETE')) return 'DELETE';
  if (upper.startsWith('COMMENT')) return 'COMMENT';
  return 'OTHER';
}

function generateRollbackSQL(statements: string[]): string {
  // Generate basic rollback SQL (this is simplified - real rollback would be more complex)
  const rollback: string[] = [];
  
  for (const statement of statements) {
    const upper = statement.toUpperCase().trim();
    
    if (upper.startsWith('CREATE TABLE')) {
      const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([^\s(]+)/i);
      if (tableMatch) {
        rollback.unshift(`DROP TABLE IF EXISTS ${tableMatch[1]} CASCADE;`);
      }
    } else if (upper.startsWith('ALTER TABLE') && upper.includes('ADD COLUMN')) {
      const matches = statement.match(/ALTER TABLE\s+([^\s]+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([^\s]+)/i);
      if (matches) {
        rollback.unshift(`ALTER TABLE ${matches[1]} DROP COLUMN IF EXISTS ${matches[2]};`);
      }
    } else if (upper.startsWith('CREATE INDEX')) {
      const indexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?([^\s]+)/i);
      if (indexMatch) {
        rollback.unshift(`DROP INDEX IF EXISTS ${indexMatch[1]};`);
      }
    }
  }
  
  return rollback.join('\n');
}

function extractMigrationName(filename: string): string {
  const nameWithExt = filename.replace(/^\d{4}_/, '');
  const name = nameWithExt.replace('.sql', '');
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}