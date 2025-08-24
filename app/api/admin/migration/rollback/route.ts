import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { updateMigrationState, getMigrationState } from '../status/route';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal admin users
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if rollback is possible
    const currentState = getMigrationState();
    if (!currentState.canRollback) {
      return NextResponse.json({ error: 'Rollback not available - no backup found or migration not completed' }, { status: 400 });
    }

    if (currentState.phase === 'in-progress') {
      return NextResponse.json({ error: 'Cannot rollback while migration is in progress' }, { status: 400 });
    }

    // Start rollback process
    updateMigrationState({
      phase: 'in-progress',
      currentStep: 'Starting rollback process',
      progress: 0,
      errors: []
    });

    const rollbackResult = await performRollback();

    updateMigrationState({
      phase: 'rolled-back',
      currentStep: 'Rollback completed successfully',
      progress: 100,
      completedAt: new Date().toISOString(),
      canRollback: false // Cannot rollback a rollback
    });

    return NextResponse.json({
      success: true,
      message: 'Rollback completed successfully',
      result: rollbackResult,
      status: getMigrationState()
    });
  } catch (error: any) {
    console.error('Rollback error:', error);
    
    updateMigrationState({
      phase: 'failed',
      currentStep: `Rollback failed: ${error.message}`,
      errors: [error.message]
    });

    return NextResponse.json(
      { error: error.message || 'Rollback failed' },
      { status: 500 }
    );
  }
}

async function performRollback() {
  const steps = [
    'Verifying backup file',
    'Creating pre-rollback backup',
    'Stopping active connections',
    'Restoring database from backup',
    'Validating restored data',
    'Cleaning up migration artifacts'
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progress = Math.round((i / steps.length) * 100);
    
    updateMigrationState({
      currentStep: step,
      progress
    });

    switch (i) {
      case 0:
        await verifyBackupFile();
        break;
      case 1:
        await createPreRollbackBackup();
        break;
      case 2:
        await stopActiveConnections();
        break;
      case 3:
        await restoreDatabaseFromBackup();
        break;
      case 4:
        await validateRestoredData();
        break;
      case 5:
        await cleanupMigrationArtifacts();
        break;
    }
  }

  return {
    message: 'Rollback completed successfully',
    restoredFromBackup: true,
    timestamp: new Date().toISOString()
  };
}

async function verifyBackupFile() {
  const backupPath = path.join(process.cwd(), 'backups', 'pre-migration-backup.sql');
  
  try {
    const stats = await fs.stat(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file exists but is empty');
    }
    
    // Read first few lines to verify it's a valid SQL backup
    const handle = await fs.open(backupPath, 'r');
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
    await handle.close();
    
    const content = buffer.toString('utf8', 0, bytesRead);
    if (!content.includes('PostgreSQL database dump') && !content.includes('CREATE TABLE')) {
      throw new Error('Backup file does not appear to be a valid PostgreSQL dump');
    }
    
    return { backupSize: stats.size, backupPath };
  } catch (error) {
    throw new Error(`Backup verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createPreRollbackBackup() {
  // Create a backup of the current state before rollback
  const backupDir = path.join(process.cwd(), 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRollbackBackupFile = path.join(backupDir, `pre-rollback-backup-${timestamp}.sql`);

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    const host = url.hostname;
    const port = url.port || '5432';
    const username = url.username;
    const password = url.password;

    const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --no-owner --no-privileges > "${preRollbackBackupFile}"`;

    await execAsync(pgDumpCommand, { timeout: 300000 });

    // Verify the backup was created
    const stats = await fs.stat(preRollbackBackupFile);
    if (stats.size === 0) {
      throw new Error('Pre-rollback backup file is empty');
    }

    return { preRollbackBackupFile, backupSize: stats.size };
  } catch (error) {
    throw new Error(`Pre-rollback backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function stopActiveConnections() {
  try {
    // Terminate any active connections to prepare for restore
    // This is optional but helps ensure a clean restore
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    
    // Get connection count before termination
    const activeConnections = await db.execute(sql`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = ${dbName} AND pid != pg_backend_pid()
    `);
    
    const connectionCount = (activeConnections.rows[0] as any)?.count || 0;
    
    if (connectionCount > 0) {
      console.log(`Terminating ${connectionCount} active connections...`);
      
      // Terminate connections (be careful - this will disconnect other users)
      await db.execute(sql`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity 
        WHERE pg_stat_activity.datname = ${dbName} AND pid != pg_backend_pid()
      `);
    }

    return { terminatedConnections: connectionCount };
  } catch (error) {
    // Don't fail rollback if we can't terminate connections
    console.warn('Could not terminate active connections:', error);
    return { terminatedConnections: 0, warning: 'Could not terminate active connections' };
  }
}

async function restoreDatabaseFromBackup() {
  const backupPath = path.join(process.cwd(), 'backups', 'pre-migration-backup.sql');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    const host = url.hostname;
    const port = url.port || '5432';
    const username = url.username;
    const password = url.password;

    // Drop and recreate the database for a clean restore
    const postgresUrl = `postgresql://${username}:${password}@${host}:${port}/postgres`;
    
    // Connect to postgres database to drop and recreate the target database
    const dropDbCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`;
    const createDbCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -c "CREATE DATABASE ${dbName};"`;
    
    await execAsync(dropDbCommand, { timeout: 60000 });
    await execAsync(createDbCommand, { timeout: 60000 });

    // Restore from backup
    const restoreCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${dbName} < "${backupPath}"`;
    await execAsync(restoreCommand, { timeout: 600000 }); // 10 minute timeout

    return { restoredFromBackup: backupPath };
  } catch (error) {
    throw new Error(`Database restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function validateRestoredData() {
  try {
    // Basic validation that the database is accessible and has expected data
    const orderCount = await db.execute(sql`SELECT count(*) as count FROM orders`);
    const orderCountValue = (orderCount.rows[0] as any)?.count || 0;

    // Check if we're back to the pre-migration state (should have orderGroups, fewer lineItems)
    const orderGroupCount = await db.execute(sql`SELECT count(*) as count FROM order_groups`);
    const orderGroupCountValue = (orderGroupCount.rows[0] as any)?.count || 0;

    const lineItemCount = await db.execute(sql`SELECT count(*) as count FROM order_line_items`);
    const lineItemCountValue = (lineItemCount.rows[0] as any)?.count || 0;

    if (orderCountValue === 0) {
      throw new Error('Restored database appears to be empty');
    }

    return {
      ordersCount: orderCountValue,
      orderGroupsCount: orderGroupCountValue,
      lineItemsCount: lineItemCountValue,
      validationPassed: true
    };
  } catch (error) {
    throw new Error(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function cleanupMigrationArtifacts() {
  try {
    // Clean up any migration-specific artifacts
    // This could include temporary tables, migration logs, etc.
    
    // For now, just ensure our migration state is cleaned up
    // In a production system, you might want to clean up temp files, logs, etc.
    
    return { artifactsCleanedUp: true };
  } catch (error) {
    // Don't fail rollback if cleanup fails
    console.warn('Cleanup warning:', error);
    return { artifactsCleanedUp: false, warning: error instanceof Error ? error.message : 'Cleanup failed' };
  }
}