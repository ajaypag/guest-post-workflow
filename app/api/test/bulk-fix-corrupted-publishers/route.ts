import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require internal user authentication for this dangerous operation
    const session = await requireInternalUser(request);
    if (session instanceof NextResponse) {
      return session;
    }
    
    console.log(`🔐 Bulk fix initiated by internal user: ${session.email}`);
    const body = await request.json();
    const { dryRun = true, limit = 5 } = body;
    
    console.log(`🚀 ${dryRun ? 'DRY RUN' : 'EXECUTING'} - Bulk fixing corrupted publishers (limit: ${limit})`);
    
    // 1. Get all corrupted publishers
    const allPublishers = await db.select().from(publishers);
    console.log(`📊 Found ${allPublishers.length} total publishers`);
    
    const corruptedPublishers: any[] = [];
    
    // Analyze each publisher to find corrupted ones
    for (const publisher of allPublishers) {
      const offeringsQuery = await db
        .select({
          offeringId: publisherOfferings.id,
          offeringName: publisherOfferings.offeringName,
          relationshipId: publisherOfferingRelationships.id,
        })
        .from(publisherOfferings)
        .leftJoin(
          publisherOfferingRelationships, 
          eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
        )
        .where(eq(publisherOfferings.publisherId, publisher.id));
      
      // Find corrupted offerings (multiple relationships)
      const relationshipsByOffering: Record<string, number> = {};
      offeringsQuery.forEach(row => {
        if (row.relationshipId) {
          relationshipsByOffering[row.offeringId] = (relationshipsByOffering[row.offeringId] || 0) + 1;
        }
      });
      
      const corruptedOfferings = Object.entries(relationshipsByOffering)
        .filter(([_, count]) => count > 1)
        .length;
      
      if (corruptedOfferings > 0) {
        corruptedPublishers.push({
          publisherId: publisher.id,
          email: publisher.email,
          contactName: publisher.contactName,
          corruptedOfferings
        });
      }
    }
    
    console.log(`🚨 Found ${corruptedPublishers.length} corrupted publishers to fix`);
    
    if (corruptedPublishers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No corrupted publishers found',
        fixedPublishers: []
      });
    }
    
    // Limit processing to prevent overwhelming the system
    const publishersToProcess = corruptedPublishers.slice(0, limit);
    console.log(`🎯 Processing ${publishersToProcess.length} publishers in this batch`);
    
    const fixResults: any[] = [];
    let totalRelationshipsFixed = 0;
    let totalOrphanedFixed = 0;
    
    // 2. Fix each corrupted publisher
    for (const corruptedPublisher of publishersToProcess) {
      console.log(`\n🔧 Processing: ${corruptedPublisher.email} (${corruptedPublisher.publisherId})`);
      
      const publisherId = corruptedPublisher.publisherId;
      const publisherResult = {
        publisherId,
        email: corruptedPublisher.email,
        relationshipsFixed: 0,
        orphanedFixed: 0,
        actions: [] as string[],
        success: true,
        errors: [] as string[]
      };
      
      try {
        // Get all corrupted offerings for this publisher
        const corruptedQuery = await db.execute(sql`
          SELECT 
            po.id as offering_id,
            po.offering_name,
            por.id as relationship_id,
            por.website_id,
            w.domain,
            COUNT(*) OVER (PARTITION BY po.id) as relationship_count
          FROM publisher_offerings po
          LEFT JOIN publisher_offering_relationships por ON por.offering_id = po.id
          LEFT JOIN websites w ON w.id = por.website_id
          WHERE po.publisher_id = ${publisherId}
          ORDER BY po.id, por.created_at ASC
        `);
        
        // Group by offering_id and fix corruption
        const offeringGroups: Record<string, any[]> = {};
        for (const row of corruptedQuery.rows) {
          const offeringId = row.offering_id as string;
          if (!offeringGroups[offeringId]) {
            offeringGroups[offeringId] = [];
          }
          offeringGroups[offeringId].push(row);
        }
        
        // Fix each offering
        for (const [offeringId, relationships] of Object.entries(offeringGroups)) {
          const offeringName = relationships[0].offering_name;
          const relationshipCount = parseInt(relationships[0].relationship_count);
          
          console.log(`  📝 Offering: ${offeringName} (${relationshipCount} relationships)`);
          
          if (relationshipCount > 1) {
            // CORRUPTION: Multiple relationships, keep only the first
            const keepRelationship = relationships[0];
            const deleteRelationships = relationships.slice(1).filter(r => r.relationship_id);
            
            console.log(`    🚨 CORRUPTED: ${relationshipCount} relationships, keeping first, deleting ${deleteRelationships.length}`);
            
            if (!dryRun) {
              // Delete extra relationships
              for (const rel of deleteRelationships) {
                await db.delete(publisherOfferingRelationships)
                  .where(eq(publisherOfferingRelationships.id, rel.relationship_id));
              }
            }
            
            publisherResult.relationshipsFixed += deleteRelationships.length;
            publisherResult.actions.push(`Fixed corrupted offering: ${offeringName} (deleted ${deleteRelationships.length} duplicate relationships)`);
            
          } else if (relationshipCount === 0) {
            // ORPHANED: No relationships, create one
            console.log(`    🏚️ ORPHANED: No relationships, attempting to create`);
            
            // Extract domain from offering name
            const nameMatch = offeringName?.match(/Guest Post - (.+)$/);
            if (!nameMatch) {
              console.log(`    ⚠️ Cannot extract domain from: ${offeringName}`);
              publisherResult.actions.push(`Cannot fix orphaned offering: ${offeringName} - cannot extract domain`);
              continue;
            }
            
            const extractedDomain = nameMatch[1];
            console.log(`    🔍 Looking for website: ${extractedDomain}`);
            
            // Find matching website
            const websiteRecord = await db.select().from(websites).where(eq(websites.domain, extractedDomain)).limit(1);
            if (websiteRecord.length === 0) {
              console.log(`    ❌ No website found for domain: ${extractedDomain}`);
              publisherResult.actions.push(`Cannot fix orphaned offering: ${offeringName} - website not found: ${extractedDomain}`);
              continue;
            }
            
            const websiteId = websiteRecord[0].id;
            console.log(`    ✅ Found website: ${extractedDomain} (${websiteId})`);
            
            if (!dryRun) {
              // Create the relationship
              const relationshipId = crypto.randomUUID();
              await db.insert(publisherOfferingRelationships).values({
                id: relationshipId,
                publisherId: publisherId,
                offeringId: offeringId,
                websiteId: websiteId,
                isPrimary: true,
                isActive: true,
                relationshipType: 'owner',
                verificationStatus: 'verified',
                verificationMethod: 'bulk_corruption_fix',
                internalNotes: `Created during bulk corruption fix for orphaned offering: ${offeringName}`,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
            
            publisherResult.orphanedFixed++;
            publisherResult.actions.push(`Fixed orphaned offering: ${offeringName} → ${extractedDomain}`);
            
          } else {
            // CLEAN: Exactly 1 relationship, good
            console.log(`    ✅ CLEAN: 1 relationship`);
          }
        }
        
        totalRelationshipsFixed += publisherResult.relationshipsFixed;
        totalOrphanedFixed += publisherResult.orphanedFixed;
        
        console.log(`  ✅ Publisher fix complete: ${publisherResult.relationshipsFixed} corrupted fixed, ${publisherResult.orphanedFixed} orphaned fixed`);
        
      } catch (error: any) {
        console.error(`❌ Failed to fix publisher ${corruptedPublisher.email}:`, error);
        publisherResult.success = false;
        publisherResult.errors.push(`Fix failed: ${error.message}`);
      }
      
      fixResults.push(publisherResult);
    }
    
    const summary = {
      totalPublishersAnalyzed: allPublishers.length,
      totalCorruptedFound: corruptedPublishers.length,
      publishersProcessedThisBatch: publishersToProcess.length,
      totalRelationshipsFixed,
      totalOrphanedFixed,
      successfulFixes: fixResults.filter(r => r.success).length,
      failedFixes: fixResults.filter(r => !r.success).length
    };
    
    console.log(`\n📈 BULK FIX SUMMARY:`);
    console.log(`   Publishers analyzed: ${summary.totalPublishersAnalyzed}`);
    console.log(`   Corrupted found: ${summary.totalCorruptedFound}`);
    console.log(`   Processed this batch: ${summary.publishersProcessedThisBatch}`);
    console.log(`   Relationships fixed: ${summary.totalRelationshipsFixed}`);
    console.log(`   Orphaned offerings fixed: ${summary.totalOrphanedFixed}`);
    console.log(`   Successful fixes: ${summary.successfulFixes}`);
    console.log(`   Failed fixes: ${summary.failedFixes}`);
    
    return NextResponse.json({
      success: true,
      dryRun,
      summary,
      fixResults,
      remainingCorrupted: Math.max(0, corruptedPublishers.length - publishersToProcess.length),
      nextBatchAvailable: corruptedPublishers.length > publishersToProcess.length
    });
    
  } catch (error) {
    console.error('Bulk fix failed:', error);
    return NextResponse.json(
      { error: 'Bulk fix failed', details: error },
      { status: 500 }
    );
  }
}