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

    const executionLog: string[] = [];
    const startTime = Date.now();
    
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    let migrationFiles: string[] = [];
    
    try {
      const files = await fs.readdir(migrationsDir);
      migrationFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort(); // Important: execute in order
    } catch (error) {
      return NextResponse.json(
        { error: 'Migrations directory not found' },
        { status: 500 }
      );
    }

    // Ensure migration history table exists
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

    // Get already applied migrations
    const appliedMigrations = await db.execute(sql`
      SELECT filename FROM migration_history WHERE status = 'success'
    `);
    
    const appliedSet = new Set(appliedMigrations.rows.map(row => row.filename as string));
    
    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(f => !appliedSet.has(f));
    
    if (pendingMigrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending migrations to apply',
        applied: 0,
        log: ['No pending migrations found']
      });
    }

    executionLog.push(`Found ${pendingMigrations.length} pending migrations`);
    executionLog.push('Starting batch migration...\n');

    let successCount = 0;
    const failed: string[] = [];

    // Execute each pending migration in order
    for (const filename of pendingMigrations) {
      executionLog.push(`\n📄 Processing: ${filename}`);
      executionLog.push('=' .repeat(50));
      
      try {
        // Read migration file
        const filePath = path.join(migrationsDir, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        
        // Parse and execute statements
        const statements = parseSQLStatements(content);
        executionLog.push(`  Found ${statements.length} statements`);
        
        const migrationStart = Date.now();
        let statementCount = 0;
        
        for (const statement of statements) {
          if (!statement.trim()) continue;
          
          try {
            await db.execute(sql.raw(statement));
            statementCount++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            executionLog.push(`  ❌ Failed: ${errorMsg}`);
            
            // Record failed migration
            await db.execute(sql`
              INSERT INTO migration_history (
                filename, name, hash, executed_by, 
                execution_time_ms, status, error_message
              ) VALUES (
                ${filename},
                ${extractMigrationName(filename)},
                ${hash},
                ${session.email},
                ${Date.now() - migrationStart},
                'failed',
                ${errorMsg}
              )
            `).catch(() => {});
            
            throw error;
          }
        }
        
        const migrationTime = Date.now() - migrationStart;
        
        // Record successful migration
        await db.execute(sql`
          INSERT INTO migration_history (
            filename, name, hash, executed_by, 
            execution_time_ms, status
          ) VALUES (
            ${filename},
            ${extractMigrationName(filename)},
            ${hash},
            ${session.email},
            ${migrationTime},
            'success'
          )
        `);
        
        successCount++;
        executionLog.push(`  ✅ Success: ${statementCount} statements in ${migrationTime}ms`);
        
      } catch (error) {
        failed.push(filename);
        executionLog.push(`  ❌ Migration failed - stopping batch execution`);
        
        // Stop on first failure
        break;
      }
    }

    const totalTime = Date.now() - startTime;
    
    executionLog.push('\n' + '=' .repeat(50));
    executionLog.push('BATCH MIGRATION SUMMARY');
    executionLog.push('=' .repeat(50));
    executionLog.push(`✅ Successfully applied: ${successCount}/${pendingMigrations.length}`);
    
    if (failed.length > 0) {
      executionLog.push(`❌ Failed: ${failed.join(', ')}`);
      executionLog.push(`⚠️ Remaining: ${pendingMigrations.length - successCount - failed.length} migrations not attempted`);
    }
    
    executionLog.push(`⏱️ Total execution time: ${totalTime}ms`);

    return NextResponse.json({
      success: failed.length === 0,
      applied: successCount,
      failed: failed,
      pending: pendingMigrations.length - successCount - failed.length,
      totalTime,
      log: executionLog
    });

  } catch (error) {
    console.error('Failed to execute batch migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute batch migration', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function parseSQLStatements(content: string): string[] {
  // Remove comments
  let cleaned = content
    .split('\n')
    .map(line => {
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex);
      }
      return line;
    })
    .join('\n');

  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Split by semicolon but respect strings
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if ((char === "'" || char === '"') && cleaned[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    currentStatement += char;

    if (char === ';' && !inString) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements.filter(s => s.length > 0);
}

function extractMigrationName(filename: string): string {
  const nameWithExt = filename.replace(/^\d{4}_/, '');
  const name = nameWithExt.replace('.sql', '');
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}