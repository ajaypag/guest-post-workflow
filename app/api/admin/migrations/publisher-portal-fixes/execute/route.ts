import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { confirm } = body;

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmation required' },
        { status: 400 }
      );
    }

    // Track what was done
    const changes: string[] = [];

    // Step 1: Check if offering_name column exists
    const columnCheckResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'publisher_offerings'
        AND column_name = 'offering_name'
    `);

    const hasOfferingNameColumn = columnCheckResult.rows.length > 0;

    // Step 2: Add column if it doesn't exist
    if (!hasOfferingNameColumn) {
      await db.execute(sql`
        ALTER TABLE publisher_offerings 
        ADD COLUMN offering_name VARCHAR(255)
      `);
      changes.push('Added offering_name column to publisher_offerings table');
    }

    // Step 3: Update null offering_name values with defaults
    const updateResult = await db.execute(sql`
      UPDATE publisher_offerings 
      SET offering_name = COALESCE(
        offering_name,
        CASE 
          WHEN offering_type = 'guest_post' THEN 'Guest Post'
          WHEN offering_type = 'link_insertion' THEN 'Link Insertion'
          WHEN offering_type = 'content_creation' THEN 'Content Creation'
          WHEN offering_type = 'sponsored_content' THEN 'Sponsored Content'
          WHEN offering_type = 'press_release' THEN 'Press Release'
          WHEN offering_type = 'review' THEN 'Product Review'
          ELSE INITCAP(REPLACE(offering_type, '_', ' '))
        END
      )
      WHERE offering_name IS NULL
    `);

    const rowsUpdated = updateResult.rowCount || 0;
    if (rowsUpdated > 0) {
      changes.push(`Updated ${rowsUpdated} records with default offering names`);
    }

    // Step 4: Get final status
    const finalCheckResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN offering_name IS NULL THEN 1 END) as null_count
      FROM publisher_offerings
    `);

    const finalStatus = finalCheckResult.rows[0] as any;

    // Log the migration
    console.log('Publisher Portal Migration executed:', {
      executedBy: session.userId,
      executedAt: new Date().toISOString(),
      changes
    });

    return NextResponse.json({
      success: true,
      message: changes.length > 0 
        ? 'Migration completed successfully' 
        : 'No changes needed - migration already applied',
      changes,
      stats: {
        totalOfferings: Number(finalStatus.total_count),
        nullOfferingNames: Number(finalStatus.null_count)
      }
    });

  } catch (error) {
    console.error('Error executing migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}