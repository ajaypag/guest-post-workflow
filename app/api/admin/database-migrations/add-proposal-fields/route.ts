import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('🔧 Starting proposal fields migration...');

    // Add proposal_video_url column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS proposal_video_url TEXT
    `);
    console.log('✅ Added proposal_video_url column');

    // Add proposal_message column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS proposal_message TEXT
    `);
    console.log('✅ Added proposal_message column');

    // Verify columns were added
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('proposal_video_url', 'proposal_message')
    `);

    const addedColumns = result.rows.map(row => row.column_name);
    
    return NextResponse.json({
      success: true,
      message: 'Proposal fields migration completed successfully',
      details: {
        columnsAdded: addedColumns,
        count: addedColumns.length
      }
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}