import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { projectOrderAssociations, orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if tables exist
    const tablesExist = await checkTablesExist();
    
    // Count existing associations
    const existingAssociations = tablesExist.projectOrderAssociations 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(projectOrderAssociations)
          .then(r => r[0]?.count || 0)
      : 0;
    
    // Count order groups that need migration (have bulkAnalysisProjectId)
    const orderGroupsToMigrate = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId))
      .then(r => r[0]?.count || 0);
    
    // Check for any issues
    const errors: string[] = [];
    
    if (!tablesExist.projectOrderAssociations) {
      errors.push('project_order_associations table does not exist');
    }
    
    if (!tablesExist.orderSiteSubmissions) {
      errors.push('order_site_submissions table does not exist');
    }
    
    // Check for duplicate project associations that would violate unique constraint
    const duplicateCheck = await db
      .select({ 
        orderGroupId: orderGroups.id,
        projectId: orderGroups.bulkAnalysisProjectId,
        count: sql<number>`count(*)::int`
      })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId))
      .groupBy(orderGroups.id, orderGroups.bulkAnalysisProjectId)
      .having(sql`count(*) > 1`);
    
    if (duplicateCheck.length > 0) {
      errors.push('Found duplicate project associations that need manual resolution');
    }
    
    return NextResponse.json({
      tableExists: tablesExist.projectOrderAssociations && tablesExist.orderSiteSubmissions,
      existingAssociations,
      orderGroupsToMigrate,
      readyToMigrate: errors.length === 0 && tablesExist.projectOrderAssociations,
      errors,
    });
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to check migration status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal' || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action = 'migrate' } = await request.json();

    if (action === 'reverse') {
      return await reverseMigration(session);
    }

    const migrationDetails: any[] = [];
    let migrated = 0;
    let failed = 0;

    // Create tables if they don't exist
    await createTablesIfNotExists();

    // Get all order groups with bulkAnalysisProjectId
    const groupsToMigrate = await db
      .select({
        id: orderGroups.id,
        orderId: orderGroups.orderId,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
      })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId));

    // Migrate each order group
    for (const group of groupsToMigrate) {
      try {
        // Check if association already exists
        const existing = await db
          .select()
          .from(projectOrderAssociations)
          .where(
            and(
              eq(projectOrderAssociations.orderGroupId, group.id),
              eq(projectOrderAssociations.projectId, group.bulkAnalysisProjectId!)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Create new association
          await db.insert(projectOrderAssociations).values({
            orderId: group.orderId,
            orderGroupId: group.id,
            projectId: group.bulkAnalysisProjectId!,
            associationType: 'primary',
            createdBy: session.userId,
            notes: {
              reason: 'Migrated from direct bulkAnalysisProjectId reference',
              migrationData: {
                migratedAt: new Date().toISOString(),
                migratedBy: session.userId,
              }
            }
          });
          
          migrated++;
          migrationDetails.push({
            orderGroupId: group.id,
            orderId: group.orderId,
            projectId: group.bulkAnalysisProjectId,
            status: 'success',
          });
        } else {
          // Already migrated, skip
          migrationDetails.push({
            orderGroupId: group.id,
            orderId: group.orderId,
            projectId: group.bulkAnalysisProjectId,
            status: 'success',
            note: 'Already migrated',
          });
        }
      } catch (error) {
        failed++;
        migrationDetails.push({
          orderGroupId: group.id,
          orderId: group.orderId,
          projectId: group.bulkAnalysisProjectId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: failed === 0,
      migrated,
      failed,
      errors: failed > 0 ? [`Failed to migrate ${failed} associations`] : [],
      details: migrationDetails,
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}

async function checkTablesExist() {
  try {
    // Check project_order_associations table
    const projectOrderAssociationsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_order_associations'
      ) as exists
    `).then(r => (r.rows[0] as any).exists);

    // Check order_site_submissions table
    const orderSiteSubmissionsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'order_site_submissions'
      ) as exists
    `).then(r => (r.rows[0] as any).exists);

    return {
      projectOrderAssociations: projectOrderAssociationsExists,
      orderSiteSubmissions: orderSiteSubmissionsExists,
    };
  } catch (error) {
    console.error('Failed to check tables:', error);
    return {
      projectOrderAssociations: false,
      orderSiteSubmissions: false,
    };
  }
}

async function createTablesIfNotExists() {
  try {
    // Create project_order_associations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_order_associations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE,
        association_type VARCHAR(50) NOT NULL DEFAULT 'primary',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by UUID NOT NULL REFERENCES users(id),
        notes JSONB,
        UNIQUE(order_group_id, project_id)
      )
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_proj_order_assoc_order ON project_order_associations(order_id);
      CREATE INDEX IF NOT EXISTS idx_proj_order_assoc_project ON project_order_associations(project_id);
      CREATE INDEX IF NOT EXISTS idx_proj_order_assoc_order_group ON project_order_associations(order_group_id);
    `);

    // Create order_site_submissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_site_submissions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
        domain_id UUID NOT NULL,
        submission_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        submitted_at TIMESTAMP,
        submitted_by UUID REFERENCES users(id),
        client_reviewed_at TIMESTAMP,
        client_review_notes TEXT,
        published_url TEXT,
        published_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for order_site_submissions
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_order_group ON order_site_submissions(order_group_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_domain ON order_site_submissions(domain_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON order_site_submissions(submission_status);
    `);

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Failed to create tables:', error);
    throw error;
  }
}

async function reverseMigration(session: any) {
  try {
    const reverseDetails: any[] = [];
    let restored = 0;
    let failed = 0;

    // Get all associations that were migrated
    const associations = await db
      .select({
        orderGroupId: projectOrderAssociations.orderGroupId,
        projectId: projectOrderAssociations.projectId,
        notes: projectOrderAssociations.notes,
      })
      .from(projectOrderAssociations)
      .where(eq(projectOrderAssociations.associationType, 'primary'));

    // Restore bulkAnalysisProjectId for each association
    for (const assoc of associations) {
      try {
        // Check if this was a migrated association
        const notes = assoc.notes as any;
        if (notes?.reason === 'Migrated from direct bulkAnalysisProjectId reference') {
          // Update order group to restore the direct reference
          await db
            .update(orderGroups)
            .set({ bulkAnalysisProjectId: assoc.projectId })
            .where(eq(orderGroups.id, assoc.orderGroupId));

          restored++;
          reverseDetails.push({
            orderGroupId: assoc.orderGroupId,
            projectId: assoc.projectId,
            status: 'restored',
          });
        }
      } catch (error) {
        failed++;
        reverseDetails.push({
          orderGroupId: assoc.orderGroupId,
          projectId: assoc.projectId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Optionally delete the associations after restoring
    // This is commented out for safety - uncomment if you want to fully reverse
    // await db.delete(projectOrderAssociations).where(
    //   sql`notes->>'reason' = 'Migrated from direct bulkAnalysisProjectId reference'`
    // );

    return NextResponse.json({
      success: failed === 0,
      action: 'reverse',
      restored,
      failed,
      errors: failed > 0 ? [`Failed to restore ${failed} associations`] : [],
      details: reverseDetails,
      note: 'Direct references restored. Junction table associations preserved for safety.',
    });
  } catch (error) {
    console.error('Reverse migration failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Reverse migration failed'
    }, { status: 500 });
  }
}