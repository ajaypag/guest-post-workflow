import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if offering_name column exists
    const columnCheckResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'publisher_offerings'
        AND column_name = 'offering_name'
    `);

    const hasOfferingNameColumn = columnCheckResult.rows.length > 0;
    
    let columnInfo = null;
    if (hasOfferingNameColumn) {
      const col = columnCheckResult.rows[0] as any;
      columnInfo = {
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        characterMaxLength: col.character_maximum_length
      };
    }

    // Get total count of publisher_offerings
    const totalCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM publisher_offerings
    `);
    const totalOfferingsCount = Number((totalCountResult.rows[0] as any).count);

    // Get count of null offering_name values (if column exists)
    let nullOfferingNameCount = 0;
    if (hasOfferingNameColumn) {
      const nullCountResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM publisher_offerings 
        WHERE offering_name IS NULL
      `);
      nullOfferingNameCount = Number((nullCountResult.rows[0] as any).count);
    }

    // Determine if migration is needed
    const needsMigration = !hasOfferingNameColumn || 
                          (hasOfferingNameColumn && nullOfferingNameCount > 0);

    return NextResponse.json({
      hasOfferingNameColumn,
      nullOfferingNameCount,
      totalOfferingsCount,
      needsMigration,
      columnInfo
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}