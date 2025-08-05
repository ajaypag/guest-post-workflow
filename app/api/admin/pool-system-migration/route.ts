import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Add new columns if they don't exist
    console.log('Adding pool columns...');
    await db.execute(sql`
      ALTER TABLE order_site_submissions 
      ADD COLUMN IF NOT EXISTS selection_pool VARCHAR(20) DEFAULT 'primary',
      ADD COLUMN IF NOT EXISTS pool_rank INTEGER DEFAULT 1
    `);

    // Step 2: Create index
    console.log('Creating pool index...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_pool 
      ON order_site_submissions(order_group_id, selection_pool, pool_rank)
    `);

    // Step 3: Get all order groups with their target page counts
    console.log('Fetching order groups...');
    const groups = await db.query.orderGroups.findMany({
      columns: {
        id: true,
        targetPages: true,
        linkCount: true
      }
    });

    let migratedCount = 0;
    const errors: string[] = [];

    // Step 4: Process each order group
    for (const group of groups) {
      try {
        // Count how many times each target URL appears
        const targetUrlCounts = new Map<string, number>();
        
        if (group.targetPages && Array.isArray(group.targetPages)) {
          (group.targetPages as any[]).forEach(page => {
            const url = page.url;
            if (url) {
              targetUrlCounts.set(url, (targetUrlCounts.get(url) || 0) + 1);
            }
          });
        }

        // Get all submissions for this group
        const submissions = await db.query.orderSiteSubmissions.findMany({
          where: eq(orderSiteSubmissions.orderGroupId, group.id),
          orderBy: [
            // Prioritize client approved first
            sql`CASE WHEN submission_status = 'client_approved' THEN 0 ELSE 1 END`,
            // Then by creation date
            sql`created_at ASC`
          ]
        });

        // Group submissions by target URL
        const submissionsByUrl = new Map<string, typeof submissions>();
        submissions.forEach(sub => {
          const url = sub.metadata?.targetPageUrl || 'unassigned';
          if (!submissionsByUrl.has(url)) {
            submissionsByUrl.set(url, []);
          }
          submissionsByUrl.get(url)!.push(sub);
        });

        // Update each URL group
        for (const [url, urlSubmissions] of submissionsByUrl) {
          const requiredCount = targetUrlCounts.get(url) || 0;
          
          // Sort to ensure client_approved come first
          urlSubmissions.sort((a, b) => {
            if (a.submissionStatus === 'client_approved' && b.submissionStatus !== 'client_approved') return -1;
            if (a.submissionStatus !== 'client_approved' && b.submissionStatus === 'client_approved') return 1;
            return 0;
          });

          // Update pool assignments
          for (let i = 0; i < urlSubmissions.length; i++) {
            const submission = urlSubmissions[i];
            const isWithinRequiredCount = i < requiredCount;
            
            await db
              .update(orderSiteSubmissions)
              .set({
                selectionPool: isWithinRequiredCount ? 'primary' : 'alternative',
                poolRank: isWithinRequiredCount ? i + 1 : i - requiredCount + 1,
                updatedAt: new Date()
              })
              .where(eq(orderSiteSubmissions.id, submission.id));
            
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing group ${group.id}:`, error);
        errors.push(`Group ${group.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 5: Report results
    const summary = await db.execute(sql`
      SELECT 
        selection_pool,
        COUNT(*) as count
      FROM order_site_submissions
      GROUP BY selection_pool
    `);

    return NextResponse.json({
      success: true,
      message: 'Pool system migration completed',
      migratedCount,
      summary: summary.rows,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check auth
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check migration status
    const summary = await db.execute(sql`
      SELECT 
        selection_pool,
        COUNT(*) as count,
        COUNT(DISTINCT order_group_id) as group_count
      FROM order_site_submissions
      GROUP BY selection_pool
    `);

    const hasPoolColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_site_submissions' 
      AND column_name = 'selection_pool'
    `);

    return NextResponse.json({
      migrated: hasPoolColumn.rows.length > 0,
      summary: summary.rows,
      message: hasPoolColumn.rows.length > 0 
        ? 'Pool system is active' 
        : 'Pool system not yet migrated'
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}