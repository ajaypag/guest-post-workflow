import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const healthChecks: any = {};
    
    // Database version
    const versionResult = await db.execute(sql`SELECT version()`);
    healthChecks.version = (versionResult.rows[0]?.version as string)?.split(' ').slice(0, 2).join(' ') || 'Unknown';
    
    // Database size
    const sizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size
    `);
    const sizeBytes = parseInt(sizeResult.rows[0]?.size as string || '0');
    healthChecks.size = formatBytes(sizeBytes);
    
    // Table count
    const tableResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    healthChecks.tableCount = parseInt(tableResult.rows[0]?.count as string || '0');
    
    // Index count
    const indexResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    healthChecks.indexCount = parseInt(indexResult.rows[0]?.count as string || '0');
    
    // Check key tables exist
    const keyTables = [
      'users', 'clients', 'workflows', 'orders', 
      'websites', 'publishers', 'accounts'
    ];
    
    const tableChecks = await Promise.all(
      keyTables.map(async (tableName) => {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists,
          (
            SELECT COUNT(*) 
            FROM ${sql.raw(tableName)}
          ) as count
        `).catch(() => ({ rows: [{ exists: false, count: 0 }] }));
        
        return {
          table: tableName,
          exists: result.rows[0]?.exists || false,
          rowCount: parseInt(result.rows[0]?.count as string || '0')
        };
      })
    );
    
    healthChecks.tables = tableChecks;
    
    // Connection pool stats
    const poolResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    
    healthChecks.connections = {
      total: parseInt(poolResult.rows[0]?.total_connections as string || '0'),
      active: parseInt(poolResult.rows[0]?.active as string || '0'),
      idle: parseInt(poolResult.rows[0]?.idle as string || '0'),
      idleInTransaction: parseInt(poolResult.rows[0]?.idle_in_transaction as string || '0'),
      waiting: parseInt(poolResult.rows[0]?.waiting as string || '0')
    };
    
    // Check for long-running queries
    const longQueriesResult = await db.execute(sql`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        query,
        EXTRACT(EPOCH FROM (now() - query_start))::INT as duration_seconds
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND query NOT LIKE '%pg_stat_activity%'
        AND EXTRACT(EPOCH FROM (now() - query_start)) > 30
      ORDER BY query_start
      LIMIT 5
    `);
    
    healthChecks.longRunningQueries = longQueriesResult.rows.map(row => ({
      pid: row.pid,
      user: row.usename,
      application: row.application_name,
      state: row.state,
      duration: `${row.duration_seconds}s`,
      query: (row.query as string).substring(0, 100) + '...'
    }));
    
    // Check disk usage for largest tables
    const diskUsageResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);
    
    healthChecks.largestTables = diskUsageResult.rows.map(row => ({
      table: row.tablename,
      size: row.size
    }));
    
    // Migration status - first ensure table exists
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
    `).catch(() => {});
    
    const migrationResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        MAX(applied_at) as last_migration_date
      FROM migration_history
    `).catch(() => ({ rows: [{ total: 0, successful: 0, failed: 0, last_migration_date: null }] }));
    
    healthChecks.migrations = {
      total: parseInt(migrationResult.rows[0]?.total as string || '0'),
      successful: parseInt(migrationResult.rows[0]?.successful as string || '0'),
      failed: parseInt(migrationResult.rows[0]?.failed as string || '0'),
      lastApplied: migrationResult.rows[0]?.last_migration_date || null
    };
    
    // Overall health score
    const issues = [];
    if (healthChecks.connections.active > 50) issues.push('High active connections');
    if (healthChecks.longRunningQueries.length > 0) issues.push('Long-running queries detected');
    if (healthChecks.migrations.failed > 0) issues.push('Failed migrations exist');
    if (healthChecks.tables.some((t: any) => !t.exists && keyTables.includes(t.table))) {
      issues.push('Missing critical tables');
    }
    
    healthChecks.status = issues.length === 0 ? 'healthy' : 'warning';
    healthChecks.issues = issues;

    return NextResponse.json({
      ...healthChecks,
      success: true,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      { 
        error: 'Database health check failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}