import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';
import { projectOrderAssociations } from '../lib/db/projectOrderAssociationsSchema';
import { orderGroups } from '../lib/db/orderGroupSchema';
import { isNotNull } from 'drizzle-orm';

async function testMigration() {
  console.log('Testing project-order associations migration...\n');

  try {
    // Check if tables exist
    const tablesExist = await checkTablesExist();
    console.log('Tables exist:', tablesExist);

    // Count existing associations
    if (tablesExist.projectOrderAssociations) {
      const associations = await db.select({ count: sql<number>`count(*)::int` })
        .from(projectOrderAssociations);
      console.log('Existing associations:', associations[0]?.count || 0);
    }

    // Count order groups that need migration
    const groupsToMigrate = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId));
    console.log('Order groups to migrate:', groupsToMigrate[0]?.count || 0);

    // Get sample order groups with projects
    const sampleGroups = await db
      .select({
        id: orderGroups.id,
        orderId: orderGroups.orderId,
        bulkAnalysisProjectId: orderGroups.bulkAnalysisProjectId,
      })
      .from(orderGroups)
      .where(isNotNull(orderGroups.bulkAnalysisProjectId))
      .limit(5);
    
    if (sampleGroups.length > 0) {
      console.log('\nSample order groups with projects:');
      sampleGroups.forEach((group, i) => {
        console.log(`${i + 1}. Group: ${group.id.slice(0, 8)}... | Project: ${group.bulkAnalysisProjectId?.slice(0, 8)}...`);
      });
    }

    // Create tables if they don't exist
    if (!tablesExist.projectOrderAssociations || !tablesExist.orderSiteSubmissions) {
      console.log('\nCreating missing tables...');
      await createTablesIfNotExists();
      console.log('Tables created successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

async function checkTablesExist() {
  const projectOrderAssociationsExists = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'project_order_associations'
    ) as exists
  `).then(r => (r.rows[0] as any).exists);

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
}

async function createTablesIfNotExists() {
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
}

testMigration();