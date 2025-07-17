import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { outlineSessions } from '@/lib/db/schema';
import { and, or, eq } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('🧹 Starting cleanup of failed outline sessions...');

    // Find all failed sessions that are still marked as active
    const failedActiveSessions = await db.select()
      .from(outlineSessions)
      .where(
        and(
          or(
            eq(outlineSessions.status, 'error'),
            eq(outlineSessions.status, 'failed'),
            eq(outlineSessions.status, 'cancelled')
          ),
          eq(outlineSessions.isActive, true)
        )
      );

    console.log(`Found ${failedActiveSessions.length} failed sessions that are still marked as active`);

    // Update them to be inactive
    let cleaned = 0;
    for (const session of failedActiveSessions) {
      await db.update(outlineSessions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(outlineSessions.id, session.id));
      
      cleaned++;
    }

    console.log(`✅ Cleaned up ${cleaned} failed sessions`);

    // Also clean up any sessions that have been in 'queued' or 'in_progress' state for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const stuckSessions = await db.select()
      .from(outlineSessions)
      .where(
        and(
          or(
            eq(outlineSessions.status, 'queued'),
            eq(outlineSessions.status, 'in_progress')
          ),
          eq(outlineSessions.isActive, true)
        )
      );

    let stuckCleaned = 0;
    for (const session of stuckSessions) {
      if (session.startedAt < thirtyMinutesAgo) {
        await db.update(outlineSessions)
          .set({
            status: 'error',
            isActive: false,
            errorMessage: 'Session timed out after 30 minutes',
            updatedAt: new Date()
          })
          .where(eq(outlineSessions.id, session.id));
        
        stuckCleaned++;
      }
    }

    console.log(`✅ Also cleaned up ${stuckCleaned} stuck sessions`);

    return NextResponse.json({
      success: true,
      cleaned: cleaned + stuckCleaned,
      details: {
        failedSessions: cleaned,
        stuckSessions: stuckCleaned
      }
    });

  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions', details: error },
      { status: 500 }
    );
  }
}