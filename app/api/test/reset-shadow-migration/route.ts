import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    // Reset migration status for all shadow websites of this publisher
    const updated = await db
      .update(shadowPublisherWebsites)
      .set({
        migrationStatus: null,
        migratedAt: null,
        migrationNotes: null,
        updatedAt: new Date()
      })
      .where(eq(shadowPublisherWebsites.publisherId, publisherId))
      .returning();
    
    return NextResponse.json({
      success: true,
      message: 'Reset shadow migration status',
      publisherId,
      resetCount: updated.length
    });
    
  } catch (error) {
    console.error('Failed to reset shadow migration:', error);
    return NextResponse.json(
      { error: 'Failed to reset shadow migration' },
      { status: 500 }
    );
  }
}