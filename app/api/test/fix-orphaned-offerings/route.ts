import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

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
    
    console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Fixing orphaned offerings for publisher: ${publisherId}`);
    
    // 1. Get orphaned offerings (no relationships)
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
        eq(publisherOfferings.publisherId, publisherId),
        sql`${publisherOfferingRelationships.id} IS NULL`
      ));
    
    console.log(`📊 Found ${orphanedOfferings.length} orphaned offerings`);
    
    // 2. Get all websites to match domains
    const allWebsites = await db.select().from(websites);
    console.log(`📊 Found ${allWebsites.length} total websites in system`);
    
    const fixActions: string[] = [];
    let relationshipsCreated = 0;
    
    // 3. Create relationships based on offering names
    for (const offering of orphanedOfferings) {
      // Extract domain from offering name: "Guest Post - domain.com"
      const nameMatch = offering.offeringName?.match(/Guest Post - (.+)$/);
      if (!nameMatch) {
        console.log(`⚠️ Could not extract domain from: ${offering.offeringName}`);
        fixActions.push(`Could not extract domain from: ${offering.offeringName}`);
        continue;
      }
      
      const extractedDomain = nameMatch[1];
      console.log(`🔍 Looking for website: ${extractedDomain}`);
      
      // Find matching website
      const matchingWebsite = allWebsites.find(w => w.domain === extractedDomain);
      if (!matchingWebsite) {
        console.log(`❌ No website found for domain: ${extractedDomain}`);
        fixActions.push(`No website found for domain: ${extractedDomain}`);
        continue;
      }
      
      console.log(`✅ Found matching website: ${matchingWebsite.domain} (${matchingWebsite.id})`);
      
      if (!dryRun) {
        // Create the relationship
        const relationshipId = crypto.randomUUID();
        await db.insert(publisherOfferingRelationships).values({
          id: relationshipId,
          publisherId: publisherId,
          offeringId: offering.id,
          websiteId: matchingWebsite.id,
          isPrimary: true,
          isActive: true,
          relationshipType: 'owner',
          verificationStatus: 'verified',
          verificationMethod: 'migration_fix',
          internalNotes: `Created during corruption fix for orphaned offering: ${offering.offeringName}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        relationshipsCreated++;
        fixActions.push(`Created relationship: ${offering.offeringName} → ${matchingWebsite.domain}`);
      } else {
        fixActions.push(`[DRY RUN] Would create relationship: ${offering.offeringName} → ${matchingWebsite.domain}`);
      }
    }
    
    const summary = {
      publisherId,
      orphanedOfferings: orphanedOfferings.length,
      relationshipsCreated,
      fixActions,
      dryRun
    };
    
    console.log(`✅ ${dryRun ? 'Analysis complete' : 'Fix complete'}`);
    console.log(`   Orphaned offerings: ${orphanedOfferings.length}`);
    console.log(`   Relationships created: ${relationshipsCreated}`);
    
    return NextResponse.json({
      success: true,
      summary,
      orphanedOfferings: orphanedOfferings.map(o => ({
        id: o.id,
        name: o.offeringName,
        extractedDomain: o.offeringName?.match(/Guest Post - (.+)$/)?.[1]
      }))
    });
    
  } catch (error) {
    console.error('Failed to fix orphaned offerings:', error);
    return NextResponse.json(
      { error: 'Failed to fix orphaned offerings' },
      { status: 500 }
    );
  }
}