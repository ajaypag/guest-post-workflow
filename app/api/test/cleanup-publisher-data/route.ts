import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { shadowPublisherWebsites } from '@/lib/db/emailProcessingSchema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, dryRun = true } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Cleaning up publisher data for: ${email}`);
    
    // 1. Find the publisher
    const publisher = await db.select().from(publishers).where(eq(publishers.email, email)).limit(1);
    
    if (publisher.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No publisher found with that email'
      });
    }
    
    const publisherId = publisher[0].id;
    console.log(`📍 Found publisher: ${publisherId}`);
    
    const deletionSummary: string[] = [];
    
    if (!dryRun) {
      // 2. Delete publisher offering relationships
      const relationshipsResult = await db.delete(publisherOfferingRelationships)
        .where(eq(publisherOfferingRelationships.publisherId, publisherId));
      deletionSummary.push(`Deleted publisher offering relationships`);
      
      // 3. Delete publisher offerings
      const offeringsResult = await db.delete(publisherOfferings)
        .where(eq(publisherOfferings.publisherId, publisherId));
      deletionSummary.push(`Deleted publisher offerings`);
      
      // 4. Delete shadow publisher websites
      const shadowResult = await db.delete(shadowPublisherWebsites)
        .where(eq(shadowPublisherWebsites.publisherId, publisherId));
      deletionSummary.push(`Deleted shadow publisher websites`);
      
      // 5. Delete automation logs (to avoid foreign key constraint)
      await db.execute(sql`DELETE FROM publisher_automation_logs WHERE publisher_id = ${publisherId}`);
      deletionSummary.push(`Deleted automation logs for publisher`);
      
      // 6. Delete the publisher
      const publisherResult = await db.delete(publishers)
        .where(eq(publishers.id, publisherId));
      deletionSummary.push(`Deleted publisher record`);
      
      console.log(`✅ Cleanup complete for ${email}`);
    } else {
      // Count what would be deleted
      const relationshipsCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(publisherOfferingRelationships)
        .where(eq(publisherOfferingRelationships.publisherId, publisherId));
        
      const offeringsCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(publisherOfferings)
        .where(eq(publisherOfferings.publisherId, publisherId));
        
      const shadowCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(shadowPublisherWebsites)
        .where(eq(shadowPublisherWebsites.publisherId, publisherId));
      
      deletionSummary.push(`[DRY RUN] Would delete ${relationshipsCount[0]?.count || 0} publisher offering relationships`);
      deletionSummary.push(`[DRY RUN] Would delete ${offeringsCount[0]?.count || 0} publisher offerings`);
      deletionSummary.push(`[DRY RUN] Would delete ${shadowCount[0]?.count || 0} shadow publisher websites`);
      deletionSummary.push(`[DRY RUN] Would delete 1 publisher record`);
      
      console.log(`✅ Analysis complete for ${email}`);
    }
    
    return NextResponse.json({
      success: true,
      publisherId,
      email,
      deletionSummary,
      dryRun
    });
    
  } catch (error) {
    console.error('Failed to cleanup publisher data:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup publisher data' },
      { status: 500 }
    );
  }
}