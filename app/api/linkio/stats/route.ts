import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { linkioPages } from '@/lib/db/linkioSchema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get counts by status
    const statusCounts = await db.execute(sql`
      SELECT 
        recreation_status,
        COUNT(*) as count
      FROM linkio_pages
      GROUP BY recreation_status
    `);
    
    // Get counts by page type
    const typeCounts = await db.execute(sql`
      SELECT 
        page_type,
        COUNT(*) as count
      FROM linkio_pages
      GROUP BY page_type
      ORDER BY count DESC
    `);
    
    // Get priority breakdown
    const priorityCounts = await db.execute(sql`
      SELECT 
        priority,
        COUNT(*) as count
      FROM linkio_pages
      GROUP BY priority
    `);
    
    // Get recent activity
    const recentActivity = await db.execute(sql`
      SELECT 
        id,
        original_title,
        recreation_status,
        updated_at
      FROM linkio_pages
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    // Calculate progress percentage
    const total = await db.execute(sql`SELECT COUNT(*) as count FROM linkio_pages`);
    const completed = await db.execute(sql`
      SELECT COUNT(*) as count FROM linkio_pages 
      WHERE recreation_status IN ('completed', 'published', 'skipped')
    `);
    
    const totalCount = Number(total.rows[0]?.count) || 0;
    const completedCount = Number(completed.rows[0]?.count) || 0;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return NextResponse.json({
      stats: {
        total: totalCount,
        completed: completedCount,
        progressPercentage,
        byStatus: statusCounts.rows,
        byType: typeCounts.rows,
        byPriority: priorityCounts.rows,
        recentActivity: recentActivity.rows
      }
    });
  } catch (error) {
    console.error('Error fetching Linkio stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}