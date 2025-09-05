import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require internal user authentication for this deletion operation
    const session = await requireInternalUser(request);
    if (session instanceof NextResponse) {
      return session;
    }
    
    console.log(`🔐 Delete orphaned offerings initiated by internal user: ${session.email}`);
    
    const body = await request.json();
    const { dryRun = true } = body;
    
    console.log(`🗑️ ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Deleting orphaned offerings`);
    
    // 1. Get all publishers with orphaned offerings
    const allPublishers = await db.select().from(publishers);
    console.log(`📊 Analyzing ${allPublishers.length} publishers for orphaned offerings`);
    
    const publishersWithOrphans: any[] = [];
    let totalOrphanedOfferings = 0;
    
    // Find publishers with orphaned offerings
    for (const publisher of allPublishers) {
      const orphanedOfferings = await db
        .select({
          id: publisherOfferings.id,
          offeringName: publisherOfferings.offeringName,
          offeringType: publisherOfferings.offeringType,
          basePrice: publisherOfferings.basePrice
        })
        .from(publisherOfferings)
        .leftJoin(publisherOfferingRelationships, eq(publisherOfferingRelationships.offeringId, publisherOfferings.id))
        .where(and(
          eq(publisherOfferings.publisherId, publisher.id),
          sql`${publisherOfferingRelationships.id} IS NULL`
        ));
      
      if (orphanedOfferings.length > 0) {
        publishersWithOrphans.push({
          publisherId: publisher.id,
          email: publisher.email,
          contactName: publisher.contactName,
          orphanedOfferings: orphanedOfferings
        });
        totalOrphanedOfferings += orphanedOfferings.length;
      }
    }
    
    console.log(`🚨 Found ${publishersWithOrphans.length} publishers with ${totalOrphanedOfferings} orphaned offerings to delete`);
    
    if (totalOrphanedOfferings === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned offerings found',
        deletedOfferings: 0,
        affectedPublishers: 0
      });
    }
    
    const deletionResults: any[] = [];
    let totalDeleted = 0;
    
    // 2. Delete orphaned offerings for each publisher
    for (const publisherData of publishersWithOrphans) {
      console.log(`\n🔧 Processing: ${publisherData.email} (${publisherData.orphanedOfferings.length} orphaned offerings)`);
      
      const publisherResult = {
        publisherId: publisherData.publisherId,
        email: publisherData.email,
        orphanedOfferingsFound: publisherData.orphanedOfferings.length,
        offeringsDeleted: 0,
        deletedOfferings: [] as string[],
        success: true,
        errors: [] as string[]
      };
      
      try {
        for (const offering of publisherData.orphanedOfferings) {
          console.log(`  🗑️ ${dryRun ? 'Would delete' : 'Deleting'}: ${offering.offeringName || 'Unnamed offering'} (${offering.id})`);
          
          if (!dryRun) {
            // Delete the orphaned offering
            const deleteResult = await db.delete(publisherOfferings)
              .where(eq(publisherOfferings.id, offering.id));
            
            console.log(`    Deleted offering ${offering.id}`);
            publisherResult.offeringsDeleted++;
            totalDeleted++;
          } else {
            publisherResult.offeringsDeleted++;
            totalDeleted++;
          }
          
          publisherResult.deletedOfferings.push(offering.offeringName || offering.id);
        }
        
        console.log(`  ✅ ${dryRun ? 'Would delete' : 'Deleted'} ${publisherResult.offeringsDeleted} orphaned offerings for ${publisherData.email}`);
        
      } catch (error: any) {
        console.error(`❌ Failed to delete orphaned offerings for ${publisherData.email}:`, error);
        publisherResult.success = false;
        publisherResult.errors.push(`Deletion failed: ${error.message}`);
      }
      
      deletionResults.push(publisherResult);
    }
    
    const summary = {
      totalPublishersAnalyzed: allPublishers.length,
      publishersWithOrphans: publishersWithOrphans.length,
      totalOrphanedOfferingsFound: totalOrphanedOfferings,
      totalOfferingsDeleted: totalDeleted,
      successfulDeletions: deletionResults.filter(r => r.success).length,
      failedDeletions: deletionResults.filter(r => !r.success).length
    };
    
    console.log(`\n📈 DELETION SUMMARY:`);
    console.log(`   Publishers analyzed: ${summary.totalPublishersAnalyzed}`);
    console.log(`   Publishers with orphans: ${summary.publishersWithOrphans}`);
    console.log(`   Orphaned offerings found: ${summary.totalOrphanedOfferingsFound}`);
    console.log(`   Offerings ${dryRun ? 'would be deleted' : 'deleted'}: ${summary.totalOfferingsDeleted}`);
    console.log(`   Successful operations: ${summary.successfulDeletions}`);
    console.log(`   Failed operations: ${summary.failedDeletions}`);
    
    return NextResponse.json({
      success: true,
      dryRun,
      summary,
      deletionResults,
      affectedPublishers: publishersWithOrphans.map(p => ({
        publisherId: p.publisherId,
        email: p.email,
        orphanedCount: p.orphanedOfferings.length,
        orphanedOfferings: p.orphanedOfferings.map((o: any) => ({
          id: o.id,
          name: o.offeringName,
          price: o.basePrice
        }))
      }))
    });
    
  } catch (error) {
    console.error('Failed to delete orphaned offerings:', error);
    return NextResponse.json(
      { error: 'Failed to delete orphaned offerings', details: error },
      { status: 500 }
    );
  }
}