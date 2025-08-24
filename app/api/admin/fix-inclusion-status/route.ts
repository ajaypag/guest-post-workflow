import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

/**
 * Admin Migration: Fix Inclusion Status Defaults
 * 
 * Problem: Line items have NULL inclusion_status which causes:
 * - UI showing "included" but backend has NULL
 * - Broken invoicing and metrics
 * - Confusing UX
 * 
 * Solution: Set all NULL values to 'included' for better defaults
 */

export async function GET(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal access only' }, { status: 401 });
    }

    // Get current status
    const statusCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'included') as included,
        COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'excluded') as excluded,
        COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'saved_for_later') as saved,
        COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' IS NULL) as null_status
      FROM order_line_items
    `);

    const stats = statusCheck.rows[0] as any;

    // Check order_site_submissions if it exists
    let submissionsStats: any = null;
    try {
      const submissionsCheck = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE inclusion_status = 'included') as included,
          COUNT(*) FILTER (WHERE inclusion_status = 'excluded') as excluded,
          COUNT(*) FILTER (WHERE inclusion_status IS NULL) as null_status
        FROM order_site_submissions
      `);
      submissionsStats = submissionsCheck.rows[0];
    } catch (e) {
      // Table might not exist
    }

    return NextResponse.json({
      status: 'ready',
      lineItems: {
        total: Number(stats.total),
        included: Number(stats.included),
        excluded: Number(stats.excluded),
        savedForLater: Number(stats.saved),
        needsFix: Number(stats.null_status)
      },
      submissions: submissionsStats ? {
        total: Number(submissionsStats.total),
        included: Number(submissionsStats.included),
        excluded: Number(submissionsStats.excluded),
        needsFix: Number(submissionsStats.null_status)
      } : null,
      message: stats.null_status > 0 
        ? `Found ${stats.null_status} line items that need inclusion status fix`
        : 'All line items have inclusion status set correctly'
    });

  } catch (error: any) {
    console.error('Error checking inclusion status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check inclusion status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal access only' }, { status: 401 });
    }

    const body = await request.json();
    const { dryRun = false } = body;

    if (dryRun) {
      // Dry run - just show what would be updated
      const preview = await db.execute(sql`
        SELECT 
          id,
          order_id,
          client_id,
          metadata->>'inclusionStatus' as current_status,
          CASE 
            WHEN assigned_domain_id IS NOT NULL THEN 'Has assigned domain'
            ELSE 'No assigned domain'
          END as domain_status
        FROM order_line_items
        WHERE metadata->>'inclusionStatus' IS NULL 
           OR metadata->>'inclusionStatus' = ''
        LIMIT 10
      `);

      return NextResponse.json({
        dryRun: true,
        wouldUpdate: preview.rows.length,
        preview: preview.rows,
        message: `Dry run: Would update ${preview.rows.length} line items`
      });
    }

    // Actual migration
    const result = await db.transaction(async (tx) => {
      // 1. Update line items with NULL inclusion status
      const lineItemsUpdate = await tx.execute(sql`
        UPDATE order_line_items
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{inclusionStatus}',
          '"included"'::jsonb
        )
        WHERE metadata->>'inclusionStatus' IS NULL 
           OR metadata->>'inclusionStatus' = ''
      `);

      // 2. Try to update order_site_submissions if it exists
      let submissionsUpdate: any = null;
      try {
        submissionsUpdate = await tx.execute(sql`
          UPDATE order_site_submissions
          SET inclusion_status = 'included'
          WHERE inclusion_status IS NULL
        `);

        // Also try to set default for future inserts
        await tx.execute(sql`
          ALTER TABLE order_site_submissions 
          ALTER COLUMN inclusion_status SET DEFAULT 'included'
        `);
      } catch (e) {
        // Table might not exist or column might not exist
        console.log('order_site_submissions update skipped:', e);
      }

      // 3. Get updated stats
      const newStats = await tx.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' = 'included') as included,
          COUNT(*) FILTER (WHERE metadata->>'inclusionStatus' IS NULL) as null_status
        FROM order_line_items
      `);

      return {
        lineItemsUpdated: lineItemsUpdate.rowCount,
        submissionsUpdated: submissionsUpdate?.rowCount || 0,
        newStats: newStats.rows[0]
      };
    });

    return NextResponse.json({
      success: true,
      lineItemsUpdated: result.lineItemsUpdated,
      submissionsUpdated: result.submissionsUpdated,
      stats: {
        total: Number((result.newStats as any).total),
        included: Number((result.newStats as any).included),
        remaining_null: Number((result.newStats as any).null_status)
      },
      message: `Successfully updated ${result.lineItemsUpdated} line items to have 'included' status`
    });

  } catch (error: any) {
    console.error('Error applying inclusion status fix:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply inclusion status fix' },
      { status: 500 }
    );
  }
}

// Rollback endpoint if needed
export async function DELETE(request: NextRequest) {
  try {
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized - Internal access only' }, { status: 401 });
    }

    // This would rollback the changes - use with caution
    const result = await db.execute(sql`
      UPDATE order_line_items
      SET metadata = metadata - 'inclusionStatus'
      WHERE metadata->>'inclusionStatus' = 'included'
        AND created_at > NOW() - INTERVAL '1 day'
    `);

    return NextResponse.json({
      success: true,
      rolledBack: result.rowCount,
      message: `Rolled back ${result.rowCount} recently updated line items`
    });

  } catch (error: any) {
    console.error('Error rolling back inclusion status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback' },
      { status: 500 }
    );
  }
}