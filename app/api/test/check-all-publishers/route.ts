import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, sql } from 'drizzle-orm';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Require internal user authentication for database inspection
    const session = await requireInternalUser(request);
    if (session instanceof NextResponse) {
      return session;
    }
    
    console.log(`🔍 Publisher check initiated by internal user: ${session.email}`);
    console.log(`🔍 Checking all publishers for corruption...`);
    
    // Get all publishers
    const allPublishers = await db.select().from(publishers);
    console.log(`📊 Found ${allPublishers.length} total publishers`);
    
    const publisherAnalysis: any[] = [];
    
    for (const publisher of allPublishers) {
      // Get offerings and relationships for this publisher
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
      
      // Analyze the data
      const uniqueOfferings = new Set(offeringsQuery.map(r => r.offeringId)).size;
      const totalRelationships = offeringsQuery.filter(r => r.relationshipId).length;
      const orphanedOfferings = offeringsQuery.filter(r => !r.relationshipId).length;
      
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
      
      const analysis = {
        publisherId: publisher.id,
        email: publisher.email,
        contactName: publisher.contactName,
        uniqueOfferings,
        totalRelationships,
        orphanedOfferings,
        corruptedOfferings,
        status: corruptedOfferings > 0 ? 'CORRUPTED' : 
                orphanedOfferings > 0 ? 'HAS_ORPHANS' : 
                uniqueOfferings > 0 ? 'CLEAN' : 'NO_DATA'
      };
      
      publisherAnalysis.push(analysis);
      
      if (analysis.status !== 'NO_DATA' && analysis.status !== 'CLEAN') {
        console.log(`🚨 ${analysis.status}: ${publisher.email} - ${uniqueOfferings} offerings, ${corruptedOfferings} corrupted, ${orphanedOfferings} orphaned`);
      }
    }
    
    const summary = {
      totalPublishers: allPublishers.length,
      cleanPublishers: publisherAnalysis.filter(p => p.status === 'CLEAN').length,
      corruptedPublishers: publisherAnalysis.filter(p => p.status === 'CORRUPTED').length,
      publishersWithOrphans: publisherAnalysis.filter(p => p.status === 'HAS_ORPHANS').length,
      noDataPublishers: publisherAnalysis.filter(p => p.status === 'NO_DATA').length
    };
    
    console.log(`📈 Summary: ${summary.totalPublishers} total, ${summary.corruptedPublishers} corrupted, ${summary.publishersWithOrphans} with orphans, ${summary.cleanPublishers} clean`);
    
    return NextResponse.json({
      success: true,
      summary,
      publishers: publisherAnalysis.filter(p => p.status !== 'NO_DATA') // Only show publishers with data
    });
    
  } catch (error) {
    console.error('Failed to check all publishers:', error);
    return NextResponse.json(
      { error: 'Failed to check all publishers' },
      { status: 500 }
    );
  }
}