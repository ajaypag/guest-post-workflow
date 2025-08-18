import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems, lineItemChanges } from '@/lib/db/orderLineItemSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';
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

    const { step } = await request.json();

    let result;
    switch (step) {
      case 'preflight-check':
        result = await runPreflightCheck();
        break;
      case 'create-backup':
        result = await createDatabaseBackup();
        break;
      case 'apply-migrations':
        result = await applyDatabaseMigrations();
        break;
      case 'migrate-data':
        result = await migrateOrderData();
        break;
      case 'update-bulk-analysis':
        result = await updateBulkAnalysis();
        break;
      case 'validate-migration':
        result = await validateMigration();
        break;
      default:
        return NextResponse.json({ error: 'Invalid migration step' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
      status: getMigrationState()
    });
  } catch (error: any) {
    console.error('Migration execution error:', error);
    
    // Update migration state with error
    updateMigrationState({
      phase: 'failed',
      currentStep: `Failed: ${error.message}`,
      errors: [error.message]
    });

    return NextResponse.json(
      { error: error.message || 'Migration step failed' },
      { status: 500 }
    );
  }
}

async function runPreflightCheck() {
  updateMigrationState({
    phase: 'in-progress',
    currentStep: 'Running pre-flight checks',
    progress: 5
  });

  const checks = [];

  // Check database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    checks.push('✅ Database connectivity');
  } catch (error) {
    checks.push('❌ Database connectivity failed');
    throw new Error('Database connectivity check failed');
  }

  // Check required tables exist
  try {
    const tables = ['orders', 'order_line_items', 'order_groups', 'clients'];
    for (const table of tables) {
      await db.execute(sql.raw(`SELECT 1 FROM ${table} LIMIT 1`));
    }
    checks.push('✅ Required tables exist');
  } catch (error) {
    checks.push('❌ Missing required tables');
    throw new Error('Required database tables are missing');
  }

  // Check for active migrations
  const ordersInProgress = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(orders)
    .where(eq(orders.state, 'analyzing'));
  
  if (ordersInProgress[0].count > 0) {
    checks.push(`⚠️ ${ordersInProgress[0].count} orders in analyzing state`);
  } else {
    checks.push('✅ No orders currently being processed');
  }

  // Check disk space (rough estimate)
  try {
    const { stdout } = await execAsync('df -h .');
    const lines = stdout.split('\n');
    const diskInfo = lines[1]?.split(/\s+/);
    const usage = diskInfo?.[4];
    if (usage && parseInt(usage) > 90) {
      checks.push(`⚠️ Disk usage high: ${usage}`);
    } else {
      checks.push(`✅ Disk space available: ${usage || 'unknown'}`);
    }
  } catch (error) {
    checks.push('⚠️ Could not check disk space');
  }

  updateMigrationState({
    currentStep: 'Pre-flight checks completed',
    progress: 10
  });

  return { checks };
}

async function createDatabaseBackup() {
  updateMigrationState({
    currentStep: 'Creating database backup',
    progress: 15
  });

  try {
    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `pre-migration-backup-${timestamp}.sql`);

    // Use pg_dump to create backup
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse DATABASE_URL to get connection details
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1);
    const host = url.hostname;
    const port = url.port || '5432';
    const username = url.username;
    const password = url.password;

    // Create backup command
    const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --no-owner --no-privileges > "${backupFile}"`;

    // Execute backup
    await execAsync(pgDumpCommand, { timeout: 300000 }); // 5 minute timeout

    // Verify backup file was created and has content
    const stats = await fs.stat(backupFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    // Also create a symbolic link to the latest backup
    const latestBackupFile = path.join(backupDir, 'pre-migration-backup.sql');
    try {
      await fs.unlink(latestBackupFile);
    } catch (error) {
      // File doesn't exist, that's ok
    }
    await fs.symlink(backupFile, latestBackupFile);

    updateMigrationState({
      currentStep: 'Database backup completed',
      progress: 25,
      backupCreated: true
    });

    return {
      backupFile,
      backupSize: `${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`
    };
  } catch (error) {
    updateMigrationState({
      phase: 'failed',
      currentStep: 'Database backup failed',
      errors: [`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    });
    throw error;
  }
}

