import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisherId, dryRun = true } = body;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Fixing corrupted offerings for publisher: ${publisherId}`);
    
    // 1. Get all offerings and their relationships
    const offeringsQuery = await db
      .select({
        // Offering fields
        id: publisherOfferings.id,
        offeringName: publisherOfferings.offeringName,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        isActive: publisherOfferings.isActive,
        
        // Relationship fields
        relationshipId: publisherOfferingRelationships.id,
        relationshipWebsiteId: publisherOfferingRelationships.websiteId,
      })
      .from(publisherOfferings)
      .leftJoin(
        publisherOfferingRelationships, 
        eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
      )
      .where(eq(publisherOfferings.publisherId, publisherId));
    
    console.log(`📊 Found ${offeringsQuery.length} offering-relationship records`);
    
    // 2. Analyze the data
    const offeringIds = new Set();
    const relationshipsByOffering: Record<string, any[]> = {};
    const orphanedOfferings: any[] = [];
    
    for (const row of offeringsQuery) {
      offeringIds.add(row.id);
      
      if (row.relationshipId) {
        if (!relationshipsByOffering[row.id]) {
          relationshipsByOffering[row.id] = [];
        }
        relationshipsByOffering[row.id].push({
          relationshipId: row.relationshipId,
          websiteId: row.relationshipWebsiteId
        });
      } else {
        orphanedOfferings.push({
          id: row.id,
          name: row.offeringName,
          type: row.offeringType,
          price: row.basePrice
        });
      }
    }
    
    // 3. Find corrupted offerings (ones with multiple relationships)
    const corruptedOfferings: any[] = [];
    for (const [offeringId, relationships] of Object.entries(relationshipsByOffering)) {
      if (relationships.length > 1) {
        const offering = offeringsQuery.find(r => r.id === offeringId);
        corruptedOfferings.push({
          offeringId,
          name: offering?.offeringName,
          relationshipCount: relationships.length,
          relationships
        });
      }
    }
    
    console.log(`🔍 Analysis Results:`);
    console.log(`   Total unique offerings: ${offeringIds.size}`);
    console.log(`   Corrupted offerings (multiple relationships): ${corruptedOfferings.length}`);
    console.log(`   Orphaned offerings (no relationships): ${orphanedOfferings.length}`);
    
    const fixActions: string[] = [];
    
    // 4. Fix corrupted offerings
    for (const corrupted of corruptedOfferings) {
      console.log(`🚨 CORRUPTED: ${corrupted.name} has ${corrupted.relationshipCount} relationships`);
      
      if (!dryRun) {
        // Keep only the first relationship, delete the rest
        const relationshipsToDelete = corrupted.relationships.slice(1);
        
        for (const rel of relationshipsToDelete) {
          await db.delete(publisherOfferingRelationships)
            .where(eq(publisherOfferingRelationships.id, rel.relationshipId));
          
          fixActions.push(`Deleted relationship ${rel.relationshipId} for offering ${corrupted.offeringId}`);
        }
        
        fixActions.push(`Fixed offering ${corrupted.name}: kept 1 relationship, deleted ${relationshipsToDelete.length}`);
      } else {
        fixActions.push(`[DRY RUN] Would fix ${corrupted.name}: keep 1 relationship, delete ${corrupted.relationshipCount - 1}`);
      }
    }
    
    // 5. Report orphaned offerings (don't auto-delete as they might be legitimate)
    for (const orphan of orphanedOfferings) {
      console.log(`👤 ORPHANED: ${orphan.name} (${orphan.id}) - No relationships`);
      fixActions.push(`Found orphaned offering: ${orphan.name} - manual review needed`);
    }
    
    const summary = {
      publisherId,
      totalOfferingRecords: offeringsQuery.length,
      uniqueOfferings: offeringIds.size,
      corruptedOfferings: corruptedOfferings.length,
      orphanedOfferings: orphanedOfferings.length,
      fixActions,
      dryRun
    };
    
    console.log(`✅ ${dryRun ? 'Analysis complete' : 'Fix complete'}`);
    
    return NextResponse.json({
      success: true,
      summary,
      corruptedOfferings,
      orphanedOfferings
    });
    
  } catch (error) {
    console.error('Failed to fix corrupted offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fix corrupted offerings' },
      { status: 500 }
    );
  }
}