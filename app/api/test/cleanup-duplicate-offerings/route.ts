import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, isNull, or, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = true } = body;
    
    console.log(`🧹 ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Cleaning up duplicate offerings`);
    
    // Get all publishers
    const allPublishers = await db.select().from(publishers);
    console.log(`📊 Analyzing ${allPublishers.length} publishers`);
    
    let totalDeleted = 0;
    let totalRelationshipsDeleted = 0;
    let affectedPublishers = [];
    
    for (const publisher of allPublishers) {
      // Get all offerings for this publisher
      const offerings = await db
        .select()
        .from(publisherOfferings)
        .where(eq(publisherOfferings.publisherId, publisher.id));
      
      if (offerings.length === 0) continue;
      
      // Find unnamed offerings (these are test data that shouldn't exist)
      const unnamedOfferings = offerings.filter(o => 
        !o.offeringName || o.offeringName === 'null' || o.offeringName === ''
      );
      
      if (unnamedOfferings.length > 0) {
        console.log(`\n🔍 Found ${unnamedOfferings.length} unnamed offerings for ${publisher.email}`);
        
        for (const offering of unnamedOfferings) {
          // Count relationships for this offering
          const relationships = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(publisherOfferingRelationships)
            .where(eq(publisherOfferingRelationships.offeringId, offering.id));
          
          const relCount = relationships[0]?.count || 0;
          
          if (!dryRun) {
            // Delete relationships first
            await db
              .delete(publisherOfferingRelationships)
              .where(eq(publisherOfferingRelationships.offeringId, offering.id));
            
            // Delete the offering
            await db
              .delete(publisherOfferings)
              .where(eq(publisherOfferings.id, offering.id));
            
            console.log(`  ✅ Deleted unnamed offering ${offering.id} with ${relCount} relationships`);
          } else {
            console.log(`  🔄 Would delete unnamed offering ${offering.id} with ${relCount} relationships`);
          }
          
          totalDeleted++;
          totalRelationshipsDeleted += relCount;
        }
        
        affectedPublishers.push({
          id: publisher.id,
          email: publisher.email,
          unnamedDeleted: unnamedOfferings.length
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP SUMMARY:');
    console.log(`  Publishers affected: ${affectedPublishers.length}`);
    console.log(`  Unnamed offerings deleted: ${totalDeleted}`);
    console.log(`  Relationships deleted: ${totalRelationshipsDeleted}`);
    console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'EXECUTED'}`);
    console.log('='.repeat(60));
    
    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        publishersAffected: affectedPublishers.length,
        offeringsDeleted: totalDeleted,
        relationshipsDeleted: totalRelationshipsDeleted
      },
      affectedPublishers
    });
    
  } catch (error) {
    console.error('Failed to cleanup duplicate offerings:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate offerings' },
      { status: 500 }
    );
  }
}