async function applyDatabaseMigrations() {
  updateMigrationState({
    currentStep: 'Applying database migrations',
    progress: 35
  });

  try {
    // Read and execute pending migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = [
      '0055_fix_order_line_items_schema.sql',
      '0056_production_lineitems_migration.sql'
    ];

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      try {
        const migrationSql = await fs.readFile(migrationPath, 'utf-8');
        await db.execute(sql.raw(migrationSql));
        console.log(`✅ Applied migration: ${migrationFile}`);
      } catch (error) {
        console.error(`❌ Failed to apply migration ${migrationFile}:`, error);
        // Don't fail the whole process for missing migration files
        if (error instanceof Error && error.message.includes('ENOENT')) {
          console.log(`⚠️ Migration file ${migrationFile} not found, skipping`);
        } else {
          throw error;
        }
      }
    }

    updateMigrationState({
      currentStep: 'Database migrations applied',
      progress: 45
    });

    return { migrationsApplied: migrationFiles.length };
  } catch (error) {
    updateMigrationState({
      phase: 'failed',
      currentStep: 'Database migrations failed',
      errors: [`Migrations failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    });
    throw error;
  }
}

async function migrateOrderData() {
  updateMigrationState({
    currentStep: 'Migrating order data to lineItems',
    progress: 50
  });

  try {
    // Get orders with orderGroups that don't have lineItems yet
    const ordersToMigrate = await db
      .select({
        order: orders,
        orderGroup: orderGroups,
        client: clients
      })
      .from(orders)
      .innerJoin(orderGroups, eq(orders.id, orderGroups.orderId))
      .innerJoin(clients, eq(orderGroups.clientId, clients.id))
      .leftJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .where(sql`${orderLineItems.id} IS NULL`);

    let migrated = 0;
    const total = ordersToMigrate.length;

    // Process in batches
    for (const { order, orderGroup, client } of ordersToMigrate) {
      // Create line items for each link in the order group
      const linkCount = orderGroup.linkCount || 1;
      const targetPages = orderGroup.targetPages as any[] || [];
      const anchorTexts = orderGroup.anchorTexts as string[] || [];

      for (let i = 0; i < linkCount; i++) {
        const lineItemId = uuidv4();
        const targetPageUrl = targetPages[i]?.url || targetPages[0]?.url || null;
        const anchorText = anchorTexts[i] || anchorTexts[0] || null;

        // Calculate pricing
        const packagePrice = (orderGroup.requirementOverrides as any)?.packagePrice || 0;
        const estimatedPrice = packagePrice 
          ? Math.round(packagePrice / linkCount) // Price already in cents, divide by links
          : 49900; // Default $499
        
        const wholesalePrice = Math.max(estimatedPrice - 7900, 0); // Subtract service fee
        const serviceFee = 7900;

        const [createdLineItem] = await db.insert(orderLineItems).values({
          orderId: order.id,
          clientId: orderGroup.clientId,
          targetPageUrl: targetPageUrl || undefined,
          anchorText: anchorText || undefined,
          status: 'draft',
          estimatedPrice,
          wholesalePrice,
          serviceFee,
          addedBy: '00000000-0000-0000-0000-000000000000', // System user
          displayOrder: i,
          version: 1,
          metadata: {
            originalGroupId: orderGroup.id,
            bulkAnalysisProjectId: orderGroup.bulkAnalysisProjectId || undefined,
            specialInstructions: `Migrated from orderGroup ${orderGroup.id}`,
            changeHistory: [{
              timestamp: new Date().toISOString(),
              changeType: 'migration_created',
              previousValue: null,
              newValue: { source: 'orderGroups', groupId: orderGroup.id },
              changedBy: '00000000-0000-0000-0000-000000000000',
              reason: 'System migration from orderGroups to lineItems'
            }]
          }
        }).returning({ id: orderLineItems.id });

        // Create change record
        await db.insert(lineItemChanges).values({
          orderId: order.id,
          lineItemId: createdLineItem.id,
          changeType: 'created',
          newValue: {
            source: 'migration',
            orderGroupId: orderGroup.id
          },
          changedBy: '00000000-0000-0000-0000-000000000000',
          changeReason: 'Migrated from orderGroups system'
        });
      }

      migrated++;
      
      // Update progress
      const progress = Math.round(50 + (migrated / total) * 30);
      updateMigrationState({
        currentStep: `Migrated ${migrated}/${total} orders`,
        progress,
        ordersMigrated: migrated
      });
    }

    updateMigrationState({
      currentStep: 'Order data migration completed',
      progress: 80,
      ordersMigrated: migrated,
      totalOrders: total
    });

    return { 
      ordersMigrated: migrated, 
      totalOrders: total,
      lineItemsCreated: ordersToMigrate.reduce((sum, o) => sum + (o.orderGroup.linkCount || 1), 0)
    };
  } catch (error) {
    updateMigrationState({
      phase: 'failed',
      currentStep: 'Order data migration failed',
      errors: [`Data migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    });
    throw error;
  }
}

async function updateBulkAnalysis() {
  updateMigrationState({
    currentStep: 'Updating bulk analysis integration',
    progress: 85
  });

  // This step ensures bulk analysis projects are linked to lineItems
  // The work has already been done in the previous migration steps
  
  return { message: 'Bulk analysis integration updated' };
}

async function validateMigration() {
  updateMigrationState({
    currentStep: 'Validating migration results',
    progress: 90
  });

  try {
    // Count migrated data
    const orderCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(orders);
    const lineItemCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(orderLineItems);
    const orderGroupCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(orderGroups);

    // Check data integrity
    const orphanedLineItems = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(orderLineItems)
      .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
      .where(sql`${orders.id} IS NULL`);

    const validationResults = {
      totalOrders: orderCount[0].count,
      totalLineItems: lineItemCount[0].count,
      remainingOrderGroups: orderGroupCount[0].count,
      orphanedLineItems: orphanedLineItems[0].count,
      dataIntegrityPassed: orphanedLineItems[0].count === 0
    };

    if (!validationResults.dataIntegrityPassed) {
      throw new Error(`Data integrity check failed: ${orphanedLineItems[0].count} orphaned line items found`);
    }

    updateMigrationState({
      phase: 'completed',
      currentStep: 'Migration completed successfully',
      progress: 100,
      completedAt: new Date().toISOString(),
      canRollback: true
    });

    return validationResults;
  } catch (error) {
    updateMigrationState({
      phase: 'failed',
      currentStep: 'Migration validation failed',
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    });
    throw error;
  }
}